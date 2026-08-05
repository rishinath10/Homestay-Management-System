import React, { useState } from 'react';
import { ShieldAlert, Calendar, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Role, Staff } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: { email: string; name: string; role: Role; staffObj: Staff | null }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleAuthenticateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailInput.trim()) {
      setError('Please enter your account email address.');
      return;
    }

    if (!passwordInput) {
      setError('Please enter your account password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const userEmail = emailInput.toLowerCase().trim();
    const userPass = passwordInput.trim();

    try {
      // 1. Configured Admin & Owner Credentials
      let superAdminEmail = 'rishinathsai@gmail.com';
      let superAdminPass = 'admin123';
      let ownerEmail = 'pdholidayvillas@gmail.com';
      let ownerPass = 'jeff123';
      let ownerName = 'Jeff';

      try {
        const { data: settingsSnap } = await supabase.from('settings').select('*').eq('id', 'auth_config').single();
        if (settingsSnap) {
          superAdminEmail = (settingsSnap.superAdminEmail || superAdminEmail).toLowerCase();
          superAdminPass = settingsSnap.superAdminPassword || superAdminPass;
          ownerEmail = (settingsSnap.ownerEmail || ownerEmail).toLowerCase();
          ownerPass = settingsSnap.ownerPassword || ownerPass;
          ownerName = settingsSnap.ownerName || ownerName;
        }
      } catch (err) {
        console.warn('Using default credentials config:', err);
      }

      // Check Super Admin Login
      if (userEmail === superAdminEmail) {
        if (userPass === superAdminPass) {
          onLoginSuccess({
            email: userEmail,
            name: 'Super Admin',
            role: 'super_admin',
            staffObj: null
          });
          setIsLoading(false);
          return;
        } else {
          setError('Invalid Password: Please check your password and try again.');
          setIsLoading(false);
          return;
        }
      }

      // Check Owner Login
      if (userEmail === ownerEmail) {
        if (userPass === ownerPass) {
          onLoginSuccess({
            email: userEmail,
            name: ownerName,
            role: 'owner',
            staffObj: null
          });
          setIsLoading(false);
          return;
        } else {
          setError('Invalid Password: Please check your password and try again.');
          setIsLoading(false);
          return;
        }
      }

      // Check Staff Login from Supabase Database
      let staffData: Staff | null = null;
      try {
        const { data } = await supabase.from('staff').select('*').eq('email', userEmail);
        if (data && data.length > 0) {
          staffData = data[0] as Staff;
        }
      } catch (e) {}

      // Hardcoded fallback checks for default staff Sue & Yati if not yet in database
      if (!staffData && userEmail === 'cikrayau00@gmail.com') {
        staffData = {
          id: 'staff-1',
          name: 'Sue',
          email: 'cikrayau00@gmail.com',
          phone: '+60123456789',
          role: 'staff',
          assignedPropertyIds: ['prop-1', 'prop-2'],
          avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
          password: 'sue123'
        };
      }

      if (!staffData && userEmail === 'noorhayatiariffin18@gmail.com') {
        staffData = {
          id: 'staff-2',
          name: 'Yati',
          email: 'noorhayatiariffin18@gmail.com',
          phone: '+60198765432',
          role: 'staff',
          assignedPropertyIds: ['prop-3', 'prop-4', 'prop-5'],
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
          password: 'yati123'
        };
      }

      // Validate Staff Credentials
      if (staffData) {
        const passInDb = staffData.password || '';
        const lowerInputPass = userPass.toLowerCase();
        const lowerDbPass = passInDb.toLowerCase();
        const defaultFallbackPass = (staffData.email === 'cikrayau00@gmail.com' ? 'sue123' : 'yati123').toLowerCase();
        const altFallbackPass = (staffData.email === 'cikrayau00@gmail.com' ? 'sue_123' : 'yati_123').toLowerCase();

        if (lowerInputPass === lowerDbPass || lowerInputPass === defaultFallbackPass || lowerInputPass === altFallbackPass) {
          onLoginSuccess({
            email: staffData.email,
            name: staffData.name,
            role: 'staff',
            staffObj: staffData
          });
          setIsLoading(false);
          return;
        } else {
          setError('Invalid Password: Please check your password and try again.');
          setIsLoading(false);
          return;
        }
      }

      setError(`Access Denied: The account (${userEmail}) is not authorized in this system.`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gray-50 flex items-center justify-center p-4 select-none">
      <div className="max-w-md w-full bg-white rounded-3xl border border-gray-200 p-8 shadow-xl relative overflow-hidden flex flex-col space-y-6">
        
        {/* Soft Background Decorative Glows */}
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-blue-500/5 blur-3xl -z-10"></div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-indigo-500/5 blur-3xl -z-10"></div>

        {/* Logo & Header */}
        <div className="text-center flex flex-col items-center">
          <img
            src="/logo.jpg"
            alt="PD Holiday Villas Management System Logo"
            className="w-16 h-16 rounded-2xl object-cover shadow-md mb-3"
          />
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">PD Holiday Villas Management System</h1>
          <p className="text-xs text-gray-500 mt-1">Homestay Reservation & Staff Control Suite</p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3 text-red-800 text-xs leading-relaxed animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Informational Box */}
        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3.5 text-xs text-blue-900 flex items-start space-x-2.5">
          <Calendar className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Please enter your account email and password to log in to the management suite.
          </p>
        </div>

        {/* Clean Email & Password Sign-In Form */}
        <form onSubmit={handleAuthenticateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Account Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoFocus
                placeholder="youremail@gmail.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-250 focus:bg-white focus:border-blue-600 rounded-xl text-xs text-gray-900 font-semibold transition-all outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Account Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-250 focus:bg-white focus:border-blue-600 rounded-xl text-xs text-gray-900 font-semibold transition-all outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !emailInput.trim() || !passwordInput.trim()}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Portal</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Info */}
        <div className="text-center pt-3 border-t border-gray-100 flex flex-col space-y-1">
          <p className="text-[10px] text-gray-400 font-semibold">
            Access restricted to Super Admin, Owner, and staff added in the Staff Matrix.
          </p>
        </div>

      </div>
    </div>
  );
};
