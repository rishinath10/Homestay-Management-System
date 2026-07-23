import React, { useState } from 'react';
import { Mail, Lock, ShieldAlert, LogIn, Key, Compass } from 'lucide-react';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Role, Staff } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: { email: string; name: string; role: Role; staffObj: Staff | null }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Check if they are Super Admin
      let adminEmail = 'admin@pdvillas.com';
      let adminPassword = 'admin123';

      try {
        const settingsRef = doc(db, 'settings', 'auth_config');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          adminEmail = data.superAdminEmail || adminEmail;
          adminPassword = data.superAdminPassword || adminPassword;
        }
      } catch (err) {
        console.warn('Could not load settings from Firestore, using default admin credentials:', err);
      }

      if (email.toLowerCase() === adminEmail.toLowerCase() && password === adminPassword) {
        onLoginSuccess({
          email: adminEmail,
          name: 'Super Admin',
          role: 'super_admin',
          staffObj: null
        });
        setIsLoading(false);
        return;
      }

      // 1.5. Check if they are Owner (Jeff)
      let ownerEmail = 'jeff.owner@gmail.com';
      let ownerPassword = 'jeff123';
      let ownerName = 'Jeff';

      try {
        const settingsRef = doc(db, 'settings', 'auth_config');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          ownerEmail = data.ownerEmail || ownerEmail;
          ownerPassword = data.ownerPassword || ownerPassword;
          ownerName = data.ownerName || ownerName;
        }
      } catch (err) {
        console.warn('Could not load settings from Firestore, using default owner credentials:', err);
      }

      if (email.toLowerCase() === ownerEmail.toLowerCase() && password === ownerPassword) {
        onLoginSuccess({
          email: ownerEmail,
          name: ownerName,
          role: 'owner',
          staffObj: null
        });
        setIsLoading(false);
        return;
      }

      // 2. Check if they are Staff
      const staffQuery = query(collection(db, 'staff'), where('email', '==', email.toLowerCase()));
      const staffSnap = await getDocs(staffQuery);

      if (!staffSnap.empty) {
        const staffDoc = staffSnap.docs[0];
        const staffData = staffDoc.data() as Staff;
        
        if (staffData.password === password) {
          onLoginSuccess({
            email: staffData.email,
            name: staffData.name,
            role: 'staff',
            staffObj: { ...staffData, id: staffDoc.id }
          });
          setIsLoading(false);
          return;
        } else {
          setError('Incorrect password for staff account.');
          setIsLoading(false);
          return;
        }
      }

      // If it reaches here, it's not a valid custom login
      setError('Invalid email address or password.');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userEmail = user.email?.toLowerCase();

      if (!userEmail) {
        setError('Google account email could not be retrieved.');
        setIsLoading(false);
        return;
      }

      // 1. Check if they are the Owner (Jeff)
      let ownerEmail = 'jeff.owner@gmail.com';
      let ownerName = 'Jeff';
      let adminEmail = 'admin@pdvillas.com';

      try {
        const settingsRef = doc(db, 'settings', 'auth_config');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          ownerEmail = (data.ownerEmail || ownerEmail).toLowerCase();
          ownerName = data.ownerName || ownerName;
          adminEmail = (data.superAdminEmail || adminEmail).toLowerCase();
        }
      } catch (err) {
        console.warn('Could not load settings from Firestore, using default config:', err);
      }

      if (userEmail === ownerEmail) {
        onLoginSuccess({
          email: userEmail,
          name: ownerName,
          role: 'owner',
          staffObj: null
        });
        setIsLoading(false);
        return;
      }

      // 2. Check if they are Super Admin logging in via Google
      if (userEmail === adminEmail) {
        onLoginSuccess({
          email: userEmail,
          name: 'Super Admin',
          role: 'super_admin',
          staffObj: null
        });
        setIsLoading(false);
        return;
      }

      // 3. Check if they are Staff
      const staffQuery = query(collection(db, 'staff'), where('email', '==', userEmail));
      const staffSnap = await getDocs(staffQuery);

      if (!staffSnap.empty) {
        const staffDoc = staffSnap.docs[0];
        const staffData = staffDoc.data() as Staff;
        
        onLoginSuccess({
          email: staffData.email,
          name: staffData.name,
          role: 'staff',
          staffObj: { ...staffData, id: staffDoc.id }
        });
        setIsLoading(false);
        return;
      }

      // If they are not registered
      await auth.signOut();
      setError(`Access Denied: The Google account (${userEmail}) is not authorized in this system. Please contact the Super Admin.`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during Google sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-linear-to-br from-gray-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl border border-white/15 p-8 shadow-2xl relative overflow-hidden flex flex-col space-y-6">
        {/* Decorative Background Gradients */}
        <div className="absolute top-0 -left-10 w-44 h-44 rounded-full bg-blue-500/20 blur-3xl -z-10"></div>
        <div className="absolute bottom-0 -right-10 w-44 h-44 rounded-full bg-purple-500/20 blur-3xl -z-10"></div>

        {/* Logo and Title */}
        <div className="text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-lg mb-4">
            <Compass className="w-8 h-8 text-white animate-spin-slow" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">PD Holiday Villas</h1>
          <p className="text-xs text-slate-300 mt-1">Homestay Reservation & Staff Control Center</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start space-x-3 text-red-200 text-xs leading-relaxed animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pdvillas.com"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 focus:border-blue-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:bg-white/10 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 focus:border-blue-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:bg-white/10 transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl flex items-center justify-center space-x-2 shadow-lg transition-transform active:scale-98 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{isLoading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        <div className="relative flex items-center justify-center my-2">
          <div className="border-t border-white/10 w-full"></div>
          <span className="absolute bg-slate-900 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">or</span>
        </div>

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          disabled={isLoading}
          className="w-full py-3 bg-white hover:bg-slate-50 text-slate-900 font-bold text-sm rounded-xl flex items-center justify-center space-x-2.5 shadow-md transition-transform active:scale-98 disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Sign In with Gmail / Google</span>
        </button>

        {/* Footer Info */}
        <div className="text-center pt-2 border-t border-white/5 flex flex-col space-y-1">
          <p className="text-[10px] text-slate-400 font-semibold">
            Super Admin Credentials: <span className="text-blue-400">admin@pdvillas.com</span> / <span className="text-blue-400">admin123</span>
          </p>
          <p className="text-[9px] text-slate-500 font-medium">
            Owner (Jeff) and registered staffs must log in using Google Auth.
          </p>
        </div>
      </div>
    </div>
  );
};
