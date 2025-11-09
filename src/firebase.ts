// 이 파일은 Firebase 관련 설정만

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
   apiKey: "AIzaSyDONQQV1l8xI97p4Q_BroPPQYYJz4t3_DM",
  authDomain: "career-roadmap-b48cc.firebaseapp.com",
  projectId: "career-roadmap-b48cc",
  storageBucket: "career-roadmap-b48cc.firebasestorage.app",
  messagingSenderId: "380566630637",
  appId: "1:380566630637:web:ddac49473ff9115d065ce4",
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// 다른 파일에서 가져다 쓸 수 있도록 auth와 db를 export
export const auth = getAuth(app);
export const db = getFirestore(app);

