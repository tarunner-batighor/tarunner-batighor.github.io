/* =========================
       তারুণ্যের বাতিঘর — মূল স্ক্রিপ্ট
       (মেনু, ক্যাটাগরি, পোস্ট ভিউ, শেয়ার,
        সার্চ, অ্যাবাউট)
    ========================= */

    const portalContainer = document.getElementById('portalContainer');
    const pinwheel = document.getElementById('pinwheel');
    const hintText = document.getElementById('hintText');
    const subTitle = document.getElementById('subTitle');
    const contentContainer = document.getElementById('contentContainer');
    const dynamicContent = document.getElementById('dynamicContent');
    const backBtn = document.getElementById('backBtn');

    let isMenuOpen = false;
    let currentView = "home";
    let currentCategory = null;

    const CAT_NAMES = {
        ayat: "আয়াত ও হাদিস",
        atheism: "নাস্তিকতার জবাব",
        protest: "প্রতিবাদ",
        biography: "জীবনী",
        story: "গল্প-উপন্যাস"
    };

    /* HTML SECURITY - XSS আটকানো */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text ?? '');
        return div.innerHTML;
    }

    function postDate(post) {
        if (post.createdAt && post.createdAt.seconds) {
            return new Date(post.createdAt.seconds * 1000).toLocaleDateString("bn-BD");
        }
        return "";
    }

    /* =========================
       ভিউ পরিবর্তন
    ========================= */

    function showContentArea() {
        portalContainer.style.display = 'none';
        hintText.style.display = 'none';
        subTitle.style.display = 'none';
        contentContainer.style.display = 'block';
        window.scrollTo(0, 0);
    }

    function showHome() {
        currentView = "home";
        currentCategory = null;
        contentContainer.style.display = 'none';
        portalContainer.style.display = 'flex';
        hintText.style.display = 'block';
        subTitle.style.display = 'block';
        portalContainer.classList.remove('open');
        wheelStart();
        isMenuOpen = false;
        if (location.hash) {
            history.replaceState(null, '', location.pathname);
        }
        window.scrollTo(0, 0);
    }

    /* =========================
       পিনহুইল মেনু
    ========================= */

    /* =========================
       ফিরকির ঘূর্ণন
       (JS দিয়ে নিয়ন্ত্রিত — খোলা
        হলে সোজা হয়ে থামবে,
        বন্ধ হলে আবার ঘুরবে)
    ========================= */

    let wheelAngle = 0;
    let wheelTarget = null;
    let wheelSpinning = true;
    let lastFrame = null;

    const WHEEL_SPEED = 360 / 16; /* ১৬ সেকেন্ডে এক পাক */

    function wheelFrame(now) {
        if (lastFrame === null) lastFrame = now;
        const dt = Math.min((now - lastFrame) / 1000, 0.05);
        lastFrame = now;

        if (wheelTarget !== null) {
            const diff = wheelTarget - wheelAngle;
            if (Math.abs(diff) < 0.3) {
                wheelAngle = wheelTarget % 360;
                wheelTarget = null;
            } else {
                wheelAngle += diff * Math.min(1, dt * 6);
            }
        } else if (wheelSpinning) {
            wheelAngle = (wheelAngle + WHEEL_SPEED * dt) % 360;
        }

        pinwheel.style.transform = 'rotate(' + wheelAngle.toFixed(2) + 'deg)';
        requestAnimationFrame(wheelFrame);
    }

    requestAnimationFrame(wheelFrame);

    /* সবচেয়ে কাছের পূর্ণ পাকে স্থির — পাপড়িগুলো সোজা থাকবে */
    function wheelStop() {
        wheelTarget = Math.round(wheelAngle / 360) * 360;
        wheelSpinning = false;
    }

    function wheelStart() {
        wheelTarget = null;
        wheelSpinning = true;
    }

    /* ---- স্পর্শ করলে খোলা/বন্ধ ---- */
    portalContainer.addEventListener('click', function(e) {
        if (e.target.closest('.circle-menu-item')) return;

        isMenuOpen = !isMenuOpen;
        if (isMenuOpen) {
            portalContainer.classList.add('open');
            wheelStop();
        } else {
            portalContainer.classList.remove('open');
            wheelStart();
        }
    });

    /* =========================
       ক্যাটাগরির পোস্ট তালিকা
       (ছোট প্রিভিউ + পড়ুন বাটন)
    ========================= */

    async function showCategory(categoryId, categoryName) {
        currentCategory = { id: categoryId, name: categoryName };
        currentView = "category";

        showContentArea();

        dynamicContent.innerHTML = `
            <h2 class="category-header-title">${escapeHtml(categoryName)}</h2>
            <p style="text-align:center;padding:20px;">পোস্ট লোড হচ্ছে...</p>
        `;

        try {
            const module = await import("./website-posts.js");
            const posts = await module.getPublishedPosts(categoryId);

            if (currentView !== "category") return;

            let html = `
                <h2 class="category-header-title">${escapeHtml(categoryName)}</h2>
            `;

            if (posts.length === 0) {
                html += `
                    <div class="post-card">
                        <h2 class="post-title">লেখা শীঘ্রই প্রকাশিত হবে</h2>
                        <div class="post-content">এই বিভাগে এখনো কোনো Published পোস্ট নেই।</div>
                    </div>
                `;
            } else {
                posts.forEach(function(post) {
                    const content = post.content || "";
                    const preview = content.slice(0, 200);

                    html += `
                        <div class="post-card post-card-link" data-post-id="${post.id}">
                            <h2 class="post-title">${escapeHtml(post.title || "")}</h2>
                            <div class="post-content">${escapeHtml(preview)}${content.length > 200 ? "…" : ""}</div>
                            <div class="post-footer">
                                <div class="post-tags">${escapeHtml(CAT_NAMES[post.category] || post.category || "সাধারণ")}</div>
                                <div class="post-date">${postDate(post)}</div>
                            </div>
                            <div style="text-align:center; margin-top:14px;">
                                <span style="display:inline-block; background:#e0522d; color:white; padding:9px 22px; border-radius:8px; font-weight:bold; font-size:14px;">📖 পুরো লেখা পড়ুন</span>
                            </div>
                        </div>
                    `;
                });
            }

            dynamicContent.innerHTML = html;

            dynamicContent.querySelectorAll(".post-card-link").forEach(function(card) {
                card.addEventListener("click", function() {
                    location.hash = "post/" + card.getAttribute("data-post-id");
                });
            });

        } catch (error) {
            console.error("Post loading error:", error);
            dynamicContent.innerHTML = `
                <div class="post-card">
                    <h2 class="post-title">❌ পোস্ট লোড করা যায়নি</h2>
                    <div class="post-content">${escapeHtml(error.message)}</div>
                </div>
            `;
        }
    }

    /* =========================
       পোস্ট বিস্তারিত ভিউ
       (#post/আইডি লিংক + শেয়ার)
    ========================= */

    async function showPostDetail(postId) {
        currentView = "post";

        showContentArea();

        dynamicContent.innerHTML = `
            <h2 class="category-header-title">লোড হচ্ছে...</h2>
            <p style="text-align:center;padding:20px;">একটু অপেক্ষা করুন...</p>
        `;

        try {
            const module = await import("./website-posts.js");
            const post = await module.getPostById(postId);

            if (currentView !== "post") return;

            if (!post || post.status !== "published") {
                dynamicContent.innerHTML = `
                    <h2 class="category-header-title">পোস্ট পাওয়া যায়নি</h2>
                    <div class="post-card">
                        <div class="post-content">এই পোস্টটি হয়তো মুছে ফেলা হয়েছে অথবা এখনো প্রকাশিত হয়নি।</div>
                    </div>
                `;
                return;
            }

            const shareUrl = location.origin + location.pathname + "#post/" + postId;
            const shareText = (post.title || "তারুণ্যের বাতিঘর") + " — তারুণ্যের বাতিঘর";

            dynamicContent.innerHTML = `
                <h2 class="category-header-title">${escapeHtml(post.title || "")}</h2>
                <div class="post-card">
                    <div class="post-content">${escapeHtml(post.content || "")}</div>
                    <div class="post-footer">
                        <div class="post-tags">${escapeHtml(CAT_NAMES[post.category] || post.category || "সাধারণ")}</div>
                        <div class="post-date">${postDate(post)}</div>
                    </div>
                </div>

                <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin-top:4px;">
                    <button class="shareFbBtn" style="background:#1877f2; color:white; border:none; padding:11px 18px; border-radius:9px; cursor:pointer; font-size:14px; font-weight:bold;">
                        📘 Facebook-এ শেয়ার
                    </button>
                    <button class="shareWaBtn" style="background:#25d366; color:#0f172a; border:none; padding:11px 18px; border-radius:9px; cursor:pointer; font-size:14px; font-weight:bold;">
                        💬 WhatsApp-এ পাঠান
                    </button>
                    <button class="copyLinkBtn" style="background:#334155; color:white; border:none; padding:11px 18px; border-radius:9px; cursor:pointer; font-size:14px; font-weight:bold;">
                        🔗 লিংক কপি
                    </button>
                </div>

                <p style="text-align:center; color:var(--text-faint); font-size:12.5px; margin-top:14px; word-break:break-all;">
                    ${escapeHtml(shareUrl)}
                </p>
            `;

            dynamicContent.querySelector(".shareFbBtn").addEventListener("click", function() {
                window.open(
                    "https://www.facebook.com/sharer/sharer.php?u=" +
                    encodeURIComponent(shareUrl),
                    "_blank"
                );
            });

            dynamicContent.querySelector(".shareWaBtn").addEventListener("click", function() {
                window.open(
                    "https://wa.me/?text=" +
                    encodeURIComponent(shareText + "\n" + shareUrl),
                    "_blank"
                );
            });

            dynamicContent.querySelector(".copyLinkBtn").addEventListener("click", function() {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(shareUrl).then(function() {
                        alert("✅ লিংক কপি হয়েছে!\n\n" + shareUrl);
                    }).catch(function() {
                        prompt("নিচের লিংকটি কপি করুন:", shareUrl);
                    });
                } else {
                    prompt("নিচের লিংকটি কপি করুন:", shareUrl);
                }
            });

        } catch (error) {
            console.error("Post detail error:", error);
            dynamicContent.innerHTML = `
                <div class="post-card">
                    <h2 class="post-title">❌ পোস্ট লোড করা যায়নি</h2>
                    <div class="post-content">${escapeHtml(error.message)}</div>
                </div>
            `;
        }
    }

    /* =========================
       ব্যাক বাটন
    ========================= */

    backBtn.addEventListener('click', function() {
        if (currentView === "post" && currentCategory) {
            history.replaceState(null, '', location.pathname);
            showCategory(currentCategory.id, currentCategory.name);
        } else {
            showHome();
        }
    });

    /* =========================
       মেনু আইটেম (ক্যাটাগরি)
    ========================= */

    const menuItems = document.querySelectorAll('.circle-menu-item');
    menuItems.forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            const category = this.getAttribute('data-cat');
            location.hash = "cat/" + category; /* shareable link */
        });
    });

    /* =========================
       হ্যাশ রাউটিং
       (#post/আইডি = পোস্ট, #cat/আইডি = ক্যাটাগরি)
    ========================= */

    function handleHash() {
        const postM = location.hash.match(/^#post\/([A-Za-z0-9_-]+)/);
        if (postM) {
            showPostDetail(postM[1]);
            return;
        }

        const catM = location.hash.match(/^#cat\/([a-z]+)$/);
        if (catM && CAT_NAMES[catM[1]]) {
            if (currentView === "category" && currentCategory && currentCategory.id === catM[1]) {
                return; /* এই ক্যাটাগরিতেই আছি */
            }
            showCategory(catM[1], CAT_NAMES[catM[1]]);
            return;
        }

        if (currentView !== "home") {
            showHome();
        }
    }

    window.addEventListener('hashchange', handleHash);
    handleHash();

    /* =========================
       ফ্লোটিং বাটন ডক
       (ট্যাপ করলে খোলে,
        আবার ট্যাপে গুটিয়ে যায়)
    ========================= */

    const floatingDock = document.createElement('div');
    floatingDock.className = "floating-dock";
    floatingDock.id = "floatingDock";
    document.body.appendChild(floatingDock);

    /* টগল বাটন — এটাই সবসময় দেখা যায় */
    const dockToggle = document.createElement('button');
    dockToggle.className = "dock-toggle";
    dockToggle.id = "dockToggle";
    dockToggle.title = "মেনু খুলুন / বন্ধ করুন";
    dockToggle.setAttribute("aria-label", "মেনু");
    dockToggle.innerHTML = `
        <svg class="i-open" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M4 7h16M4 12h16M4 17h16"/>
        </svg>
        <svg class="i-close" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <path d="M6 6l12 12M18 6L6 18"/>
        </svg>
    `;
    floatingDock.appendChild(dockToggle);

    /* মেনু — বাটনগুলো এখানে থাকবে */
    const dockMenu = document.createElement('div');
    dockMenu.className = "dock-menu";
    dockMenu.id = "dockMenu";
    floatingDock.appendChild(dockMenu);

    /* ট্যাপে খোলে / বন্ধ হয় */
    dockToggle.addEventListener('click', function() {
        floatingDock.classList.toggle('open');
        dockTip.style.display = "none";
    });

    /* মেনুর কোনো বাটনে ক্লিক করলে ডক নিজে নিজে গুটিয়ে যাবে */
    dockMenu.addEventListener('click', function() {
        setTimeout(function() {
            floatingDock.classList.remove('open');
            dockTip.style.display = "none";
        }, 180);
    });

    /* টুলটিপ (ডেস্কটপে হোভার করলে বাটনের বাম দিকে ভাসে) */
    const dockTip = document.createElement('div');
    dockTip.className = "dock-tip";
    document.body.appendChild(dockTip);

    const canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;

    floatingDock.addEventListener('mouseover', function(e) {
        if (!canHover) return;
        const btn = e.target.closest('.dock-btn');
        if (!btn) return;
        dockTip.textContent = btn.getAttribute('data-tip') || "";
        if (!dockTip.textContent) return;
        dockTip.style.display = "block";
        const r = btn.getBoundingClientRect();
        const tipW = dockTip.offsetWidth;
        dockTip.style.top = (r.top + r.height / 2) + "px";
        dockTip.style.left = (r.left - tipW - 10) + "px";
    });

    floatingDock.addEventListener('mouseout', function(e) {
        const btn = e.target.closest('.dock-btn');
        if (btn) dockTip.style.display = "none";
    });

    /* ＋ নতুন পোস্ট বাটন */
    const addPostBtn = document.createElement('button');
    addPostBtn.id = "addPostBtn";
    addPostBtn.className = "dock-btn";
    addPostBtn.setAttribute("data-accent", "add");
    addPostBtn.setAttribute("data-tip", "নতুন পোস্ট লিখুন");
    addPostBtn.title = "নতুন পোস্ট লিখুন";
    addPostBtn.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
            <path d="M12 5v14M5 12h14"/>
        </svg>
    `;
    dockMenu.appendChild(addPostBtn);

    /* =========================
       সার্চ 🔍
    ========================= */

    const searchButton = document.createElement('button');
    searchButton.className = "dock-btn";
    searchButton.setAttribute("data-accent", "search");
    searchButton.setAttribute("data-tip", "পোস্ট খুঁজুন");
    searchButton.title = "পোস্ট খুঁজুন";
    searchButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <circle cx="11" cy="11" r="7"/>
            <path d="M21 21l-4.35-4.35"/>
        </svg>
    `;
    dockMenu.appendChild(searchButton);

    let searchOverlay = null;

    searchButton.addEventListener('click', function() {
        if (searchOverlay) {
            searchOverlay.remove();
            searchOverlay = null;
            return;
        }

        searchOverlay = document.createElement('div');
        searchOverlay.style.cssText = `
            position:fixed;
            inset:0;
            z-index:99998;
            background:rgba(0,0,0,.75);
            display:flex;
            align-items:flex-start;
            justify-content:center;
            padding:60px 20px 20px;
        `;

        searchOverlay.innerHTML = `
            <div style="
                width:100%;
                max-width:600px;
                background:var(--panel-bg);
                border-radius:18px;
                padding:20px;
                box-shadow:0 10px 40px rgba(0,0,0,.5);
            ">
                <div style="display:flex; gap:10px; align-items:center;">
                    <input
                        id="searchInput"
                        type="text"
                        placeholder="কী খুঁজছেন? শিরোনাম বা শব্দ লিখুন..."
                        style="
                            flex:1;
                            padding:13px;
                            border:none;
                            border-radius:10px;
                            font-size:16px;
                            background:white;
                            color:#0f172a;
                            outline:none;
                            font-family:inherit;
                        "
                    >
                    <button
                        id="searchClose"
                        style="
                            background:#ef4444;
                            color:white;
                            border:none;
                            padding:12px 14px;
                            border-radius:10px;
                            cursor:pointer;
                            font-size:15px;
                        "
                    >
                        ✕
                    </button>
                </div>
                <div id="searchResults" style="margin-top:15px; max-height:55vh; overflow-y:auto;"></div>
            </div>
        `;

        document.body.appendChild(searchOverlay);

        const input = searchOverlay.querySelector('#searchInput');
        const results = searchOverlay.querySelector('#searchResults');

        searchOverlay.querySelector('#searchClose').addEventListener('click', function() {
            searchOverlay.remove();
            searchOverlay = null;
        });

        let allPosts = null;
        let debounceTimer = null;

        input.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            const q = this.value.trim();

            if (!q) {
                results.innerHTML = "";
                return;
            }

                debounceTimer = setTimeout(async function() {
                    results.innerHTML = '<p style="color:var(--text-faint);">খোঁজা হচ্ছে...</p>';

                try {
                    if (!allPosts) {
                        const module = await import("./website-posts.js");
                        allPosts = await module.getAllPublishedPosts();
                    }

                    const ql = q.toLowerCase();
                    const matches = allPosts.filter(function(p) {
                        return (p.title || "").toLowerCase().includes(ql) ||
                               (p.content || "").toLowerCase().includes(ql);
                    });

                    if (matches.length === 0) {
                        results.innerHTML = '<p style="color:var(--text-faint); text-align:center; padding:15px;">😕 কিছু পাওয়া যায়নি — অন্য শব্দে চেষ্টা করুন</p>';
                        return;
                    }

                    let html = "";
                    matches.forEach(function(post) {
                        html += `
                            <div class="searchResultRow" data-post-id="${post.id}" style="
                                background:var(--row-bg);
                                border:1px solid var(--row-border);
                                border-radius:10px;
                                padding:12px 14px;
                                margin-bottom:8px;
                                cursor:pointer;
                            ">
                                <div style="color:var(--row-title); font-weight:bold;">${escapeHtml(post.title || "")}</div>
                                <div style="color:var(--text-faint); font-size:12.5px; margin-top:3px;">
                                    ${escapeHtml(CAT_NAMES[post.category] || post.category || "")} • 📅 ${postDate(post)}
                                </div>
                            </div>
                        `;
                    });

                    html += `<p style="color:#64748b; font-size:12px; text-align:center; margin-top:8px;">${matches.length} টি ফলাফল</p>`;
                    results.innerHTML = html;

                    results.querySelectorAll('.searchResultRow').forEach(function(row) {
                        row.addEventListener('click', function() {
                            const postId = row.getAttribute('data-post-id');
                            searchOverlay.remove();
                            searchOverlay = null;
                            location.hash = "post/" + postId;
                        });
                    });

                } catch (error) {
                    results.innerHTML = '<p style="color:#f87171;">❌ সমস্যা হয়েছে: ' + escapeHtml(error.message) + '</p>';
                }
            }, 300);
        });

        input.focus();
    });

    /* =========================
       অ্যাবাউট ℹ️
       (বামদিকের উপরের কোণায় — স্ট্যান্ডার্ড পজিশন)
    ========================= */

    const aboutButton = document.createElement('button');
    aboutButton.className = "about-fab";
    aboutButton.id = "aboutFab";
    aboutButton.title = "আমাদের সম্পর্কে";
    aboutButton.setAttribute("aria-label", "আমাদের সম্পর্কে");
    aboutButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 11v5"/>
            <path d="M12 7.5v.01"/>
        </svg>
    `;
    document.body.appendChild(aboutButton);

    aboutButton.addEventListener('click', function() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position:fixed;
            inset:0;
            z-index:99998;
            background:rgba(0,0,0,.75);
            display:flex;
            align-items:center;
            justify-content:center;
            padding:20px;
        `;

        overlay.innerHTML = `
            <div style="
                width:100%;
                max-width:520px;
                max-height:85vh;
                overflow-y:auto;
                background:var(--panel-bg);
                border-radius:18px;
                padding:28px;
                box-shadow:0 10px 40px rgba(0,0,0,.5);
                text-align:center;
            ">
                <div style="font-size:48px;">🗼</div>
                <h2 style="color:#38bdf8; margin:10px 0 6px;">তারুণ্যের বাতিঘর</h2>
                <p style="color:var(--text-soft); font-style:italic; margin-bottom:18px;">“তারুণ্যের কলমে, সত্যের কথা”</p>

                <p style="color:var(--text-soft); line-height:1.8; text-align:left; font-size:15px;">
                    তারুণ্যের বাতিঘর একটি তরুণ-কেন্দ্রিক বাংলা লেখার প্ল্যাটফর্ম। সত্য ও ন্যায়ের পথে আলো জ্বালিয়ে রাখাই আমাদের ব্রত। নিয়মিত প্রকাশিত হয় —
                </p>

                <ul style="color:var(--text-soft); text-align:left; line-height:2; padding-left:22px; margin:10px 0 18px;">
                    <li>📖 আয়াত ও হাদিস</li>
                    <li>❓ নাস্তিকতার জবাব</li>
                    <li>✊ প্রতিবাদ</li>
                    <li>🌟 জীবনী</li>
                    <li>📚 গল্প-উপন্যাস</li>
                </ul>

                <p style="color:var(--text-soft); line-height:1.8; text-align:left; font-size:15px;">
                    আপনিও লিখতে পারেন! উপরের ডান কোণের <strong style="color:#10b981;">＋</strong> বাটনে ক্লিক করে আপনার লেখা জমা দিন। Admin অনুমোদনের পর সেটি সাইটে প্রকাশিত হবে।
                </p>

                <p style="color:var(--text-faint); font-size:14px; margin-top:18px;">
                    📧 যোগাযোগ: <span style="color:#38bdf8;">abdulhadibinmasud775@gmail.com</span>
                </p>

                <button
                    id="aboutClose"
                    style="
                        margin-top:20px;
                        background:#ef4444;
                        color:white;
                        border:none;
                        padding:12px 40px;
                        border-radius:9px;
                        cursor:pointer;
                        font-size:15px;
                        font-weight:bold;
                    "
                >
                    বন্ধ করুন
                </button>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#aboutClose').addEventListener('click', function() {
            overlay.remove();
        });
    });

    /* =========================
       PWA: অ্যাপ ইনস্টল বাটন 📲
       (Chrome/Edge support করে —
        beforeinstallprompt এলে বাটন দেখা যায়)
    ========================= */

    let deferredInstallPrompt = null;

    const installBtn = document.createElement('button');
    installBtn.className = "dock-btn";
    installBtn.id = "installBtn";
    installBtn.setAttribute("data-accent", "install");
    installBtn.setAttribute("data-tip", "অ্যাপ ইনস্টল করুন");
    installBtn.title = "অ্যাপ ইনস্টল করুন";
    installBtn.style.display = "none";
    installBtn.innerHTML = `
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v12"/>
            <path d="M7 10l5 5 5-5"/>
            <path d="M4 19h16"/>
        </svg>
    `;
    installBtn.addEventListener('click', function() {
        if (!deferredInstallPrompt) return;
        installBtn.style.display = "none";
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then(function() {
            deferredInstallPrompt = null;
        });
    });

    window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        deferredInstallPrompt = e;
        installBtn.style.display = "flex";
    });

    window.addEventListener('appinstalled', function() {
        installBtn.style.display = "none";
        deferredInstallPrompt = null;
    });

    dockMenu.appendChild(installBtn);

    /* =========================
       থিম টগল 🌙 / ☀️
       (পছন্দ localStorage-এ সেভ হয়)
    ========================= */

    const THEME_KEY = "batighor-theme";

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute("content", theme === "light" ? "#f1f5f9" : "#0f172a");
        }
    }

    const themeToggleBtn = document.createElement('button');
    themeToggleBtn.className = "dock-btn";
    themeToggleBtn.id = "themeToggleBtn";
    themeToggleBtn.setAttribute("data-accent", "theme");
    themeToggleBtn.setAttribute("data-tip", "রাত / দিন");
    themeToggleBtn.title = "রাত / দিন মোড বদলান";
    themeToggleBtn.innerHTML = `
        <svg class="i-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round">
            <circle cx="12" cy="12" r="4.4"/>
            <path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.1 5.1l1.7 1.7M17.2 17.2l1.7 1.7M18.9 5.1l-1.7 1.7M6.8 17.2l-1.7 1.7"/>
        </svg>
        <svg class="i-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
        </svg>
    `;
    themeToggleBtn.addEventListener('click', function() {
        const isLight = document.documentElement.getAttribute("data-theme") === "light";
        const next = isLight ? "dark" : "light";
        try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
        applyTheme(next);
    });

    /* প্রথম লোডে সেভ করা পছন্দ applied (head-এর script আগেই সেট করেছে) */
    applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");

    dockMenu.appendChild(themeToggleBtn);
