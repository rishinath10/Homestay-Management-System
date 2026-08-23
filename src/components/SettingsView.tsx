import React, { useState, useEffect } from 'react';
import { Database, Trash2, RotateCcw, AlertTriangle, CheckCircle, ShieldAlert, Key, UserCheck, ChevronLeft, Menu } from 'lucide-react';
import { clearAllDatabaseCollections, resetSystemConfig, seedInitialSupabaseData, logActivity } from '../lib/supabase';
import { fetchAuthConfig, updateAuthConfig, setAccountPassword } from '../lib/auth';
import { Role } from '../types';

interface SettingsViewProps {
  activeRole: Role;
  userEmail: string;
  userName: string;
  onBackToCalendar?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  activeRole, 
  userEmail, 
  userName,
  onBackToCalendar,
  isSidebarOpen,
  onToggleSidebar
}) => {
  const [isClearing, setIsClearing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Administrator email configuration states
  const [superAdminEmail, setSuperAdminEmail] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Account password management
  const [pwTarget, setPwTarget] = useState<'super_admin' | 'owner'>('super_admin');
  const [pwValue, setPwValue] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [isSavingPw, setIsSavingPw] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      // The settings table holds password hashes and is not directly readable
      // with the anon key; this function returns only the non-secret fields.
      const { data, error } = await fetchAuthConfig();
      if (error) {
        console.warn('Failed to load settings config:', error);
        return;
      }
      if (data) {
        setSuperAdminEmail(data.superAdminEmail || '');
        setOwnerEmail(data.ownerEmail || '');
        setOwnerName(data.ownerName || '');
      }
    };
    fetchConfig();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (pwValue.length < 8) {
      setStatusMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    if (pwValue !== pwConfirm) {
      setStatusMessage({ type: 'error', text: 'The two passwords do not match.' });
      return;
    }

    setIsSavingPw(true);
    try {
      const result = await setAccountPassword(pwTarget, pwValue);
      if (!result.ok) {
        setStatusMessage({ type: 'error', text: result.error || 'Could not update the password.' });
        return;
      }

      await logActivity(
        userEmail, userName, activeRole,
        'Changed Account Password',
        `Target account: ${pwTarget === 'super_admin' ? 'Super Admin' : 'Owner'}`
      );

      setPwValue('');
      setPwConfirm('');
      setStatusMessage({
        type: 'success',
        text: `Password updated. Any device signed in as ${pwTarget === 'super_admin' ? 'Super Admin' : 'Owner'} will need to sign in again.`,
      });
    } finally {
      setIsSavingPw(false);
    }
  };

  if (activeRole !== 'super_admin' && activeRole !== 'owner') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xs max-w-md text-center">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
          <p className="text-sm text-gray-500 mt-2">Only Super Admins or Owners can access system database settings.</p>
        </div>
      </div>
    );
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!superAdminEmail || !ownerEmail || !ownerName) {
      alert('Please fill in all fields.');
      return;
    }
    setIsSavingConfig(true);
    setStatusMessage(null);
    try {
      const result = await updateAuthConfig({
        superAdminEmail,
        ownerEmail,
        ownerName,
      });

      if (!result.ok) {
        setStatusMessage({ type: 'error', text: result.error || 'Failed to update credentials configuration.' });
        return;
      }

      await logActivity(userEmail, userName, activeRole, 'Updated Administrator Email Config', `Super Admin: ${superAdminEmail}, Owner: ${ownerEmail}`);
      setStatusMessage({ type: 'success', text: 'Administrator credentials configuration updated successfully!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update credentials configuration.' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleClearSystem = async () => {
    if (confirmText.toLowerCase() !== 'clean') {
      alert('Please type "CLEAN" to confirm.');
      return;
    }

    setIsClearing(true);
    setStatusMessage(null);
    try {
      await logActivity(userEmail, userName, activeRole, 'Cleared System Database', 'All bookings, properties, staff, and logs cleared');
      await clearAllDatabaseCollections();
      setStatusMessage({ type: 'success', text: 'System database successfully cleared! You can now start entering your own homestays, staff, and bookings.' });
      setConfirmText('');
      setShowConfirmModal(false);
      
      // Reload page after a delay to refresh all listeners and state
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to clear system database.' });
    } finally {
      setIsClearing(false);
    }
  };

  const handleRestoreDemo = async () => {
    if (!window.confirm('This will seed the system with the default demo villas, staff, and sample bookings. Existing custom items might remain. Proceed?')) {
      return;
    }

    setIsSeeding(true);
    setStatusMessage(null);
    try {
      await resetSystemConfig();
      await seedInitialSupabaseData();
      await logActivity(userEmail, userName, activeRole, 'Restored Demo Data', 'Demo properties, staff, and bookings seeded');
      setStatusMessage({ type: 'success', text: 'Demo database successfully restored!' });
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to restore demo data.' });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-hidden select-none">
      {/* Desktop Header Control Bar */}
      <div className="hidden md:flex items-center justify-between py-3 px-4 bg-white border-b border-gray-250 shadow-2xs shrink-0">
        <div className="flex items-center space-x-3 shrink min-w-0">
          {!isSidebarOpen && onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-full transition-colors focus:outline-hidden shrink-0"
              title="Open Sidebar"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>
          )}

          {onBackToCalendar && (
            <button
              onClick={onBackToCalendar}
              className="flex items-center justify-center p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all border border-gray-200"
              title="Back to Calendar"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>
          )}

          <h1 className="text-base font-bold text-gray-800 truncate flex items-center space-x-2">
            <Database className="w-4.5 h-4.5 text-indigo-650" />
            <span>Database & System Settings</span>
          </h1>
        </div>
      </div>

      {/* Page Content Body */}
      <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          
          {/* Mobile Header Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col justify-between gap-4 md:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-6 h-6 text-indigo-650" />
                <h1 className="text-xl font-bold text-gray-900">System Settings</h1>
              </div>
            </div>
          </div>
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2.5">
            <Database className="w-6 h-6 text-indigo-600" />
            <span>Database & System Settings</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your homestay booking system database, purge demo entries, or reset data to enter your own.
          </p>
        </div>

        {statusMessage && (
          <div className={`p-4 rounded-2xl border flex items-start space-x-3 ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-sm">{statusMessage.type === 'success' ? 'Action Completed' : 'Operation Failed'}</p>
              <p className="text-xs mt-0.5 opacity-90">{statusMessage.text}</p>
              {statusMessage.type === 'success' && (
                <p className="text-[11px] text-emerald-600 font-medium mt-2">Refreshing application in a few seconds...</p>
              )}
            </div>
          </div>
        )}

        {/* Card 1: Admin & Owner Google Account Emails configuration */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-indigo-600 border-b border-gray-100 pb-3">
            <Key className="w-5 h-5" />
            <h3 className="text-base font-bold text-gray-900">Verify Administrator Google Emails</h3>
          </div>
          
          <p className="text-xs text-gray-500 leading-relaxed">
            Specify the Google Account email addresses authorized to log in as Super Admin and Owner. 
            Only these exact emails will be permitted access via Google Sign-In.
          </p>

          <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Super Admin Email</label>
              <input
                type="email"
                required
                value={superAdminEmail}
                onChange={(e) => setSuperAdminEmail(e.target.value)}
                placeholder="admin@pdvillas.com"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Owner Email</label>
              <input
                type="email"
                required
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="jeff.owner@gmail.com"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Owner Name</label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Jeff"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={isSavingConfig}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-98 disabled:opacity-50"
              >
                {isSavingConfig ? 'Saving...' : 'Update Verified Admins'}
              </button>
            </div>
          </form>
        </div>

        {/* Card 1b: Account passwords */}
        {activeRole === 'super_admin' && (
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-indigo-600 border-b border-gray-100 pb-3">
              <UserCheck className="w-5 h-5" />
              <h3 className="text-base font-bold text-gray-900">Change Account Password</h3>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Passwords are hashed inside the database and are never displayed
              anywhere in this system. Changing a password signs that account
              out on every device.
            </p>

            <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Account</label>
                <select
                  value={pwTarget}
                  onChange={(e) => setPwTarget(e.target.value as 'super_admin' | 'owner')}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={pwValue}
                  onChange={(e) => setPwValue(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingPw}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-98 disabled:opacity-50"
                >
                  {isSavingPw ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 2: Clean System */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Clean & Reset Database</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Purge all bookings, homestay villas (properties), staff logs, and notification archives. 
                Use this to wipe the pre-loaded demo data so you can begin inputting your actual business records.
              </p>
            </div>
            <button
              onClick={() => setShowConfirmModal(true)}
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-sm transition-transform active:scale-98"
            >
              Wipe System Data
            </button>
          </div>

          {/* Card 3: Restore Demo */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Restore Demo Environment</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Restore the default system setup, which seeds 5 luxury properties (Birds Nest, Nuri, The Bay, etc.), 2 staff accounts (Sue & Yati), and matching test bookings for this month. 
                Perfect for quick training or testing.
              </p>
            </div>
            <button
              onClick={handleRestoreDemo}
              disabled={isSeeding}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition-transform active:scale-98 disabled:opacity-50"
            >
              {isSeeding ? 'Restoring...' : 'Restore Demo Data'}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-900 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Important Notes on Verification</p>
            <ul className="list-disc pl-4 space-y-1 opacity-90 text-[11px]">
              <li>Only Google accounts matching these configured emails will be granted Super Admin or Owner privileges.</li>
              <li>To authorize Staff (like Sue or Yati), manage their emails directly under the <span className="font-semibold">Staff</span> tab using the Add Staff/Register Account panel.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-gray-200 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-gray-900">Are you absolutely sure?</h3>
            </div>
            
            <p className="text-xs text-gray-600 leading-relaxed">
              This action will permanently delete all records (villas, bookings, staff, logs) from your Supabase database. 
              This cannot be undone.
            </p>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                Type <span className="text-red-600 font-extrabold">CLEAN</span> below to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="CLEAN"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmText('');
                }}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleClearSystem}
                disabled={isClearing || confirmText.toLowerCase() !== 'clean'}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-400 text-white font-bold text-xs rounded-xl shadow-md"
              >
                {isClearing ? 'Clearing...' : 'Confirm Wipe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
