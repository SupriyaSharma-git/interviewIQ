import { initializeApp } from "firebase/app";
import {getAuth, GoogleAuthProvider} from "firebase/auth"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: "interviewiq-f2659.firebaseapp.com",
  projectId: "interviewiq-f2659",
  storageBucket: "interviewiq-f2659.firebasestorage.app",
  messagingSenderId: "937097457768",
  appId: "1:937097457768:web:a3f0e0c03734dec2170bdd"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app)

const provider = new GoogleAuthProvider();

export {auth, provider}      