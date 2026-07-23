import React, { useState } from 'react';
import { ShieldAlert, Compass, Calendar } from 'lucide-react';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Role, Staff } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: { email: string; name: string; role: Role; staffObj: Staff | null }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      let ownerEmail = 'pdholidayvillas@gmail.com';
      let ownerName = 'Jeff';
      let adminEmail = 'rishinathsai@gmail.com';

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
    <div className="min-h-screen w-screen bg-gray-50 flex items-center justify-center p-4 select-none">
      <div className="max-w-md w-full bg-white rounded-3xl border border-gray-200 p-8 shadow-md relative overflow-hidden flex flex-col space-y-6">
        
        {/* Soft Background Decorative Blobs */}
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-blue-500/5 blur-3xl -z-10"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-indigo-500/5 blur-3xl -z-10"></div>

        {/* Logo and Title */}
        <div className="text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-sm mb-4">
            <Compass className="w-8 h-8 text-white animate-spin-slow" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">PD Holiday Villas</h1>
          <p className="text-xs text-gray-500 mt-1">Homestay Reservation & Staff Control Center</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3 text-red-800 text-xs leading-relaxed animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-900 flex items-start space-x-2.5">
          <Calendar className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Welcome to the PD Homestay Portal. Access to this management suite requires a registered Google Account.
          </p>
        </div>

        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          disabled={isLoading}
          className="w-full py-3.5 bg-white hover:bg-gray-50 active:scale-98 text-gray-800 border border-gray-200 font-bold text-sm rounded-xl flex items-center justify-center space-x-3 shadow-xs transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
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
          )}
          <span>{isLoading ? 'Verifying...' : 'Sign In with Google'}</span>
        </button>

        {/* Footer Info */}
        <div className="text-center pt-2 border-t border-gray-100 flex flex-col space-y-1">
          <p className="text-[10px] text-gray-400 font-semibold">
            Super Admin, Owner, and staff members must authenticate using authorized Google accounts.
          </p>
        </div>
      </div>
    </div>
  );
};
