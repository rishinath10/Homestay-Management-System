import React, { useState, useEffect } from 'react';
import { Staff, Property, Role, ActivityLog } from '../types';
import { 
  Users, Shield, Check, Lock, Phone, Mail, CheckSquare, Square, 
  AlertCircle, Trash2, Plus, Key, History, Eye, EyeOff, UserCheck,
  ChevronLeft, Menu, Save, Loader2
} from 'lucide-react';
import { supabase, logActivity } from '../lib/supabase';
import { format } from 'date-fns';

interface StaffMatrixViewProps {
  staffList: Staff[];
  properties: Property[];
  onUpdateStaffPropertyAccess: (staffId: string, propertyIds: string[]) => Promise<void>;
  activeRole: Role;
  onBackToCalendar?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const StaffMatrixView: React.FC<StaffMatrixViewProps> = ({
  staffList,
  properties,
  onUpdateStaffPropertyAccess,
  activeRole,
  onBackToCalendar,
  isSidebarOpen,
  onToggleSidebar
}) => {
  const isSuperAdmin = activeRole === 'super_admin';
  const [activeTab, setActiveTab] = useState<'matrix' | 'logs'>('matrix');
  const [localMatrix, setLocalMatrix] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingStaffPassword, setEditingStaffPassword] = useState<string>('');
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Add staff modal form state
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffAvatarUrl, setNewStaffAvatarUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Activity logs state
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [showLogs, setShowLogs] = useState(true);

  // Sync props to local matrix state
  useEffect(() => {
    const matrix: Record<string, string[]> = {};
    staffList.forEach(st => {
      matrix[st.id] = [...(st.assignedPropertyIds || [])];
    });
    setLocalMatrix(matrix);
  }, [staffList]);

  const hasUnsavedChanges = React.useMemo(() => {
    return staffList.some(st => {
      const original = (st.assignedPropertyIds || []).slice().sort();
      const current = (localMatrix[st.id] || []).slice().sort();
      if (original.length !== current.length) return true;
      return original.some((id, i) => id !== current[i]);
    });
  }, [staffList, localMatrix]);

  const changedCount = React.useMemo(() => {
    return staffList.filter(st => {
      const original = (st.assignedPropertyIds || []).slice().sort();
      const current = (localMatrix[st.id] || []).slice().sort();
      if (original.length !== current.length) return true;
      return original.some((id, i) => id !== current[i]);
    }).length;
  }, [staffList, localMatrix]);

  const handleToggleAccess = async (staffId: string, propId: string) => {
    const currentIds = localMatrix[staffId] || [];
    const isAssigned = currentIds.includes(propId);
    const updatedIds = isAssigned
      ? currentIds.filter(id => id !== propId)
      : [...currentIds, propId];

    setLocalMatrix(prev => ({
      ...prev,
      [staffId]: updatedIds
    }));

    try {
      await onUpdateStaffPropertyAccess(staffId, updatedIds);
    } catch (err) {
      console.error('Failed to update staff access:', err);
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const changedStaff = staffList.filter(st => {
        const original = (st.assignedPropertyIds || []).slice().sort();
        const current = (localMatrix[st.id] || []).slice().sort();
        if (original.length !== current.length) return true;
        return original.some((id, i) => id !== current[i]);
      });
      await Promise.all(
        changedStaff.map(st => onUpdateStaffPropertyAccess(st.id, localMatrix[st.id] || []))
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    const matrix: Record<string, string[]> = {};
    staffList.forEach(st => {
      matrix[st.id] = [...(st.assignedPropertyIds || [])];
    });
    setLocalMatrix(matrix);
  };

  // Fetch activity logs in real-time
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data } = await supabase.from('activity_logs').select('*').order('timestamp', { ascending: false });
        if (data) setLogs(data as ActivityLog[]);
      } catch (err) {
        console.warn('Failed to load activity logs:', err);
      }
    };
    fetchLogs();

    const channel = supabase
      .channel('activity_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, fetchLogs)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newStaffName || !newStaffEmail || !newStaffPhone || !newStaffPassword) {
      setFormError('Please fill in all required fields.');
      return;
    }

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

      await supabase.from('staff').upsert(newStaff);
      
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
      await supabase.from('staff').delete().eq('id', staff.id);
      
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
      await supabase.from('staff').update({ password: editingStaffPassword }).eq('id', staffId);

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
            <Users className="w-4.5 h-4.5 text-purple-600" />
            <span>{isSuperAdmin ? 'Staff Control & Access Matrix' : 'Staff Directory & Activity Logs'}</span>
          </h1>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {isSuperAdmin && (
            <button
              onClick={() => setIsAddingStaff(!isAddingStaff)}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddingStaff ? 'Cancel' : 'Add Staff'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Page Content Body */}
      <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Mobile Header Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col justify-between gap-4 md:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-6 h-6 text-purple-600" />
                <h1 className="text-xl font-bold text-gray-900">Staff Portal</h1>
              </div>
            </div>
            {isSuperAdmin && (
              <button
                onClick={() => setIsAddingStaff(!isAddingStaff)}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>{isAddingStaff ? 'Cancel' : 'Add Staff'}</span>
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
                      const currentIds = localMatrix[st.id] || [];
                      const isAssigned = currentIds.includes(p.id);
                      const originalIds = st.assignedPropertyIds || [];
                      const wasOriginallyAssigned = originalIds.includes(p.id);
                      const isDirty = isAssigned !== wasOriginallyAssigned;

                      return (
                        <td key={p.id} className="p-3 text-center align-middle">
                          <button
                            onClick={() => {
                              if (!isSuperAdmin) {
                                alert('Only Super Admin Owner can modify staff property access rights.');
                                return;
                              }
                              handleToggleAccess(st.id, p.id);
                            }}
                            disabled={!isSuperAdmin}
                            className={`p-2 rounded-xl transition-all relative ${
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
                            {isDirty && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white" />
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

      {/* Floating Save Bar */}
      {hasUnsavedChanges && isSuperAdmin && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-up">
          <div className="flex items-center space-x-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-gray-700">
            <span className="text-xs font-semibold text-amber-300">
              {changedCount} staff member{changedCount !== 1 ? 's' : ''} with unsaved changes
            </span>
            <button
              onClick={handleDiscardChanges}
              className="px-3 py-1.5 text-gray-400 hover:text-white text-xs font-bold rounded-lg hover:bg-gray-700 transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center space-x-1.5 active:scale-95"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};
