import React, { useState, useEffect } from 'react';
import { Staff, Property, Role, ActivityLog } from '../types';
import { 
  Users, Shield, Check, Lock, Phone, Mail, CheckSquare, Square, 
  AlertCircle, Trash2, Plus, Key, History, Eye, EyeOff, UserCheck 
} from 'lucide-react';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, logActivity } from '../lib/firebase';
import { format } from 'date-fns';

interface StaffMatrixViewProps {
  staffList: Staff[];
  properties: Property[];
  onUpdateStaffPropertyAccess: (staffId: string, propertyIds: string[]) => Promise<void>;
  activeRole: Role;
}

export const StaffMatrixView: React.FC<StaffMatrixViewProps> = ({
  staffList,
  properties,
  onUpdateStaffPropertyAccess,
  activeRole
}) => {
  const isSuperAdmin = activeRole === 'super_admin';

  // Add Staff form states
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffAvatarUrl, setNewStaffAvatarUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Inline edit states
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingStaffPassword, setEditingStaffPassword] = useState('');

  // Activity logs state
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [showLogs, setShowLogs] = useState(true);

  // Fetch activity logs in real-time
  useEffect(() => {
    const q = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
      setLogs(logsData);
    });
    return () => unsub();
  }, []);

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newStaffName || !newStaffEmail || !newStaffPhone || !newStaffPassword) {
      setFormError('Please fill in all required fields.');
      return;
    }

    // Check if email already exists
    if (staffList.some(s => s.email.toLowerCase() === newStaffEmail.toLowerCase())) {
      setFormError('A staff member with this email already exists.');
      return;
    }

    try {
      const newStaffId = `staff-${Date.now()}`;
      const defaultAvatar = `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 900000000)}?auto=format&fit=crop&w=150&q=80`;
      
      const newStaff: Staff = {
        id: newStaffId,
        name: newStaffName,
        email: newStaffEmail.toLowerCase(),
        phone: newStaffPhone,
        password: newStaffPassword,
        role: 'staff',
        assignedPropertyIds: [],
        avatarUrl: newStaffAvatarUrl || defaultAvatar,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'staff', newStaffId), newStaff);
      
      // Log Activity
      await logActivity(
        'admin@pdvillas.com',
        'Super Admin',
        'super_admin',
        'Added Staff Member',
        `Staff Name: ${newStaffName}, Email: ${newStaffEmail}`
      );

      // Reset form
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPhone('');
      setNewStaffPassword('');
      setNewStaffAvatarUrl('');
      setIsAddingStaff(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to add staff member.');
    }
  };

  const handleDeleteStaff = async (staff: Staff) => {
    if (!window.confirm(`Are you sure you want to delete staff member "${staff.name}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'staff', staff.id));
      
      // Log Activity
      await logActivity(
        'admin@pdvillas.com',
        'Super Admin',
        'super_admin',
        'Deleted Staff Member',
        `Staff Name: ${staff.name}, Email: ${staff.email}`
      );
    } catch (err) {
      alert('Failed to delete staff member.');
    }
  };

  const handleUpdatePassword = async (staffId: string, staffName: string) => {
    if (!editingStaffPassword) return;

    try {
      await updateDoc(doc(db, 'staff', staffId), {
        password: editingStaffPassword
      });

      // Log Activity
      await logActivity(
        'admin@pdvillas.com',
        'Super Admin',
        'super_admin',
        'Changed Staff Password',
        `Staff Name: ${staffName}, New Password set`
      );

      setEditingStaffId(null);
    } catch (err) {
      alert('Failed to update password.');
    }
  };

  return (
    <div className="flex-1 bg-gray-50 p-6 overflow-y-auto space-y-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Banner */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {isSuperAdmin ? 'Staff Control & Access Matrix' : 'Staff Directory & Activity Logs'}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {isSuperAdmin 
                  ? 'Add staff, manage passwords, configure villa assignments, and view system audit logs.'
                  : 'View active villa management staff assignments and monitor system logs.'
                }
              </p>
            </div>
          </div>

          {isSuperAdmin && (
            <button
              onClick={() => setIsAddingStaff(!isAddingStaff)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 self-start sm:self-auto transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddingStaff ? 'Cancel' : 'Add New Staff'}</span>
            </button>
          )}
        </div>

        {/* Add Staff Collapsible Form */}
        {isAddingStaff && isSuperAdmin && (
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 animate-slide-down">
            <h2 className="text-sm font-bold text-gray-800 flex items-center space-x-1.5 border-b border-gray-100 pb-2">
              <UserCheck className="w-4 h-4 text-purple-600" />
              <span>Register New Staff Account</span>
            </h2>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddStaffSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="Sue"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Gmail Address (Google Login) *</label>
                <input
                  type="email"
                  required
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="sue.pdvillas@gmail.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value)}
                  placeholder="+60123456789"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Account Password (Backup) *</label>
                <input
                  type="password"
                  required
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  placeholder="sue123"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Avatar Image URL (Optional)</label>
                <input
                  type="text"
                  value={newStaffAvatarUrl}
                  onChange={(e) => setNewStaffAvatarUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Register Account</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Matrix Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800">
              {isSuperAdmin ? 'Property Access Authorization Matrix' : 'Assigned Staff Villa Directory'}
            </span>
            <span className="text-[11px] text-gray-500 flex items-center space-x-1">
              <Lock className="w-3.5 h-3.5 text-purple-600" />
              <span>{isSuperAdmin ? 'Enforce Row-Level Access Matrix' : 'Read-Only Matrix View'}</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-100/70 border-b border-gray-200 text-gray-600 font-semibold">
                  <th className="p-4 w-72">Staff Member Details & Password Management</th>
                  {properties.map((p) => (
                    <th key={p.id} className="p-3 text-center min-w-[120px]">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-3 h-3 rounded-full mb-1"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="font-bold text-gray-800 truncate max-w-[110px]">{p.code}</span>
                        <span className="text-[10px] text-gray-500 truncate max-w-[110px]">{p.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {staffList.map((st) => (
                  <tr key={st.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Staff Profile Cell */}
                    <td className="p-4">
                      <div className="flex items-start space-x-3">
                        <img
                          src={st.avatarUrl}
                          alt={st.name}
                          className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-bold text-gray-900 truncate">{st.name}</p>
                            {isSuperAdmin && (
                              <button
                                onClick={() => handleDeleteStaff(st)}
                                className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-all shrink-0"
                                title="Remove staff account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          
                          <p className="text-[10px] text-gray-500 flex items-center space-x-1 truncate mt-0.5">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <span>{st.email}</span>
                          </p>
                          <p className="text-[10px] text-gray-500 flex items-center space-x-1 truncate mt-0.5">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{st.phone}</span>
                          </p>

                          {/* Password Management */}
                          {isSuperAdmin ? (
                            editingStaffId === st.id ? (
                              <div className="flex items-center space-x-1.5 mt-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200 w-fit">
                                <input
                                  type="text"
                                  value={editingStaffPassword}
                                  onChange={(e) => setEditingStaffPassword(e.target.value)}
                                  className="px-2 py-1 bg-white border border-gray-200 rounded text-xs w-28 focus:outline-hidden focus:ring-1 focus:ring-purple-500 font-mono font-bold"
                                />
                                <button
                                  onClick={() => handleUpdatePassword(st.id, st.name)}
                                  className="p-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 flex items-center justify-center shadow-xs"
                                  title="Save Password"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingStaffId(null)}
                                  className="px-1.5 py-1 text-gray-400 hover:text-gray-600 text-[10px] font-bold"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1.5 mt-2 text-[11px] text-gray-600">
                                <span className="font-semibold text-slate-500">Backup Key:</span>
                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-700">{st.password || 'none'}</span>
                                <button
                                  onClick={() => {
                                    setEditingStaffId(st.id);
                                    setEditingStaffPassword(st.password || '');
                                  }}
                                  className="text-purple-600 hover:text-purple-800 text-[10px] font-bold hover:underline shrink-0"
                                >
                                  Edit
                                </button>
                              </div>
                            )
                          ) : (
                            <div className="flex items-center space-x-1.5 mt-2 text-[11px] text-slate-500 font-medium">
                              <span>Authentication: <strong className="text-slate-700">Gmail Linked</strong></span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Property Checkboxes Cells */}
                    {properties.map((p) => {
                      const isAssigned = st.assignedPropertyIds.includes(p.id);

                      return (
                        <td key={p.id} className="p-3 text-center align-middle">
                          <button
                            onClick={async () => {
                              if (!isSuperAdmin) {
                                alert('Only Super Admin Owner can modify staff property access rights.');
                                return;
                              }
                              const updatedIds = isAssigned
                                ? st.assignedPropertyIds.filter((id) => id !== p.id)
                                : [...st.assignedPropertyIds, p.id];

                              await onUpdateStaffPropertyAccess(st.id, updatedIds);
                            }}
                            disabled={!isSuperAdmin}
                            className={`p-2 rounded-xl transition-all ${
                              isAssigned
                                ? 'bg-purple-100 text-purple-800 font-bold shadow-2xs'
                                : 'bg-gray-100 text-gray-300 hover:bg-gray-200 hover:text-gray-500 disabled:opacity-40'
                            }`}
                            title={isSuperAdmin ? `Toggle access to ${p.name} for ${st.name}` : `Access status for ${p.name}`}
                          >
                            {isAssigned ? (
                              <CheckSquare className="w-5 h-5 text-purple-700" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-300" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Logs Viewer */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <div 
            onClick={() => setShowLogs(!showLogs)}
            className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-gray-100/50 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-bold text-gray-800">System Activity Audit Log (Real-time logs)</span>
            </div>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full">
              {logs.length} Operations logged
            </span>
          </div>

          {showLogs && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50/40 border-b border-gray-200 text-gray-500 font-semibold">
                    <th className="p-3 w-44">Timestamp</th>
                    <th className="p-3 w-48">Operator</th>
                    <th className="p-3 w-32">Role</th>
                    <th className="p-3 w-36">Action</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium text-gray-700">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400 font-medium">
                        No activity has been logged yet.
                      </td>
                    </tr>
                  ) : (
                    logs.slice(0, 100).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 text-[11px] text-gray-400 font-mono">
                          {log.timestamp ? format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss') : 'Never'}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-800">{log.userName}</span>
                            <span className="text-[10px] text-gray-400">{log.userEmail}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            log.role === 'super_admin'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : log.role === 'owner'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-teal-50 text-teal-800 border-teal-200'
                          }`}>
                            {log.role === 'super_admin' ? 'Super Admin' : log.role === 'owner' ? 'Owner' : 'Staff'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-indigo-700">{log.action}</span>
                        </td>
                        <td className="p-3 text-[11px] text-gray-600 font-mono whitespace-normal max-w-sm truncate" title={log.details}>
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
