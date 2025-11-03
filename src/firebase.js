// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA9enLqzQYhb-gfCaVh33z_0auGAtFZRyc",
  authDomain: "farmmate-db11e.firebaseapp.com",
  projectId: "farmmate-db11e",
  storageBucket: "farmmate-db11e.firebasestorage.app",
  messagingSenderId: "412214369396",
  appId: "1:412214369396:web:ee5e0c1600a69598720521",
  measurementId: "G-HD3ZDMNMH8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
