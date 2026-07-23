import React, { useState, useEffect } from 'react';
import { Database, Trash2, RotateCcw, AlertTriangle, CheckCircle, ShieldAlert, Key, UserCheck } from 'lucide-react';
import { db, clearAllDatabaseCollections, resetSystemConfig, seedInitialFirestoreData, logActivity } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Role } from '../types';

interface SettingsViewProps {
  activeRole: Role;
  userEmail: string;
  userName: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ activeRole, userEmail, userName }) => {
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

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'auth_config'));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          setSuperAdminEmail(data.superAdminEmail || 'rishinathsai@gmail.com');
          setOwnerEmail(data.ownerEmail || 'pdholidayvillas@gmail.com');
          setOwnerName(data.ownerName || 'Jeff');
        } else {
          setSuperAdminEmail('rishinathsai@gmail.com');
          setOwnerEmail('pdholidayvillas@gmail.com');
          setOwnerName('Jeff');
        }
      } catch (err) {
        console.warn('Failed to load settings config:', err);
      }
    };
    fetchConfig();
  }, []);

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
      await setDoc(doc(db, 'settings', 'auth_config'), {
        superAdminEmail: superAdminEmail.toLowerCase().trim(),
        ownerEmail: ownerEmail.toLowerCase().trim(),
        ownerName: ownerName.trim()
      }, { merge: true });
      
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
      await seedInitialFirestoreData();
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
    <div className="flex-1 overflow-y-auto p-6 bg-gray-50 select-none">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
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

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-gray-200 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-gray-900">Are you absolutely sure?</h3>
            </div>
            
            <p className="text-xs text-gray-600 leading-relaxed">
              This action will permanently delete all records (villas, bookings, staff, logs) from your Firestore database. 
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
