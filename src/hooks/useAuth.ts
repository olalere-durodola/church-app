import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, isAdmin: false, loading: true });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        setState({ user, isAdmin: adminDoc.exists(), loading: false });
      } else {
        setState({ user: null, isAdmin: false, loading: false });
      }
    });
    return unsubscribe;
  }, []);

  const logout = () => signOut(auth);

  return { ...state, logout };
}
