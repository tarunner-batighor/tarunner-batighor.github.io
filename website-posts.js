// Firebase Imports
import { getFirestore, collection, getDocs, getDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD97ZB_1H6JcZ6MzTHj39uJic3gFqJnH6o",
  authDomain: "tarunner-batighor.firebaseapp.com",
  projectId: "tarunner-batighor",
  storageBucket: "tarunner-batighor.firebasestorage.app",
  messagingSenderId: "494925974714",
  appId: "1:494925974714:web:7f2ec193de3c8ee03b0683",
  measurementId: "G-Y9L1BG62BL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Get all published posts for a specific category
 * @param {string} category - The category of posts to fetch
 * @returns {Promise<Array>} Array of published posts
 */
export async function getPublishedPosts(category) {
  try {
    const postsCollection = collection(db, "Posts");
    
    // Create query for published posts in the specific category
    const q = query(
      postsCollection,
      where("category", "==", category),
      where("status", "==", "published")
    );
    
    const querySnapshot = await getDocs(q);
    const posts = [];
    
    querySnapshot.forEach((doc) => {
      posts.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // নতুন পোস্ট সবার আগে দেখানো (createdAt অনুযায়ী নামানো ক্রম)
    posts.sort((a, b) => {
      const timeA = (a.createdAt && a.createdAt.seconds) ? a.createdAt.seconds : 0;
      const timeB = (b.createdAt && b.createdAt.seconds) ? b.createdAt.seconds : 0;
      return timeB - timeA;
    });

    return posts;
  } catch (error) {
    console.error("Error fetching posts:", error);
    throw error;
  }
}

/**
 * Get all pending posts (for admin)
 * @returns {Promise<Array>} Array of pending posts
 */
export async function getPendingPosts() {
  try {
    const postsCollection = collection(db, "Posts");
    const q = query(postsCollection, where("status", "==", "pending"));
    
    const querySnapshot = await getDocs(q);
    const posts = [];
    
    querySnapshot.forEach((doc) => {
      posts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return posts;
  } catch (error) {
    console.error("Error fetching pending posts:", error);
    throw error;
  }
}

/**
 * নির্দিষ্ট আইডির একটি পোস্ট আনা
 * (বিস্তারিত পোস্ট পেজ ও শেয়ার লিংকের জন্য)
 * @param {string} postId - পোস্টের আইডি
 * @returns {Promise<Object|null>} পোস্ট অবজেক্ট, না পেলে null
 */
export async function getPostById(postId) {
  try {
    const snap = await getDoc(doc(db, "Posts", postId));
    if (!snap.exists()) {
      return null;
    }
    return {
      id: snap.id,
      ...snap.data()
    };
  } catch (error) {
    console.error("Error fetching post:", error);
    throw error;
  }
}

/**
 * সব Published পোস্ট আনা (সার্চের জন্য)
 * @returns {Promise<Array>} নতুন পোস্ট আগে
 */
export async function getAllPublishedPosts() {
  try {
    const q = query(collection(db, "Posts"), where("status", "==", "published"));
    const querySnapshot = await getDocs(q);
    const posts = [];

    querySnapshot.forEach((doc) => {
      posts.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // নতুন পোস্ট সবার আগে
    posts.sort((a, b) => {
      const timeA = (a.createdAt && a.createdAt.seconds) ? a.createdAt.seconds : 0;
      const timeB = (b.createdAt && b.createdAt.seconds) ? b.createdAt.seconds : 0;
      return timeB - timeA;
    });

    return posts;
  } catch (error) {
    console.error("Error fetching all posts:", error);
    throw error;
  }
}
