/**
 * Customer Authentication & Profile Store
 * 
 * Fully integrated with Firebase Client SDK (Email/Password, Google OAuth, Session Persistence)
 * and synced with canonical Hostinger MySQL / Native REST API backend.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  apiCustomerLogin,
  apiCustomerRegister,
  apiCustomerOrderSession,
  apiSetPassword,
  getCustomerProfile,
  setCustomerToken,
  clearCustomerToken,
  getCustomerToken,
} from '@/lib/api';
import {
  auth,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  formatFirebaseAuthError,
  isFirebaseAuthAvailable,
  updateProfile as updateFirebaseProfile,
  type User as FirebaseUser,
} from '@/lib/firebase';

export interface CustomerUser {
  uid: string;
  id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  ndisNumber?: string;
  planType?: 'plan_managed' | 'self_managed' | 'ndia_managed';
  planManager?: string;
  planManagerEmail?: string;
  photoURL?: string;
  isRegistered: boolean;
  // False only for checkout auto-created accounts that have not set a password yet
  hasPassword?: boolean;
  authProvider?: 'firebase' | 'email' | 'google';
  createdAt: string;
}

interface AuthState {
  user: CustomerUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  signIn: (email: string, pass: string) => Promise<boolean>;
  signUp: (data: {
    email: string;
    pass: string;
    name: string;
    phone?: string;
    ndisNumber?: string;
    planType?: 'plan_managed' | 'self_managed' | 'ndia_managed';
    planManager?: string;
    planManagerEmail?: string;
    address?: string;
    city?: string;
    state?: string;
    postcode?: string;
  }) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<CustomerUser>) => void;
  // Activates a checkout-created account by setting its password (backend +
  // Firebase link). The session persists until explicit sign-out.
  setAccountPassword: (pass: string, orderRef?: string) => Promise<{ success: boolean; message: string }>;
  autoRegisterFromOrder: (data: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    postcode?: string;
    ndisNumber?: string;
    planType?: 'plan_managed' | 'self_managed' | 'ndia_managed';
    planManager?: string;
    planManagerEmail?: string;
  }) => Promise<CustomerUser>;
  clearError: () => void;
  initListener: () => () => void;
}

export const useAuthStore = create<AuthState>()(persist((set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      signIn: async (email: string, pass: string) => {
        set({ isLoading: true, error: null });
        const cleanEmail = email.toLowerCase().trim();

        // 1. Try Firebase Authentication First (skipped when unconfigured)
        let firebaseSuccess = false;
        if (isFirebaseAuthAvailable()) {
          try {
            const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
          if (userCredential && userCredential.user) {
            const fbUser = userCredential.user;
            const existingUser = get().user;
            const userData: CustomerUser = {
              uid: fbUser.uid,
              id: fbUser.uid,
              name: fbUser.displayName || existingUser?.name || cleanEmail.split('@')[0],
              email: fbUser.email || cleanEmail,
              phone: fbUser.phoneNumber || existingUser?.phone || '',
              photoURL: fbUser.photoURL || undefined,
              address: existingUser?.address || '',
              city: existingUser?.city || '',
              state: existingUser?.state || 'VIC',
              postcode: existingUser?.postcode || '',
              ndisNumber: existingUser?.ndisNumber || '',
              planType: existingUser?.planType || 'plan_managed',
              planManager: existingUser?.planManager || '',
              planManagerEmail: existingUser?.planManagerEmail || '',
              isRegistered: true,
              hasPassword: true,
              authProvider: 'firebase',
              createdAt: existingUser?.createdAt || new Date().toISOString(),
            };
            set({ user: userData, isAuthenticated: true, isLoading: false, error: null });
            firebaseSuccess = true;

            // Also attempt background sync with backend token if API endpoint is active
            apiCustomerLogin(cleanEmail, pass).catch(() => {});
            return true;
          }
        } catch (fbErr: any) {
          // If Firebase has a configuration issue (e.g. no API key set in dev), fall back to REST backend
          const code = fbErr?.code || '';
          if (code === 'auth/api-key-not-valid' || code === 'auth/invalid-api-key' || code === 'auth/configuration-not-found') {
            console.info('[Auth] Firebase apiKey unconfigured, falling back to REST API login.');
          } else if (code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
            // Also try REST backend in case user was registered in local MySQL
          } else {
            console.warn('[Firebase Auth]', fbErr);
          }
          }
        }

        if (firebaseSuccess) return true;

        // 2. Fallback to REST API Authentication
        try {
          const res = await apiCustomerLogin(cleanEmail, pass);
          if (res.success && res.token) {
            const prevUser = get().user;
            const userData: CustomerUser = {
              ...prevUser,
              // Fresh login facts always win over any stale cached profile
              uid: String(res.user.id || `CUST-${Date.now()}`),
              id: String(res.user.id || `CUST-${Date.now()}`),
              name: res.user.name || cleanEmail.split('@')[0],
              email: cleanEmail,
              phone: (res.user as any).phone || prevUser?.phone || '',
              ndisNumber: (res.user as any).ndisNumber || prevUser?.ndisNumber || '',
              planType: (res.user as any).planType || prevUser?.planType || 'plan_managed',
              isRegistered: true,
              hasPassword: (res.user as any).hasPassword ?? prevUser?.hasPassword ?? true,
              authProvider: 'email',
              createdAt: prevUser?.createdAt || new Date().toISOString(),
            };
            set({ user: userData, isAuthenticated: true, isLoading: false, error: null });
            return true;
          }
          throw new Error('Invalid email or password.');
        } catch (err: any) {
          const errMsg = err.message || 'Failed to sign in. Please verify your credentials.';
          set({ isLoading: false, error: errMsg, isAuthenticated: false, user: null });
          clearCustomerToken();
          return false;
        }
      },

      signUp: async (data) => {
        set({ isLoading: true, error: null });
        const cleanEmail = data.email.toLowerCase().trim();

        // 1. Try Firebase Authentication Registration (skipped when unconfigured)
        let fbUid = '';
        if (isFirebaseAuthAvailable()) {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, data.pass);
            if (userCredential && userCredential.user) {
              fbUid = userCredential.user.uid;
              try {
                await updateFirebaseProfile(userCredential.user, { displayName: data.name });
              } catch (profileErr) {
                console.warn('[Firebase Profile Update]', profileErr);
              }
            }
          } catch (fbErr: any) {
            const code = fbErr?.code || '';
            if (code === 'auth/email-already-in-use') {
              console.info('[Firebase SignUp] Email already in use in Firebase, continuing with backend sync');
            } else if (code === 'auth/weak-password' || code === 'auth/invalid-email') {
              const formatted = formatFirebaseAuthError(fbErr);
              set({ isLoading: false, error: formatted });
              return false;
            } else {
              console.warn('[Firebase SignUp]', fbErr);
            }
          }
        }

        // 2. Always persist to REST / MySQL Backend
        try {
          const res = await apiCustomerRegister({
            name: data.name,
            email: cleanEmail,
            password: data.pass,
            phone: data.phone,
            ndisNumber: data.ndisNumber,
            planType: data.planType,
            planManager: data.planManager,
            planManagerEmail: data.planManagerEmail,
            address: data.address,
            city: data.city,
            state: data.state,
            postcode: data.postcode,
          });

          const userId = fbUid || (res.user ? String(res.user.id) : `CUST-${Date.now()}`);
          const newUser: CustomerUser = {
            uid: userId,
            id: userId,
            name: data.name,
            email: cleanEmail,
            phone: data.phone || '',
            ndisNumber: data.ndisNumber || '',
            planType: data.planType || 'plan_managed',
            planManager: data.planManager || '',
            planManagerEmail: data.planManagerEmail || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || 'VIC',
            postcode: data.postcode || '',
            isRegistered: true,
            hasPassword: true,
            authProvider: fbUid ? 'firebase' : 'email',
            createdAt: new Date().toISOString(),
          };

          set({ user: newUser, isAuthenticated: true, isLoading: false, error: null });
          return true;
        } catch (err: any) {
          // If backend had an error but Firebase succeeded, still let the user in
          if (fbUid) {
            const newUser: CustomerUser = {
              uid: fbUid,
              id: fbUid,
              name: data.name,
              email: cleanEmail,
              phone: data.phone || '',
              ndisNumber: data.ndisNumber || '',
              planType: data.planType || 'plan_managed',
              isRegistered: true,
              hasPassword: true,
              authProvider: 'firebase',
              createdAt: new Date().toISOString(),
            };
            set({ user: newUser, isAuthenticated: true, isLoading: false, error: null });
            return true;
          }

          const errMsg = err.message || 'Failed to register account.';
          set({ isLoading: false, error: errMsg });
          return false;
        }
      },

      signInWithGoogle: async () => {
        set({ isLoading: true, error: null });
        try {
          const result = await signInWithPopup(auth, googleProvider);
          if (result && result.user) {
            const fbUser = result.user;
            const existingUser = get().user;
            const userData: CustomerUser = {
              uid: fbUser.uid,
              id: fbUser.uid,
              name: fbUser.displayName || 'Google User',
              email: fbUser.email || '',
              phone: fbUser.phoneNumber || existingUser?.phone || '',
              photoURL: fbUser.photoURL || undefined,
              address: existingUser?.address || '',
              city: existingUser?.city || '',
              state: existingUser?.state || 'VIC',
              postcode: existingUser?.postcode || '',
              ndisNumber: existingUser?.ndisNumber || '',
              planType: existingUser?.planType || 'plan_managed',
              planManager: existingUser?.planManager || '',
              planManagerEmail: existingUser?.planManagerEmail || '',
              isRegistered: true,
              hasPassword: true,
              authProvider: 'google',
              createdAt: existingUser?.createdAt || new Date().toISOString(),
            };
            set({ user: userData, isAuthenticated: true, isLoading: false, error: null });
            // Also sync customer session to canonical backend
            apiCustomerOrderSession({
              name: userData.name,
              email: userData.email,
              phone: userData.phone,
            }).catch((err) => console.warn('[Google Auth Sync Notice]', err));
            return true;
          }
          throw new Error('Google sign-in was cancelled or returned no credentials.');
        } catch (err: any) {
          const formatted = formatFirebaseAuthError(err);
          set({ isLoading: false, error: formatted });
          return false;
        }
      },

      sendPasswordReset: async (email: string) => {
        const cleanEmail = email.toLowerCase().trim();
        if (!cleanEmail || !cleanEmail.includes('@')) {
          return { success: false, message: 'Please enter a valid email address.' };
        }
        try {
          await sendPasswordResetEmail(auth, cleanEmail);
          return {
            success: true,
            message: `Password reset email sent to ${cleanEmail}. Please check your inbox and spam folder.`,
          };
        } catch (err: any) {
          const formatted = formatFirebaseAuthError(err);
          return { success: false, message: formatted };
        }
      },

      signOut: async () => {
        try {
          await firebaseSignOut(auth);
        } catch {
          // ignore
        }
        clearCustomerToken();
        set({ user: null, isAuthenticated: false, error: null });
      },

      updateProfile: (data) => {
        const currentUser = get().user;
        if (!currentUser) return;
        set({ user: {...currentUser,...data } });
      },

      setAccountPassword: async (pass: string, orderRef?: string) => {
        const currentUser = get().user;
        if (!currentUser?.email) {
          return { success: false, message: 'No account session found. Please check out again or sign in.' };
        }
        if (!pass || pass.length < 8 || pass.length > 128) {
          return { success: false, message: 'Password must be between 8 and 128 characters.' };
        }
        const cleanEmail = currentUser.email.toLowerCase().trim();
        set({ isLoading: true, error: null });
        try {
          // 1. Link Firebase auth as well so email/password sign-in works
          // everywhere — skipped silently when Firebase isn't configured
          // (backend remains the canonical account store).
          if (isFirebaseAuthAvailable()) {
            try {
              const uc = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
              if (uc?.user && currentUser.name) {
                try {
                  await updateFirebaseProfile(uc.user, { displayName: currentUser.name });
                } catch (pErr) {
                  console.warn('[Firebase Profile Update]', pErr);
                }
              }
            } catch (fbErr: any) {
              const code = fbErr?.code || '';
              // Already exists in Firebase (e.g. prior signup) — verify it instead
              if (code === 'auth/email-already-in-use') {
                try {
                  const signedIn = await signInWithEmailAndPassword(auth, cleanEmail, pass);
                  if (signedIn?.user && currentUser.name) {
                    await updateFirebaseProfile(signedIn.user, { displayName: currentUser.name });
                  }
                } catch {
                  // Firebase copy has a different password; backend remains canonical
                }
              } else if (code !== 'auth/api-key-not-valid' && code !== 'auth/invalid-api-key' && code !== 'auth/configuration-not-found') {
                console.info('[Firebase SetPassword]', code || fbErr?.message);
              }
            }
          }

          // 2. Canonical backend activation (ownership proven by live session
          // token, falling back to the fresh order/quote reference)
          const res = await apiSetPassword({ email: cleanEmail, password: pass, orderId: orderRef });
          set({
            user: { ...currentUser, hasPassword: true, isRegistered: true },
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return { success: true, message: 'Password created. Your account is now fully activated.' };
        } catch (err: any) {
          const msg = err?.message || 'Could not create password. Please try again.';
          set({ isLoading: false, error: msg });
          return { success: false, message: msg };
        }
      },

      autoRegisterFromOrder: async (data) => {
        const cleanEmail = data.email.toLowerCase().trim();
        const existing = get().user;

        // If user is already logged in with this email, enrich their profile with any newly provided details
        if (existing && existing.email.toLowerCase() === cleanEmail) {
          const updated: CustomerUser = {
            ...existing,
            name: data.name || existing.name,
            phone: data.phone || existing.phone,
            address: data.address || existing.address,
            city: data.city || existing.city,
            state: data.state || existing.state,
            postcode: data.postcode || existing.postcode,
            ndisNumber: data.ndisNumber || existing.ndisNumber,
            planType: data.planType || existing.planType,
            planManager: data.planManager || existing.planManager,
            planManagerEmail: data.planManagerEmail || existing.planManagerEmail,
          };
          set({ user: updated, isAuthenticated: true, error: null });
          apiCustomerOrderSession({...data, email: cleanEmail }).catch(() => {});
          return updated;
        }

        // Auto-create/sync customer account with backend.
        // New checkout accounts have NO password yet (hasPassword=false) — the
        // account stays open until sign-out, but must be activated via
        // setAccountPassword before it fully works.
        let customerId = `CUST-${Date.now()}`;
        let sessionHasPassword = false;
        try {
          const res = await apiCustomerOrderSession({
            name: data.name,
            email: cleanEmail,
            phone: data.phone,
            address: data.address,
            city: data.city,
            state: data.state,
            postcode: data.postcode,
            ndisNumber: data.ndisNumber,
            planType: data.planType,
            planManager: data.planManager,
            planManagerEmail: data.planManagerEmail,
          });
          if (res?.user?.id) {
            customerId = String(res.user.id);
          }
          sessionHasPassword = (res as any)?.user?.hasPassword ?? false;
        } catch (apiErr) {
          console.warn('[Auth] Auto customer session API notice:', apiErr);
        }

        const newUser: CustomerUser = {
          uid: customerId,
          id: customerId,
          name: data.name,
          email: cleanEmail,
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || 'VIC',
          postcode: data.postcode || '',
          ndisNumber: data.ndisNumber || '',
          planType: data.planType || 'plan_managed',
          planManager: data.planManager || '',
          planManagerEmail: data.planManagerEmail || '',
          isRegistered: true,
          hasPassword: sessionHasPassword,
          authProvider: 'email',
          createdAt: new Date().toISOString(),
        };

        set({ user: newUser, isAuthenticated: true, isLoading: false, error: null });
        return newUser;
      },

      clearError: () => set({ error: null }),

      initListener: () => {
        // Listen to Firebase Auth state
        const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
          if (fbUser) {
            const existing = get().user;
            if (!existing || existing.email !== fbUser.email) {
              set({
                user: {
                  uid: fbUser.uid,
                  id: fbUser.uid,
                  name: fbUser.displayName || existing?.name || fbUser.email?.split('@')[0] || 'Valued Client',
                  email: fbUser.email || '',
                  phone: fbUser.phoneNumber || existing?.phone || '',
                  photoURL: fbUser.photoURL || undefined,
                  address: existing?.address || '',
                  city: existing?.city || '',
                  state: existing?.state || 'VIC',
                  postcode: existing?.postcode || '',
                  ndisNumber: existing?.ndisNumber || '',
                  planType: existing?.planType || 'plan_managed',
                  isRegistered: true,
                  hasPassword: true,
                  authProvider: 'firebase',
                  createdAt: existing?.createdAt || new Date().toISOString(),
                },
                isAuthenticated: true,
              });
            }
          }
        });

        // Also check existing REST API customer token (session survives reloads
        // until explicit sign-out; token itself is valid for 30 days)
        const token = getCustomerToken();
        if (token && !get().user) {
          getCustomerProfile()
            .then((res) => {
              if (res.success && res.user) {
                const prev = get().user;
                set({
                  user: {
                    ...prev,
                    uid: String(res.user.id),
                    id: String(res.user.id),
                    name: res.user.name,
                    email: res.user.email,
                    isRegistered: true,
                    hasPassword: (res.user as any).hasPassword ?? prev?.hasPassword ?? true,
                    createdAt: prev?.createdAt || new Date().toISOString(),
                  },
                  isAuthenticated: true,
                });
              }
            })
            .catch(() => {
              // Token invalid
            });
        }

        return () => {
          unsubscribe();
        };
      },
    }),
    {
      name: 'at_specialists_customer_auth_canonical_v5',
      storage: createJSONStorage(() => localStorage),
    }));
