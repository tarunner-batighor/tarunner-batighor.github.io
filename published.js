// =========================
// WEBSITE PUBLISHED POSTS
// =========================

import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs
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
// GET PUBLISHED POSTS
// =========================

export async function getPublishedPosts(category) {

  try {

    const snapshot =
      await getDocs(
        collection(db, "Posts")
      );

    const posts = [];

    snapshot.forEach((item) => {

      const post = item.data();

      if (
        post.status === "published" &&
        post.category === category
      ) {

        posts.push({
          id: item.id,
          ...post
        });

      }

    });

    return posts;

  } catch (error) {

    console.error(
      "Published posts error:",
      error
    );

    return [];

  }

}
