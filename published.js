import { getApps, initializeApp } 
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD97ZB_1H6JcZ6MzTHj39uJic3gFqJnH6o",
  authDomain: "tarunner-batighor.firebaseapp.com",
  projectId: "tarunner-batighor",
  storageBucket: "tarunner-batighor.firebasestorage.app",
  messagingSenderId: "494925974714",
  appId: "1:494925974714:web:7f2ec193de3c8ee03b0683",
  measurementId: "G-Y9L1BG62BL"
};

const app = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

const db = getFirestore(app);

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
