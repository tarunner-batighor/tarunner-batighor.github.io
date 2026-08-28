// @ts-nocheck

  import { initializeApp }
    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

  import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp,
    getDocs,
    getDoc,
    query,
    where,
    updateDoc,
    deleteDoc,
    doc,
    FieldValue
  } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

  import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
  } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


  /* =========================
     FIREBASE CONFIG
  ========================= */

  const firebaseConfig = {
  apiKey: "AIzaSyD97ZB_1H6JcZ6MzTHj39uJic3gFqJnH6o",
  authDomain: "tarunner-batighor.firebaseapp.com",
  projectId: "tarunner-batighor",
  storageBucket: "tarunner-batighor.firebasestorage.app",
  messagingSenderId: "494925974714",
  appId: "1:494925974714:web:7f2ec193de3c8ee03b0683",
  measurementId: "G-Y9L1BG62BL"
};

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);


  /* =========================
     ADMIN EMAIL
  ========================= */

  const ADMIN_EMAIL =
    "abdulhadibinmasud775@gmail.com";


  /* =========================
     ROLE STATE
     "admin" | "moderator" | "none"
     (users/{uid}.role field — শুধু Admin
      Moderators tab-এর মাধ্যমে set করতে পারবে)
  ========================= */

  let currentRole = "none";


  /* =========================
     POST SUBMISSION
  ========================= */

  const addPostBtn =
    document.getElementById("addPostBtn");


  addPostBtn.addEventListener("click", async () => {

    /* =========================
       USER IDENTITY — Google Login
       (login ছাড়া পোস্ট জমা যাবে না,
        যাতে প্রতিটি পোস্টের লেখক শনাক্ত হয়)
    ========================= */

    let authMod = null;

    try {
      authMod = await import("./auth.js");
    } catch (e) {
      console.error("auth module load failed:", e);
    }


    let user = authMod ? authMod.currentUser() : null;


    if (!user) {

      const ok =
        await confirmLoginRequired(authMod);

      if (!ok) {
        return;
      }

      user = authMod.currentUser();

      if (!user) {
        return;
      }
    }


    const result =
      await openPostEditor(null);

    if (!result) {
      return;
    }


    /* =========================
       SAVE TO FIREBASE
       (authorUid সহ — notification-এর জন্য)
    ========================= */

    try {

      await addDoc(
        collection(db, "Posts"),
        {
          title: result.title,
          content: result.content,
          category: result.category,
          status: "pending",
          authorUid: user.uid,
          authorName: user.displayName || "",
          authorEmail: user.email || "",
          createdAt: serverTimestamp()
        }
      );


      alert(
        "✅ পোস্ট জমা হয়েছে!\n\n" +
        "পোস্টটি এখন Pending অবস্থায় আছে।\n\n" +
        "Admin Publish করার পর এটি ওয়েবসাইটে দেখা যাবে।\n\n" +
        "✅/❌ status আপনার Notification-এ পৌঁছাবে।"
      );


    } catch (error) {

      console.error(error);

      alert(
        "❌ পোস্ট সেভ হয়নি:\n\n" +
        error.message
      );

    }

  });


  /* =========================
     LOGIN REQUIRED MODAL
     (পোস্ট জমা দিতে Google Login)
  ========================= */

  function confirmLoginRequired(authMod) {

    return new Promise((resolve) => {

      if (!authMod) {
        alert("❌ System load করা যায়নি। আবার চেষ্টা করুন।");
        resolve(false);
        return;
      }

      const overlay =
        document.createElement("div");

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
          max-width:420px;
          background:#1e293b;
          padding:25px;
          border-radius:18px;
          box-shadow:0 10px 40px rgba(0,0,0,.5);
          text-align:center;
        ">
          <div style="font-size:40px; margin-bottom:10px;">✍️</div>
          <h3 style="color:#38bdf8; margin:0 0 10px; font-size:18px;">
            পোস্ট জমা দিতে Login করুন
          </h3>
          <p style="color:#cbd5e1; font-size:14px; line-height:1.7; margin-bottom:18px;">
            আপনার লেখা আপনার Account-এর নামে যুক্ত হবে।
            Admin Accept/Reject করলে Notification পাবেন।
          </p>
          <button id="loginReqBtn" style="
            width:100%;
            padding:13px;
            border:none;
            border-radius:10px;
            background:white;
            color:#0f172a;
            font-size:15px;
            font-weight:bold;
            cursor:pointer;
            display:flex;
            align-items:center;
            justify-content:center;
            gap:10px;
          ">
            <span style="
              width:22px;height:22px;border-radius:50%;
              background:#4285F4;color:white;
              display:inline-flex;align-items:center;justify-content:center;
              font-size:14px;font-weight:bold;
            ">G</span>
            Google দিয়ে লগইন করুন
          </button>
          <button id="loginReqCancel" style="
            width:100%;
            margin-top:10px;
            padding:12px;
            border:none;
            border-radius:10px;
            background:#334155;
            color:#e2e8f0;
            font-size:14px;
            cursor:pointer;
          ">
            পরে করবো
          </button>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay
        .querySelector("#loginReqBtn")
        .addEventListener("click", async () => {
          try {
            await authMod.googleSignIn();
            overlay.remove();
            resolve(true);
          } catch (err) {
            console.error(err);
            overlay.querySelector("#loginReqBtn").lastChild.textContent =
              " Google দিয়ে লগইন করুন (আবার চেষ্টা)";
            alert(
              "❌ লগইন ব্যর্থ: " +
              (err.code || err.message || "unknown") +
              "\n" +
              (authMod.loginErrHint ? authMod.loginErrHint(err) : "\nআবার চেষ্টা করুন।")
            );
          }
        });

      overlay
        .querySelector("#loginReqCancel")
        .addEventListener("click", () => {
          overlay.remove();
          resolve(false);
        });

    });

  }


  /* =========================
     POST EDITOR MODAL
     (নতুন পোস্ট লেখা + সম্পাদনা)
  ========================= */

  function openPostEditor(existing) {

    return new Promise((resolve) => {

      const isEdit = !!existing;

      const overlay =
        document.createElement("div");


      overlay.style.cssText = `
        position:fixed;
        inset:0;
        z-index:99999;
        background:rgba(0,0,0,.75);
        display:flex;
        align-items:center;
        justify-content:center;
        padding:20px;
      `;


      overlay.innerHTML = `

        <div style="
          width:100%;
          max-width:600px;
          max-height:90vh;
          overflow-y:auto;
          background:#1e293b;
          padding:25px;
          border-radius:18px;
          box-shadow:0 10px 40px rgba(0,0,0,.5);
        ">

          <h3 style="
            color:#38bdf8;
            text-align:center;
            margin-bottom:20px;
            font-size:20px;
          ">
            ${isEdit ? "✏️ পোস্ট সম্পাদনা" : "✍️ নতুন পোস্ট লিখুন"}
          </h3>

          <input
            id="editorTitle"
            type="text"
            placeholder="পোস্টের শিরোনাম লিখুন..."
            style="
              width:100%;
              padding:14px;
              border-radius:10px;
              border:none;
              font-size:16px;
              background:white;
              color:#0f172a;
              outline:none;
              margin-bottom:12px;
              box-sizing:border-box;
              font-family:inherit;
            "
          >

          <select
            id="editorCategory"
            style="
              width:100%;
              padding:14px;
              border-radius:10px;
              border:none;
              font-size:16px;
              background:white;
              color:#0f172a;
              outline:none;
              margin-bottom:12px;
            "
          >

            <option value="">
              -- ক্যাটাগরি নির্বাচন করুন --
            </option>

            <option value="ayat">
              আয়াত ও হাদিস
            </option>

            <option value="atheism">
              নাস্তিকতার জবাব
            </option>

            <option value="protest">
              প্রতিবাদ
            </option>

            <option value="biography">
              জীবনী
            </option>

            <option value="story">
              গল্প-উপন্যাস
            </option>

          </select>

          <textarea
            id="editorContent"
            rows="10"
            placeholder="আপনার লেখা এখানে লিখুন... প্যারাগ্রাফ আলাদা করতে Enter চাপুন"
            style="
              width:100%;
              padding:14px;
              border-radius:10px;
              border:none;
              font-size:16px;
              background:white;
              color:#0f172a;
              outline:none;
              box-sizing:border-box;
              font-family:inherit;
              line-height:1.6;
              resize:vertical;
            "
          ></textarea>

          <p
            id="editorMessage"
            style="
              margin-top:10px;
              color:#f87171;
              font-size:14px;
            "
          ></p>

          <div style="
            display:flex;
            gap:10px;
            margin-top:15px;
          ">

            <button
              id="editorCancelBtn"
              style="
                flex:1;
                padding:13px;
                border:none;
                border-radius:9px;
                background:#64748b;
                color:white;
                cursor:pointer;
                font-size:15px;
              "
            >
              বাতিল
            </button>

            <button
              id="editorSubmitBtn"
              style="
                flex:2;
                padding:13px;
                border:none;
                border-radius:9px;
                background:#10b981;
                color:white;
                cursor:pointer;
                font-size:15px;
                font-weight:bold;
              "
            >
              ${isEdit ? "💾 সেভ করুন" : "📨 পোস্ট জমা দিন"}
            </button>

          </div>

        </div>
      `;


      document.body.appendChild(overlay);


      /* এডিট মোডে পুরনো মান বসানো */

      if (isEdit) {

        overlay.querySelector("#editorTitle").value =
          existing.title || "";

        overlay.querySelector("#editorCategory").value =
          existing.category || "";

        overlay.querySelector("#editorContent").value =
          existing.content || "";

      }


      const message =
        overlay.querySelector("#editorMessage");


      /* সাবমিট */

      overlay
        .querySelector("#editorSubmitBtn")
        .addEventListener("click", () => {

          const title =
            overlay.querySelector("#editorTitle").value.trim();

          const content =
            overlay.querySelector("#editorContent").value.trim();

          const category =
            overlay.querySelector("#editorCategory").value;


          if (!title) {
            message.innerText = "⚠️ শিরোনাম লিখুন।";
            return;
          }

          if (!category) {
            message.innerText = "⚠️ একটি ক্যাটাগরি নির্বাচন করুন।";
            return;
          }

          if (!content) {
            message.innerText = "⚠️ পোস্টের লেখা লিখুন।";
            return;
          }


          overlay.remove();

          resolve({
            title,
            content,
            category
          });

        });


      /* বাতিল */

      overlay
        .querySelector("#editorCancelBtn")
        .addEventListener("click", () => {

          overlay.remove();

          resolve(null);

        });


    });

  }


  /* =========================
     ADMIN BUTTON
  ========================= */

  const adminButton =
    document.createElement("button");

  adminButton.className = "dock-btn";
  adminButton.setAttribute("data-accent", "admin");
  adminButton.setAttribute("data-tip", "অ্যাডমিন / মোডারেটর প্যানেল");
  adminButton.title = "অ্যাডমিন / মোডারেটর প্যানেল";
  adminButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
      <rect x="4" y="11" width="16" height="9" rx="2"/>
      <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
    </svg>
  `;

  document
    .getElementById("dockMenu")
    .appendChild(adminButton);


  /* =========================
     ADMIN PANEL
  ========================= */

  const adminPanel =
    document.createElement("div");


  adminPanel.style.cssText = `
    display:none;
    position:fixed;
    inset:0;
    z-index:5000;
    background:#0f172a;
    color:white;
    overflow-y:auto;
    padding:25px;
  `;


  adminPanel.innerHTML = `

    <div style="
      max-width:700px;
      margin:auto;
    ">


      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:25px;
      ">

        <h2 id="panelTitle" style="
          color:#38bdf8;
          margin:0;
        ">
          🔐 Admin Panel
        </h2>


        <button
          id="closeAdmin"
          style="
            background:#ef4444;
            color:white;
            border:none;
            padding:10px 15px;
            border-radius:8px;
            cursor:pointer;
          "
        >
          ✕ বন্ধ
        </button>

      </div>


      <!-- LOGIN -->

      <div
        id="adminLoginBox"
        style="
          background:#1e293b;
          padding:20px;
          border-radius:15px;
        "
      >

        <h3 style="
          margin-bottom:15px;
        ">
          Admin Login
        </h3>


        <input
          id="adminEmail"
          type="email"
          placeholder="Admin Email"
          style="
            width:100%;
            padding:12px;
            margin-bottom:10px;
            border-radius:8px;
            border:none;
          "
        >


        <input
          id="adminPassword"
          type="password"
          placeholder="Password"
          style="
            width:100%;
            padding:12px;
            margin-bottom:10px;
            border-radius:8px;
            border:none;
          "
        >


        <button
          id="adminLoginBtn"
          style="
            width:100%;
            padding:12px;
            background:#10b981;
            color:white;
            border:none;
            border-radius:8px;
            font-weight:bold;
            cursor:pointer;
          "
        >
          Login
        </button>


        <p
          id="loginMessage"
          style="
            margin-top:10px;
            color:#f87171;
          "
        ></p>

      </div>


      <!-- ADMIN AREA -->

      <div
        id="adminArea"
        style="display:none;"
      >

        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:20px;
        ">

          <h3>
            🗂️ পোস্ট ম্যানেজমেন্ট
          </h3>


          <button
            id="logoutBtn"
            style="
              background:#ef4444;
              color:white;
              border:none;
              padding:8px 12px;
              border-radius:7px;
              cursor:pointer;
            "
          >
            Logout
          </button>

        </div>


        <!-- TABS -->

        <div style="
          display:flex;
          gap:10px;
          margin-bottom:20px;
        ">

          <button
            id="tabPendingBtn"
            style="
              flex:1;
              padding:12px;
              border:none;
              border-radius:9px;
              background:#38bdf8;
              color:#0f172a;
              cursor:pointer;
              font-weight:bold;
              font-size:15px;
            "
          >
            📝 Pending পোস্ট
          </button>


          <button
            id="tabPublishedBtn"
            style="
              flex:1;
              padding:12px;
              border:none;
              border-radius:9px;
              background:#334155;
              color:white;
              cursor:pointer;
              font-weight:bold;
              font-size:15px;
            "
          >
            ✅ Published পোস্ট
          </button>


          <button
            id="tabModeratorsBtn"
            style="
              display:none;
              flex:1;
              padding:12px;
              border:none;
              border-radius:9px;
              background:#334155;
              color:white;
              cursor:pointer;
              font-weight:bold;
              font-size:15px;
            "
          >
            👥 Moderators
          </button>

        </div>


        <div id="pendingPosts">
          Loading...
        </div>


        <div id="publishedPosts" style="display:none;">
          Loading...
        </div>


        <!-- MODERATORS (শুধু Admin দেখতে পাবে) -->

        <div id="moderatorsSection" style="display:none;">

          <div style="
            background:#1e293b;
            padding:18px;
            border-radius:12px;
            margin-bottom:15px;
          ">

            <h4 style="margin:0 0 8px 0;">
              👤 নতুন Moderator যোগ করুন
            </h4>

            <p style="
              color:#94a3b8;
              font-size:13px;
              line-height:1.6;
              margin-bottom:12px;
            ">
              ইউজারের Email দিন। ইউজারকে আগে ওয়েবসাইটে
              Google দিয়ে একবার Login করতে হবে।
              <br><br>
              Moderator: পোস্ট Edit / Publish / Reject করতে
              পারবে। চিরতরে Delete শুধু Admin করতে পারবে।
            </p>

            <div style="display:flex; gap:8px;">
              <input
                id="modSearchEmail"
                type="email"
                placeholder="user@gmail.com"
                style="
                  flex:1;
                  padding:11px;
                  border-radius:8px;
                  border:none;
                  font-size:14px;
                "
              >
              <button
                id="modSearchBtn"
                style="
                  background:#38bdf8;
                  color:#0f172a;
                  border:none;
                  padding:11px 16px;
                  border-radius:8px;
                  font-weight:bold;
                  cursor:pointer;
                "
              >
                🔎 খুঁজুন
              </button>
            </div>

          </div>

          <div id="modSearchResult"></div>

          <h4 style="margin:15px 0 8px 0;">
            🛡️ বর্তমান Moderator তালিকা
          </h4>
          <div id="modList">Loading...</div>

        </div>

      </div>

    </div>
  `;


  document.body.appendChild(adminPanel);


  /* =========================
     OPEN ADMIN
  ========================= */

  adminButton.addEventListener(
    "click",
    () => {

      adminPanel.style.display =
        "block";

    }
  );


  /* =========================
     CLOSE ADMIN
  ========================= */

  document
    .getElementById("closeAdmin")
    .addEventListener(
      "click",
      () => {

        adminPanel.style.display =
          "none";

      }
    );

  /* =========================
     ADMIN TABS (Pending / Published)
  ========================= */

  function switchAdminTab(tab) {

    const pendingDiv =
      document.getElementById(
        "pendingPosts"
      );

    const publishedDiv =
      document.getElementById(
        "publishedPosts"
      );

    const pendingBtn =
      document.getElementById(
        "tabPendingBtn"
      );

    const publishedBtn =
      document.getElementById(
        "tabPublishedBtn"
      );

    if (tab === "published") {

      pendingDiv.style.display = "none";
      publishedDiv.style.display = "block";

      pendingBtn.style.background = "#334155";
      pendingBtn.style.color = "white";

      publishedBtn.style.background = "#38bdf8";
      publishedBtn.style.color = "#0f172a";

      loadPublishedPostsAdmin();

    } else {

      pendingDiv.style.display = "block";
      publishedDiv.style.display = "none";

      pendingBtn.style.background = "#38bdf8";
      pendingBtn.style.color = "#0f172a";

      publishedBtn.style.background = "#334155";
      publishedBtn.style.color = "white";

      loadPendingPosts();

    }

  }


  document
    .getElementById("tabPendingBtn")
    .addEventListener(
      "click",
      () => {
        switchAdminTab("pending");
      }
    );


  document
    .getElementById("tabPublishedBtn")
    .addEventListener(
      "click",
      () => {
        switchAdminTab("published");
      }
    );

  document
    .getElementById("tabModeratorsBtn")
    .addEventListener(
      "click",
      () => {
        switchAdminTab("moderators");
      }
    );


  /* =========================
     ADMIN LOGIN
  ========================= */

  document
    .getElementById("adminLoginBtn")
    .addEventListener(
      "click",
      async () => {

        const email =
          document
            .getElementById("adminEmail")
            .value
            .trim();


        const password =
          document
            .getElementById("adminPassword")
            .value;


        const message =
          document.getElementById(
            "loginMessage"
          );


        if (!email || !password) {

          message.innerText =
            "ইমেইল ও Password দিন।";

          return;
        }


        /* শুধুমাত্র নির্দিষ্ট Admin email */

        if (
          email.toLowerCase() !==
          ADMIN_EMAIL.toLowerCase()
        ) {

          message.innerText =
            "❌ এই Email দিয়ে Admin Login করা যাবে না।";

          return;
        }


        try {

          await signInWithEmailAndPassword(
            auth,
            email,
            password
          );


          message.innerText = "";


        } catch (error) {

          console.error(error);

          message.innerText =
            "❌ Login ব্যর্থ:\n" +
            error.message;

        }

      }
    );


  /* =========================
     AUTH STATE
  ========================= */

  onAuthStateChanged(
    auth,
    async (user) => {

      const loginBox =
        document.getElementById(
          "adminLoginBox"
        );


      const adminArea =
        document.getElementById(
          "adminArea"
        );


      const loginMessage =
        document.getElementById(
          "loginMessage"
        );


      const panelTitle =
        document.getElementById(
          "panelTitle"
        );


      const modTab =
        document.getElementById(
          "tabModeratorsBtn"
        );


      if (!user) {

        currentRole = "none";

        loginBox.style.display = "block";
        adminArea.style.display = "none";

        if (loginMessage)
          loginMessage.innerText = "";

        return;

      }


      /* ---- Main Admin (email/password account) ---- */

      if (
        user.email &&
        user.email.toLowerCase() ===
        ADMIN_EMAIL.toLowerCase()
      ) {

        currentRole = "admin";

        loginBox.style.display = "none";
        adminArea.style.display = "block";

        if (panelTitle)
          panelTitle.innerText = "🔐 Admin Panel";

        if (modTab)
          modTab.style.display = "block";

        if (loginMessage)
          loginMessage.innerText = "";

        switchAdminTab("pending");

        return;

      }


      /* ---- Moderator check: users/{uid}.role ----
         (role field শুধু Admin set করে,
          নিজে নিজে বদলানো rules-এ ব্লক) */

      try {

        const snap =
          await getDoc(
            doc(db, "users", user.uid)
          );


        if (
          snap.exists() &&
          snap.data().role === "moderator"
        ) {

          currentRole = "moderator";

          loginBox.style.display = "none";
          adminArea.style.display = "block";

          if (panelTitle)
            panelTitle.innerText = "🛡️ Moderator Panel";

          if (modTab)
            modTab.style.display = "none";

          if (loginMessage)
            loginMessage.innerText = "";

          switchAdminTab("pending");

          return;

        }

      } catch (e) {
        console.error("Role check failed:", e);
      }


      /* ---- Login আছে কিন্তু staff access নেই ---- */

      currentRole = "none";

      loginBox.style.display = "block";
      adminArea.style.display = "none";

      if (loginMessage) {
        loginMessage.innerText =
          "আপনি Login আছেন, কিন্তু Moderator access নেই।\nAdmin-কে জানানো দরকার।";
      }

    }
  );


  /* =========================
     LOGOUT
  ========================= */

  document
    .getElementById("logoutBtn")
    .addEventListener(
      "click",
      async () => {

        await signOut(auth);

        alert(
          "আপনি Logout করেছেন।"
        );

      }
    );


  /* =========================
     LOAD PENDING POSTS
  ========================= */

  async function loadPendingPosts() {

    const container =
      document.getElementById(
        "pendingPosts"
      );


    container.innerHTML =
      "<p>Pending পোস্ট খোঁজা হচ্ছে...</p>";


    try {

      const q =
        query(
          collection(db, "Posts"),
          where(
            "status",
            "==",
            "pending"
          )
        );


      const snapshot =
        await getDocs(q);


      if (snapshot.empty) {

        container.innerHTML = `

          <div style="
            background:#1e293b;
            padding:20px;
            border-radius:12px;
            text-align:center;
          ">

            ✅ কোনো Pending পোস্ট নেই।

          </div>

        `;

        return;
      }


      container.innerHTML = "";


      snapshot.forEach(
        (postDoc) => {

          const post =
            postDoc.data();


          const card =
            document.createElement(
              "div"
            );


          card.style.cssText = `
            background:#ffffff;
            color:#0f172a;
            padding:20px;
            border-radius:15px;
            margin-bottom:20px;
          `;


          card.innerHTML = `

            <h3 style="
              margin-bottom:6px;
            ">
              ${escapeHtml(
                post.title ||
                "Untitled"
              )}
            </h3>


            <p style="
              color:#64748b;
              font-size:13px;
              margin-bottom:10px;
            ">
              ✍️ লেখক: <strong>${escapeHtml(post.authorName || "Anonymous")}</strong>${post.authorEmail ? ` <span style="color:#475569;">(${escapeHtml(post.authorEmail)})</span>` : ""}
            </p>


            <p style="
              color:#475569;
              line-height:1.6;
              white-space:pre-line;
              margin-bottom:12px;
            ">
              ${escapeHtml(
                post.content || ""
              )}
            </p>


            <p style="
              margin-bottom:15px;
              color:#64748b;
            ">

              Category:

              <strong>
                ${getCategoryName(
                  post.category
                )}
              </strong>

            </p>


            <div style="
              display:flex;
              gap:10px;
              flex-wrap:wrap;
            ">


              <button
                class="editBtn"
                style="
                  background:#3b82f6;
                  color:white;
                  border:none;
                  padding:10px 16px;
                  border-radius:8px;
                  cursor:pointer;
                  font-weight:bold;
                "
              >
                ✏️ Edit
              </button>


              <button
                class="publishBtn"
                style="
                  background:#10b981;
                  color:white;
                  border:none;
                  padding:10px 16px;
                  border-radius:8px;
                  cursor:pointer;
                  font-weight:bold;
                "
              >
                ✅ Publish
              </button>

              <button
                class="rejectBtn"
                style="
                  background:#f59e0b;
                  color:white;
                  border:none;
                  padding:10px 16px;
                  border-radius:8px;
                  cursor:pointer;
                  font-weight:bold;
                "
              >
                🚫 Reject
              </button>


              <button
                class="deleteBtn"
                style="
                  background:#ef4444;
                  color:white;
                  border:none;
                  padding:10px 16px;
                  border-radius:8px;
                  cursor:pointer;
                  display:${currentRole === "admin" ? "" : "none"};
                "
              >
                🗑 Delete
              </button>

            </div>
          `;


          /* =========================
             EDIT (Pending)
          ========================= */

          card
            .querySelector(
              ".editBtn"
            )
            .addEventListener(
              "click",
              async () => {

                const result =
                  await openPostEditor({
                    title: post.title || "",
                    content: post.content || "",
                    category: post.category || ""
                  });

                if (!result) {
                  return;
                }

                try {

                  const staff =
                    staffInfo();

                  await updateDoc(
                    doc(
                      db,
                      "Posts",
                      postDoc.id
                    ),
                    {
                      title: result.title,
                      content: result.content,
                      category: result.category,
                      lastEditedBy: staff.name,
                      lastEditedAt:
                        serverTimestamp()
                    }
                  );

                  alert(
                    "✏️ পোস্ট আপডেট হয়েছে!"
                  );

                  loadPendingPosts();

                } catch (error) {
                  console.error(error);
                  alert(
                    "❌ সেভ করা যায়নি:\n\n" +
                    error.message
                  );
                }

              }
            );


          /* =========================
             PUBLISH
          ========================= */

          card
            .querySelector(
              ".publishBtn"
            )
            .addEventListener(
              "click",
              async () => {

                if (
                  !confirm(
                    "এই পোস্টটি Publish করতে চান?"
                  )
                ) {
                  return;
                }


                try {

                  const staff =
                    staffInfo();

                  await updateDoc(
                    doc(
                      db,
                      "Posts",
                      postDoc.id
                    ),
                    {
                      status:
                        "published",
                      moderatedBy: {
                        name: staff.name,
                        email: staff.email,
                        at: serverTimestamp()
                      }
                    }
                  );


                  if (post.authorUid) {

                    /* in-site notification - লেখকের Bell-এ যায়
                       (phone push: Cloud Function / cron) */

                    try {

                      const notifRef = await addDoc(
                        collection(
                          db,
                          "users",
                          post.authorUid,
                          "notifications"
                        ),
                        {
                          type: "approved",
                          postId: postDoc.id,
                          postTitle: post.title || "",
                          message: "আপনার পোস্টটি অনুমোদিত হয়েছে এবং এখন ওয়েবসাইটে প্রকাশিত হয়েছে।",
                          read: false,
                          pushedAt: null,
                          createdAt: serverTimestamp()
                        }
                      );

                      /* push queue — cron/function এখান থেকে push পাঠায় */

                      await addDoc(
                        collection(
                          db,
                          "pushQueue"
                        ),
                        {
                          uid: post.authorUid,
                          notifId: notifRef.id,
                          type: "approved",
                          postId: postDoc.id,
                          postTitle: post.title || "",
                          message: "আপনার পোস্টটি অনুমোদিত হয়েছে এবং এখন ওয়েবসাইটে প্রকাশিত হয়েছে।",
                          createdAt: serverTimestamp()
                        }
                      );


                    } catch (e) {

                      console.error(
                        "Notification write failed:",
                        e
                      );

                    }

                  }



                  alert(
                    "✅ পোস্ট Published হয়েছে!"
                  );


                  loadPendingPosts();


                } catch (error) {

                  console.error(
                    error
                  );


                  alert(
                    "❌ Publish করা যায়নি:\n\n" +
                    error.message
                  );

                }

              }
            );


          /* =========================
             REJECT
          ========================= */

          card
            .querySelector(
              ".rejectBtn"
            )
            .addEventListener(
              "click",
              async () => {

                if (
                  !confirm(
                    "এই পোস্টটি Reject করতে চান?"
                  )
                ) {
                  return;
                }


                try {

                  const staff =
                    staffInfo();

                  await updateDoc(
                    doc(
                      db,
                      "Posts",
                      postDoc.id
                    ),
                    {
                      status:
                        "rejected",
                      moderatedBy: {
                        name: staff.name,
                        email: staff.email,
                        at: serverTimestamp()
                      }
                    }
                  );


                  if (post.authorUid) {

                    /* in-site notification - লেখকের Bell-এ যায়
                       (phone push: Cloud Function / cron) */

                    try {

                      const notifRef = await addDoc(
                        collection(
                          db,
                          "users",
                          post.authorUid,
                          "notifications"
                        ),
                        {
                          type: "rejected",
                          postId: postDoc.id,
                          postTitle: post.title || "",
                          message: "দুঃখিত, আপনার পোস্টটি অনুমোদিত হয়নি।",
                          read: false,
                          pushedAt: null,
                          createdAt: serverTimestamp()
                        }
                      );

                      /* push queue — cron/function এখান থেকে push পাঠায় */

                      await addDoc(
                        collection(
                          db,
                          "pushQueue"
                        ),
                        {
                          uid: post.authorUid,
                          notifId: notifRef.id,
                          type: "rejected",
                          postId: postDoc.id,
                          postTitle: post.title || "",
                          message: "দুঃখিত, আপনার পোস্টটি অনুমোদিত হয়নি।",
                          createdAt: serverTimestamp()
                        }
                      );


                    } catch (e) {

                      console.error(
                        "Notification write failed:",
                        e
                      );

                    }

                  }



                  alert(
                    "🚫 পোস্ট Reject করা হয়েছে। লেখকের বিদ্যমান ফোনে/ডিভাইসে Push Notification পাঠানো হবে।"
                  );


                  loadPendingPosts();


                } catch (error) {

                  console.error(
                    error
                  );


                  alert(
                    "❌ Reject করা যায়নি:\n\n" +
                    error.message
                  );

                }

              }
            );


          /* =========================
             DELETE
          ========================= */

          card
            .querySelector(
              ".deleteBtn"
            )
            .addEventListener(
              "click",
              async () => {

                if (
                  !confirm(
                    "এই Pending পোস্টটি মুছে ফেলতে চান?"
                  )
                ) {
                  return;
                }


                try {

                  await updateDoc(
                    doc(
                      db,
                      "Posts",
                      postDoc.id
                    ),
                    {
                      status:
                        "deleted"
                    }
                  );


                  alert(
                    "🗑 পোস্টটি সরানো হয়েছে।"
                  );


                  loadPendingPosts();


                } catch (error) {

                  console.error(
                    error
                  );


                  alert(
                    "❌ পোস্ট সরানো যায়নি:\n\n" +
                    error.message
                  );

                }

              }
            );


          container.appendChild(
            card
          );

        }
      );


    } catch (error) {

      console.error(error);


      container.innerHTML = `

        <div style="
          background:#450a0a;
          padding:20px;
          border-radius:12px;
          color:#fecaca;
        ">

          ❌ Pending পোস্ট লোড করা যায়নি।

          <br><br>

          ${escapeHtml(
            error.message
          )}

        </div>

      `;

    }

  }


  /* =========================
     LOAD PUBLISHED POSTS (Admin)
     ছোট সারি-আকারে তালিকা —
     ক্লিক করলে লেখা খুলে যায়,
     Delete মানে চিরতরে মুছে যাওয়া
  ========================= */

  async function loadPublishedPostsAdmin() {

    const container =
      document.getElementById(
        "publishedPosts"
      );

    container.innerHTML =
      "<p>Published পোস্ট খোঁজা হচ্ছে...</p>";

    try {

      const q =
        query(
          collection(db, "Posts"),
          where(
            "status",
            "==",
            "published"
          )
        );

      const snapshot =
        await getDocs(q);

      if (snapshot.empty) {

        container.innerHTML = `

          <div style="
            background:#1e293b;
            padding:20px;
            border-radius:12px;
            text-align:center;
          ">

            ✅ কোনো Published পোস্ট নেই।

          </div>

        `;

        return;

      }

      container.innerHTML = `
        <p style="
          color:#94a3b8;
          font-size:13px;
          margin:0 0 12px 0;
        ">
          💡 লেখাটি দেখতে যেকোনো সারিতে ক্লিক করুন
        </p>
      `;


      /* নতুন পোস্ট আগে দেখানো */

      const docs = [];

      snapshot.forEach(
        (postDoc) => {
          docs.push(postDoc);
        }
      );

      docs.sort((a, b) => {
        const ca =
          (a.data().createdAt &&
            a.data().createdAt.seconds) ||
          0;

        const cb =
          (b.data().createdAt &&
            b.data().createdAt.seconds) ||
          0;

        return cb - ca;
      });


      docs.forEach(
        (postDoc) => {

          const post =
            postDoc.data();

          let date = "";

          if (
            post.createdAt &&
            post.createdAt.seconds
          ) {
            date = new Date(
              post.createdAt.seconds * 1000
            ).toLocaleDateString("bn-BD");
          }

          const row =
            document.createElement(
              "div"
            );

          row.style.cssText = `
            background:#1e293b;
            border:1px solid #334155;
            border-radius:10px;
            padding:12px 14px;
            margin-bottom:10px;
          `;

          row.innerHTML = `

            <div
              class="rowHeader"
              style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:10px;
                flex-wrap:wrap;
                cursor:pointer;
              "
            >

              <div style="
                flex:1;
                min-width:180px;
              ">

                <div style="
                  color:white;
                  font-weight:bold;
                  font-size:15px;
                ">
                  ${escapeHtml(
                    post.title ||
                    "Untitled"
                  )}
                </div>

                <div style="
                  color:#94a3b8;
                  font-size:12.5px;
                  margin-top:3px;
                ">
                  ${getCategoryName(
                    post.category
                  )} • 📅 ${date}${post.authorName
                    ? ' • ✍️ ' + escapeHtml(post.authorName)
                    : ''}${post.moderatedBy
                    ? ' • 🛡️ ' + escapeHtml(post.moderatedBy.name)
                    : ''}${post.lastEditedBy
                    ? ' • ✏️ ' + escapeHtml(post.lastEditedBy)
                    : ''}
                </div>

              </div>


              <div style="
                display:flex;
                gap:8px;
              ">

                <button
                  class="editBtn"
                  style="
                    background:#3b82f6;
                    color:white;
                    border:none;
                    padding:7px 12px;
                    border-radius:7px;
                    cursor:pointer;
                    font-size:13px;
                    font-weight:bold;
                  "
                >
                  ✏️ Edit
                </button>


                <button
                  class="publishedDeleteBtn"
                  style="
                    background:#ef4444;
                    color:white;
                    border:none;
                    padding:7px 12px;
                    border-radius:7px;
                    cursor:pointer;
                    font-size:13px;
                    font-weight:bold;
                    display:${currentRole === "admin" ? "" : "none"};
                  "
                >
                  🗑 Delete
                </button>

              </div>

            </div>


            <div
              class="contentPreview"
              style="
                display:none;
                margin-top:12px;
                padding:12px;
                background:#0f172a;
                border-radius:8px;
                color:#cbd5e1;
                font-size:14px;
                line-height:1.6;
                white-space:pre-line;
                max-height:250px;
                overflow-y:auto;
              "
            >
              ${escapeHtml(
                post.content || ""
              )}
            </div>
          `;


          /* =========================
             সারিতে ক্লিক = লেখা খোলা/বন্ধ
          ========================= */

          const header =
            row.querySelector(
              ".rowHeader"
            );

          const preview =
            row.querySelector(
              ".contentPreview"
            );

          header.addEventListener(
            "click",
            (e) => {

              if (
                e.target.closest("button")
              ) {
                return;
              }

              preview.style.display =
                preview.style.display === "none"
                  ? "block"
                  : "none";

            }
          );


          /* =========================
             EDIT (Published)
          ========================= */

          row
            .querySelector(
              ".editBtn"
            )
            .addEventListener(
              "click",
              async () => {

                const result =
                  await openPostEditor({
                    title: post.title || "",
                    content: post.content || "",
                    category: post.category || ""
                  });

                if (!result) {
                  return;
                }

                try {

                  const staff =
                    staffInfo();

                  await updateDoc(
                    doc(
                      db,
                      "Posts",
                      postDoc.id
                    ),
                    {
                      title: result.title,
                      content: result.content,
                      category: result.category,
                      lastEditedBy: staff.name,
                      lastEditedAt:
                        serverTimestamp()
                    }
                  );

                  alert(
                    "✏️ পোস্ট আপডেট হয়েছে!"
                  );

                  loadPublishedPostsAdmin();

                } catch (error) {
                  console.error(error);
                  alert(
                    "❌ সেভ করা যায়নি:\n\n" +
                    error.message
                  );
                }

              }
            );


          /* =========================
             DELETE (Published)
             চিরতরে মুছে যায় —
             Pending-এ ফিরে আসে না
          ========================= */

          row
            .querySelector(
              ".publishedDeleteBtn"
            )
            .addEventListener(
              "click",
              async () => {

                if (
                  !confirm(
                    "⚠️ এই পোস্টটি কি সত্যিই চিরতরে মুছে ফেলবেন?\n\n" +
                    "মুছে ফেললে আর ফিরিয়ে আনা যাবে না।"
                  )
                ) {
                  return;
                }

                try {
                  await deleteDoc(
                    doc(
                      db,
                      "Posts",
                      postDoc.id
                    )
                  );

                  alert(
                    "🗑 পোস্টটি চিরতরে মুছে ফেলা হয়েছে।"
                  );

                  loadPublishedPostsAdmin();

                } catch (error) {
                  console.error(error);
                  alert(
                    "❌ Delete করা যায়নি:\n\n" +
                    error.message
                  );
                }

              }
            );

          container.appendChild(
            row
          );

        }
      );

    } catch (error) {

      console.error(error);

      container.innerHTML = `

        <div style="
          background:#450a0a;
          padding:20px;
          border-radius:12px;
          color:#fecaca;
        ">

          ❌ Published পোস্ট লোড করা যায়নি।

          <br><br>

          ${escapeHtml(
            error.message
          )}

        </div>

      `;

    }

  }


  /* =========================
     MODERATOR MANAGEMENT
     (শুধু Admin — email দিয়ে search,
      role set/remove)
  ========================= */

  function staffInfo() {

    const user =
      auth.currentUser;

    return {
      name:
        (user && user.displayName) ||
        (user && user.email) ||
        "unknown",
      email:
        (user && user.email) || ""
    };

  }


  async function loadModerators() {

    const container =
      document.getElementById(
        "modList"
      );

    container.innerHTML =
      "<p>খোঁজা হচ্ছে...</p>";

    try {

      const snap =
        await getDocs(
          query(
            collection(
              db,
              "users"
            ),
            where(
              "role",
              "==",
              "moderator"
            )
          )
        );


      if (snap.empty) {

        container.innerHTML = `
          <div style="
            background:#1e293b;
            padding:16px;
            border-radius:12px;
            text-align:center;
            color:#94a3b8;
          ">
            এখনো কোনো Moderator নেই।
          </div>
        `;

        return;

      }


      container.innerHTML = "";


      snap.forEach(
        (uDoc) => {

          const u =
            uDoc.data();

          const row =
            document.createElement(
              "div"
            );

          row.style.cssText = `
            background:#1e293b;
            border:1px solid #334155;
            border-radius:10px;
            padding:12px 14px;
            margin-bottom:10px;
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:10px;
            flex-wrap:wrap;
          `;

          row.innerHTML = `
            <div>
              <div style="
                color:white;
                font-weight:bold;
              ">
                ${escapeHtml(
                  u.name ||
                  "User"
                )}
              </div>
              <div style="
                color:#94a3b8;
                font-size:12.5px;
                margin-top:2px;
              ">
                ${escapeHtml(
                  u.email || ""
                )}
              </div>
            </div>
            <button
              class="removeModBtn"
              style="
                background:#ef4444;
                color:white;
                border:none;
                padding:7px 12px;
                border-radius:7px;
                font-size:13px;
                font-weight:bold;
                cursor:pointer;
              "
            >
              মোডারেটর বাতিল
            </button>
          `;

          row
            .querySelector(
              ".removeModBtn"
            )
            .addEventListener(
              "click",
              async () => {

                if (
                  !confirm(
                    "এই ইউজারের Moderator access বাতিল করবেন?"
                  )
                ) {
                  return;
                }

                try {

                  await updateDoc(
                    doc(
                      db,
                      "users",
                      uDoc.id
                    ),
                    {
                      role:
                        FieldValue.delete()
                    }
                  );

                  alert(
                    "✅ Moderator access বাতিল হয়েছে।"
                  );

                  loadModerators();

                } catch (e) {
                  console.error(e);
                  alert(
                    "❌ বাতিল করা যায়নি:\n\n" +
                    e.message
                  );
                }

              }
            );

          container.appendChild(
            row
          );

        }
      );

    } catch (e) {

      console.error(e);

      container.innerHTML =
        "❌ লোড করা যায়নি: " +
        escapeHtml(e.message);

    }

  }


  document
    .getElementById(
      "modSearchBtn"
    )
    .addEventListener(
      "click",
      async () => {

        const email =
          document
            .getElementById(
              "modSearchEmail"
            )
            .value
            .trim()
            .toLowerCase();

        const box =
          document.getElementById(
            "modSearchResult"
          );

        if (!email) {
          box.innerHTML =
            '<p style="color:#f87171;">Email দিন।</p>';
          return;
        }

        box.innerHTML =
          "<p>খোঁজা হচ্ছে...</p>";

        try {

          const snap =
            await getDocs(
              query(
                collection(
                  db,
                  "users"
                ),
                where(
                  "email",
                  "==",
                  email
                )
              )
            );


          if (snap.empty) {

            box.innerHTML = `
              <div style="
                background:#450a0a;
                color:#fecaca;
                padding:14px;
                border-radius:10px;
                font-size:14px;
                line-height:1.6;
                margin-bottom:15px;
              ">
                ❌ এই Email-এর কোনো ইউজার পাওয়া যায়নি।
                <br><br>
                ইউজারকে আগে ওয়েবসাইটে
                <strong>Google দিয়ে একবার Login</strong>
                করতে হবে — তারপর আবার খুঁজবেন।
              </div>
            `;

            return;

          }


          box.innerHTML = "";


          snap.forEach(
            (uDoc) => {

              const u =
                uDoc.data();

              const isMod =
                u.role === "moderator";


              if (
                email ===
                ADMIN_EMAIL.toLowerCase()
              ) {

                box.innerHTML = `
                  <div style="
                    background:#1e293b;
                    padding:14px;
                    border-radius:10px;
                    color:#cbd5e1;
                    font-size:14px;
                    margin-bottom:15px;
                  ">
                    এটি মূল Admin account —
                    Moderator access এর দরকার নেই।
                  </div>
                `;

                return;

              }


              const item =
                document.createElement(
                  "div"
                );

              item.style.cssText = `
                background:#1e293b;
                border:1px solid #334155;
                border-radius:10px;
                padding:14px;
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:10px;
                flex-wrap:wrap;
                margin-bottom:15px;
              `;

              item.innerHTML = `
                <div>
                  <div style="
                    color:white;
                    font-weight:bold;
                  ">
                    ${escapeHtml(
                      u.name ||
                      u.email ||
                      "User"
                    )}
                  </div>
                  <div style="
                    color:#94a3b8;
                    font-size:12.5px;
                    margin-top:2px;
                  ">
                    ${escapeHtml(
                      u.email || ""
                    )}
                    ${isMod ? ' • <span style="color:#34d399;">মোডারেটর</span>' : ""}
                  </div>
                </div>
                <button
                  id="modToggleBtn"
                  style="
                    background:${isMod ? "#ef4444" : "#10b981"};
                    color:white;
                    border:none;
                    padding:9px 14px;
                    border-radius:8px;
                    font-size:13px;
                    font-weight:bold;
                    cursor:pointer;
                  "
                >
                  ${isMod ? "🚫 মোডারেটর বাতিল" : "✅ মোডারেটর বানান"}
                </button>
              `;

              item
                .querySelector(
                  "#modToggleBtn"
                )
                .addEventListener(
                  "click",
                  async () => {

                    try {

                      if (isMod) {

                        await updateDoc(
                          doc(
                            db,
                            "users",
                            uDoc.id
                          ),
                          {
                            role:
                              FieldValue.delete()
                          }
                        );

                        alert(
                          "✅ Moderator access বাতিল হয়েছে।"
                        );

                      } else {

                        await updateDoc(
                          doc(
                            db,
                            "users",
                            uDoc.id
                          ),
                          {
                            role:
                              "moderator"
                          }
                        );

                        alert(
                          "✅ মোডারেটর বানানো হয়েছে!\n\n" +
                          "ইউজার Google Login করলেই তার Moderator Panel খুলবে।"
                        );

                      }

                      loadModerators();

                    } catch (e) {
                      console.error(e);
                      alert(
                        "❌ কাজ করা যায়নি:\n\n" +
                        e.message
                      );
                    }

                  }
                );

              box.appendChild(
                item
              );

            }
          );

        } catch (e) {

          console.error(e);

          box.innerHTML =
            "❌ খোঁজা যায়নি: " +
            escapeHtml(e.message);

        }

      }
    );


  /* =========================
     CATEGORY NAME
  ========================= */

  function getCategoryName(
    category
  ) {

    const names = {

      ayat:
        "আয়াত ও হাদিস",

      atheism:
        "নাস্তিকতার জবাব",

      protest:
        "প্রতিবাদ",

      biography:
        "জীবনী",

      story:
        "গল্প-উপন্যাস"

    };


    return escapeHtml(
      names[category] ||
      category ||
      "সাধারণ"
    );

  }


  /* =========================
     HTML SECURITY
  ========================= */

  function escapeHtml(text) {

    const div =
      document.createElement(
        "div"
      );

    div.textContent =
      String(text ?? "");

    return div.innerHTML;

  }
