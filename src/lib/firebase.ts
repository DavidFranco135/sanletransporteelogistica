import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyBS0q6468OX3FFkc5-nkN-GkAYBSwMidF4",
  authDomain: "sanle-41ec2.firebaseapp.com",
  projectId: "sanle-41ec2",
  storageBucket: "sanle-41ec2.firebasestorage.app",
  messagingSenderId: "692619990631",
  appId: "1:692619990631:web:f2cf836582e04b50f7a6c2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
