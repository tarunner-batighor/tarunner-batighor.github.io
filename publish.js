// =========================
// PUBLISH POSTS
// =========================

import {
  collection,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from "./firebase.js";


// =========================
// PUBLISH PENDING POSTS
// =========================

async function publishPendingPosts() {

  try {

    const snapshot =
      await getDocs(
        collection(db, "posts")
      );

    snapshot.forEach(async (item) => {

      const data = item.data();

      if (data.status === "pending") {

        await updateDoc(
          doc(db, "posts", item.id),
          {
            status: "published"
          }
        );

      }

    });

    console.log(
      "Pending posts published successfully."
    );

  } catch (error) {

    console.error(
      "Publish error:",
      error
    );

  }

}


// =========================
// START
// =========================

publishPendingPosts();
