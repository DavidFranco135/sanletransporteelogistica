import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      setAuth: (user, token) => set({ user, token }),
      logout: async () => {
        await signOut(auth);
        set({ user: null, token: null });
      },
      loginWithEmail: async (email: string, password: string) => {
        set({ loading: true });
        try {
          const cred = await signInWithEmailAndPassword(auth, email, password);
          const token = await cred.user.getIdToken();

          // Try to find user profile in Firestore
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', email));
          const snap = await getDocs(q);

          let userData: User;
          if (!snap.empty) {
            const d = snap.docs[0];
            userData = { id: d.id, ...d.data() } as User;
          } else {
            // Default admin profile if not in Firestore
            userData = {
              id: cred.user.uid,
              email: cred.user.email || email,
              name: cred.user.displayName || 'Administrador',
              role: 'admin',
              permissions: []
            };
          }

          set({ user: userData, token, loading: false });
        } catch (err: any) {
          set({ loading: false });
          throw err;
        }
      }
    }),
    {
      name: 'sanle-auth',
      partialize: (state) => ({ user: state.user, token: state.token })
    }
  )
);
