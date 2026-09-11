import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDAYmwu9GD0R0BlL_6tUqOpUgByNci_Bhg",
  authDomain: "ingenioespectaculos.firebaseapp.com",
  projectId: "ingenioespectaculos",
  storageBucket: "ingenioespectaculos.firebasestorage.app",
  messagingSenderId: "185253280310",
  appId: "1:185253280310:web:fda7e38fb0688a09d43697",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const form = document.querySelector("#loginForm");
const email = document.querySelector("#loginEmail");
const password = document.querySelector("#loginPassword");
const errorBox = document.querySelector("#loginError");

onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = "index.html";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.textContent = "";

  try {
    await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
    window.location.href = "index.html";
  } catch (error) {
    console.warn("Login fallido.", error);
    errorBox.textContent = "Correo o contraseña incorrectos.";
  }
});

if (window.lucide) window.lucide.createIcons();
