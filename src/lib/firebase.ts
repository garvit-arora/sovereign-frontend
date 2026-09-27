import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, signOut, type User } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyCPOlKFtd7sx3n7saVuzMpSb7ctF0zTl7Y',
  authDomain: 'sovereign-76855.firebaseapp.com',
  projectId: 'sovereign-76855',
  storageBucket: 'sovereign-76855.firebasestorage.app',
  messagingSenderId: '467611822498',
  appId: '1:467611822498:web:2e192971c320100e1a6afb',
  measurementId: 'G-DQZWBW1L74',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

export function watchAuth(onUser: (user: User | null) => void) {
  return onAuthStateChanged(auth, onUser)
}

export async function getIdToken(): Promise<string | null> {
  await auth.authStateReady()
  const user = auth.currentUser
  if (!user) return null
  try {
    return await user.getIdToken()
  } catch {
    return null
  }
}

export async function logout(redirectTo = '/') {
  await signOut(auth)
  window.location.href = redirectTo
}
