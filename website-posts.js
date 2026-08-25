// Firebase Imports
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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
