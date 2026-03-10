// ============================================================
//  firebase-config.js
//  REPLACE the values below with YOUR Firebase project config.
//  You get this from: Firebase Console → Project Settings → Your Apps
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyCAcAcDDYGIQSF7L2PhMfoMjmDQETFullU",
    authDomain: "jasmine-love.firebaseapp.com",
    projectId: "jasmine-love",
    storageBucket: "jasmine-love.firebasestorage.app",
    messagingSenderId: "812428374434",
    appId: "1:812428374434:web:a39bf47c6475b7105c42fb"
  };


// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
