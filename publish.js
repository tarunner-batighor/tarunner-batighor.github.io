import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =========================
// FIREBASE CONFIG
// =========================

const firebaseConfig = {
  apiKey: "AIzaSyD97ZB_1H6JcZ6MzTHj39uJic3gFqJnH6o",
  authDomain: "tarunner-batighor.firebaseapp.com",
  projectId: "tarunner-batighor",
  storageBucket: "tarunner-batighor.firebasestorage.app",
  messagingSenderId: "494925974714",
  appId: "1:494925974714:web:7f2ec193de3c8ee03b0683",
  measurementId: "G-Y9L1BG62BL"
};

// =========================
// FIREBASE START
// =========================

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// =========================
// ADMIN PANEL
// =========================

document.body.innerHTML = `
  <div style="
    max-width:800px;
    margin:auto;
    padding:20px;
    font-family:Arial,sans-serif;
  ">

    <h1 style="text-align:center;">
      🛠️ Admin Panel
    </h1>

    <p style="text-align:center;color:#64748b;">
      Pending পোস্টগুলো এখান থেকে Publish করুন
    </p>

    <div id="posts">
      পোস্ট লোড হচ্ছে...
    </div>

  </div>
`;

// =========================
// LOAD PENDING POSTS
// =========================

async function loadPosts() {
  const container = document.getElementById("posts");

  try {
    const snapshot = await getDocs(collection(db, "Posts"));

    container.innerHTML = "";
    let found = false;

    snapshot.forEach((item) => {
      const post = item.data();

      if (post.status !== "pending") return;

      found = true;
      const card = document.createElement("div");

      card.style.cssText = `
        background:#ffffff;
        color:#0f172a;
        border:2px solid #e0522d;
        border-radius:14px;
        padding:18px;
        margin:20px 0;
        box-shadow:0 4px 12px rgba(0,0,0,.15);
      `;

      card.innerHTML = `
        <h2 style="margin-bottom:10px;">
          ${escapeHtml(post.title || "শিরোনাম নেই")}
        </h2>

        <p style="
          color:#64748b;
          margin-bottom:10px;
        ">
          বিভাগ:
          ${escapeHtml(post.category || "সাধারণ")}
        </p>

        <div style="
          line-height:1.7;
          white-space:pre-line;
          margin-bottom:18px;
        ">
          ${escapeHtml(post.content || "")}
        </div>

        <div style="
          display:flex;
          gap:10px;
        ">

          <button
            class="publish-btn"
            data-id="${item.id}"
            style="
              background:#10b981;
              color:white;
              border:none;
              padding:10px 18px;
              border-radius:8px;
              cursor:pointer;
              font-weight:bold;
            "
          >
            ✅ Publish
          </button>

          <button
            class="delete-btn"
            data-id="${item.id}"
            style="
              background:#ef4444;
              color:white;
              border:none;
              padding:10px 18px;
              border-radius:8px;
              cursor:pointer;
              font-weight:bold;
            "
          >
            🗑️ Delete
          </button>

        </div>
      `;

      container.appendChild(card);
    });

    if (!found) {
      container.innerHTML = `
        <div style="
          text-align:center;
          padding:40px;
          color:#64748b;
        ">
          🎉 বর্তমানে কোনো Pending পোস্ট নেই।
        </div>
      `;
    }

    // PUBLISH BUTTON
    document.querySelectorAll(".publish-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.getAttribute("data-id");
        try {
          await updateDoc(doc(db, "Posts", id), { status: "published" });
          alert("✅ পোস্ট সফলভাবে Published হয়েছে!");
          loadPosts();
        } catch (error) {
          console.error(error);
          alert("❌ Publish করা যায়নি:\n" + error.message);
        }
      });
    });

    // DELETE BUTTON
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const id = button.getAttribute("data-id");
        const confirmDelete = confirm("এই পোস্টটি কি সত্যিই Delete করতে চান?");
        if (!confirmDelete) return;
        try {
          await deleteDoc(doc(db, "Posts", id));
          alert("🗑️ পোস্ট Delete হয়েছে!");
          loadPosts();
        } catch (error) {
          console.error(error);
          alert("❌ Delete করা যায়নি:\n" + error.message);
        }
      });
    });
  } catch (error) {
    console.error(error);
    container.innerHTML = `
      <div style="
        color:#ef4444;
        padding:20px;
      ">
        ❌ পোস্ট লোড করা যায়নি:
        <br><br>
        ${escapeHtml(error.message)}
      </div>
    `;
  }
}

// HTML SECURITY
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}

// START
loadPosts();
