import React, { useState, useEffect } from 'react';
import { Property, Role, VillaMemo, Staff } from '../types';
import { 
  FileText, Wifi, Tv, Key, Lock, Eye, EyeOff, Edit3, Save, Plus, 
  Trash2, Copy, Check, Shield, Menu, ChevronLeft, Building2, StickyNote, HelpCircle
} from 'lucide-react';
import { supabase, logActivity } from '../lib/supabase';
import { format } from 'date-fns';

interface MemosViewProps {
  properties: Property[];
  activeRole: Role;
  activeStaff?: Staff | null;
  userEmail: string;
  userName: string;
  onBackToCalendar?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

const DEFAULT_MEMOS: VillaMemo[] = [
  {
    id: 'memo-1',
    propertyId: 'prop-1',
    propertyName: 'Birds Nest',
    title: 'Birds Nest Access & WiFi Passwords',
    wifiName: 'BirdsNest_Guest_5G',
    wifiPassword: 'nestvilla2026',
    netflixAccount: 'birdsnest@pdholidayvillas.com',
    netflixPassword: 'pdvillas123!',
    gateCode: '4829',
    lockboxCode: '1092',
    notes: 'Main gate remote is inside key drawer. Plunge pool pump switch is located behind garden deck.',
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Admin'
  },
  {
    id: 'memo-2',
    propertyId: 'prop-2',
    propertyName: 'Nuri',
    title: 'Nuri Villa Passwords & Notes',
    wifiName: 'NuriHomestay_WiFi',
    wifiPassword: 'nurihomestay2026',
    netflixAccount: 'nuri@pdholidayvillas.com',
    netflixPassword: 'pdvillas123!',
    gateCode: '3310',
    lockboxCode: '5542',
    notes: 'BBQ pit cleaning equipment kept under garden sink. Master bedroom key in lockbox.',
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Admin'
  }
];

export const MemosView: React.FC<MemosViewProps> = ({
  properties,
  activeRole,
  activeStaff,
  userEmail,
  userName,
  onBackToCalendar,
  isSidebarOpen,
  onToggleSidebar
}) => {
  const isSuperAdmin = activeRole === 'super_admin' || activeRole === 'owner';
  const [memos, setMemos] = useState<VillaMemo[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Sensitive field visibility toggles
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form states for creating / editing
  const [formPropertyId, setFormPropertyId] = useState<string>(properties[0]?.id || '');
  const [formTitle, setFormTitle] = useState('');
  const [formWifiName, setFormWifiName] = useState('');
  const [formWifiPassword, setFormWifiPassword] = useState('');
  const [formNetflixAccount, setFormNetflixAccount] = useState('');
  const [formNetflixPassword, setFormNetflixPassword] = useState('');
  const [formGateCode, setFormGateCode] = useState('');
  const [formLockboxCode, setFormLockboxCode] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Supabase real-time listener & LocalStorage cache
  useEffect(() => {
    const fetchMemos = async () => {
      let cached: VillaMemo[] = [];
      try {
        const raw = localStorage.getItem('pd_memos_cache');
        if (raw) cached = JSON.parse(raw);
      } catch (e) {}

      try {
        const { data, error } = await supabase.from('villa_memos').select('*');
        if (data && data.length > 0) {
          const memoMap = new Map<string, VillaMemo>();
          cached.forEach(m => memoMap.set(m.id, m));
          (data as VillaMemo[]).forEach(m => memoMap.set(m.id, m));
          const merged = Array.from(memoMap.values());
          setMemos(merged);
          try {
            localStorage.setItem('pd_memos_cache', JSON.stringify(merged));
          } catch (e) {}
        } else if (cached.length > 0) {
          setMemos(cached);
        } else {
          setMemos(DEFAULT_MEMOS);
          try {
            localStorage.setItem('pd_memos_cache', JSON.stringify(DEFAULT_MEMOS));
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Failed to load villa memos:', err);
        if (cached.length > 0) {
          setMemos(cached);
        } else {
          setMemos(DEFAULT_MEMOS);
        }
      }
    };
    fetchMemos();

    const channel = supabase
      .channel('memos_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'villa_memos' }, () => {
        fetchMemos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleStartEdit = (memo: VillaMemo) => {
    setEditingMemoId(memo.id);
    setIsCreatingNew(false);
    setFormPropertyId(memo.propertyId);
    setFormTitle(memo.title || '');
    setFormWifiName(memo.wifiName || '');
    setFormWifiPassword(memo.wifiPassword || '');
    setFormNetflixAccount(memo.netflixAccount || '');
    setFormNetflixPassword(memo.netflixPassword || '');
    setFormGateCode(memo.gateCode || '');
    setFormLockboxCode(memo.lockboxCode || '');
    setFormNotes(memo.notes || '');
  };

  const handleStartCreate = () => {
    setEditingMemoId(null);
    setIsCreatingNew(true);
    setFormPropertyId(properties[0]?.id || '');
    setFormTitle('Villa Access & Passwords');
    setFormWifiName('');
    setFormWifiPassword('');
    setFormNetflixAccount('');
    setFormNetflixPassword('');
    setFormGateCode('');
    setFormLockboxCode('');
    setFormNotes('');
  };

  const handleSaveMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    setIsSaving(true);

    try {
      const propObj = properties.find(p => p.id === formPropertyId);
      const memoId = editingMemoId || `memo-${Date.now()}`;
      
      const newMemo: VillaMemo = {
        id: memoId,
        propertyId: formPropertyId,
        propertyName: propObj?.name || 'Villa',
        title: formTitle || `${propObj?.name || 'Villa'} Passwords & Notes`,
        wifiName: formWifiName,
        wifiPassword: formWifiPassword,
        netflixAccount: formNetflixAccount,
        netflixPassword: formNetflixPassword,
        gateCode: formGateCode,
        lockboxCode: formLockboxCode,
        notes: formNotes,
        updatedAt: new Date().toISOString(),
        updatedBy: userName || userEmail
      };

      // Instantly update local React state and LocalStorage cache
      setMemos(prev => {
        const existingIndex = prev.findIndex(m => m.id === memoId);
        let updated: VillaMemo[];
        if (existingIndex >= 0) {
          updated = [...prev];
          updated[existingIndex] = newMemo;
        } else {
          updated = [newMemo, ...prev];
        }
        try {
          localStorage.setItem('pd_memos_cache', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      // Persist to Supabase asynchronously
      try {
        await supabase.from('villa_memos').upsert(newMemo);
      } catch (dbErr) {
        console.warn('Supabase villa_memos save notice:', dbErr);
      }

      try {
        await logActivity(
          userEmail,
          userName,
          activeRole,
          editingMemoId ? 'Updated Villa Memo' : 'Created Villa Memo',
          `Villa: ${propObj?.name || formPropertyId}`
        );
      } catch (logErr) {
        console.warn('Activity log skipped for memo save:', logErr);
      }

      setEditingMemoId(null);
      setIsCreatingNew(false);
    } catch (err: any) {
      console.error('Memo save error:', err);
      alert(`Failed to save memo: ${err?.message || err || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMemo = async (memo: VillaMemo) => {
    if (!isSuperAdmin) return;
    if (!window.confirm(`Are you sure you want to delete memo "${memo.title}"?`)) return;

    setMemos(prev => {
      const updated = prev.filter(m => m.id !== memo.id);
      try {
        localStorage.setItem('pd_memos_cache', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      await supabase.from('villa_memos').delete().eq('id', memo.id);
      await logActivity(userEmail, userName, activeRole, 'Deleted Villa Memo', `Memo: ${memo.title}`);
    } catch (err) {
      console.warn('Delete memo remote notice:', err);
    }
  };

  const visibleProperties = React.useMemo(() => {
    if (activeRole === 'super_admin' || activeRole === 'owner') {
      return properties;
    }
    const assignedIds = activeStaff?.assignedPropertyIds || [];
    return properties.filter(p => assignedIds.includes(p.id));
  }, [properties, activeRole, activeStaff]);

  const filteredMemos = memos.filter(m => {
    const isVisibleProp = visibleProperties.some(p => p.id === m.propertyId);
    if (!isVisibleProp) return false;
    if (selectedPropertyId === 'all') return true;
    return m.propertyId === selectedPropertyId;
  });

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between py-3 px-4 bg-white border-b border-gray-200 shadow-2xs shrink-0">
        <div className="flex items-center space-x-3 shrink min-w-0">
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
            <StickyNote className="w-4.5 h-4.5 text-amber-500" />
            <span>Villa Memos & Passwords</span>
          </h1>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {/* Villa Filter Dropdown */}
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">All Villas</option>
            {visibleProperties.map(p => (
              <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
            ))}
          </select>

          {isSuperAdmin && (
            <button
              onClick={handleStartCreate}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Memo</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Access Banner */}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold">
                <StickyNote className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-amber-900">
                  {isSuperAdmin ? 'Super Admin Memo Management' : 'Villa Passwords & Information Hub'}
                </h2>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  {isSuperAdmin 
                    ? 'Only Super Admins can add or update credentials. Staff and Owners have view-only access.'
                    : 'View Wi-Fi passwords, Netflix logins, and door entry codes for assigned villas.'}
                </p>
              </div>
            </div>
            {!isSuperAdmin && (
              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full flex items-center space-x-1 shrink-0 border border-amber-300">
                <Shield className="w-3 h-3" />
                <span>Read Only</span>
              </span>
            )}
          </div>

          {/* Create / Edit Form Modal Card */}
          {(isCreatingNew || editingMemoId) && isSuperAdmin && (
            <div className="bg-white p-6 rounded-2xl border-2 border-amber-400 shadow-lg animate-fade-up space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                  <Edit3 className="w-4 h-4 text-amber-500" />
                  <span>{editingMemoId ? 'Edit Villa Memo' : 'Create New Villa Memo'}</span>
                </h3>
                <button
                  onClick={() => { setIsCreatingNew(false); setEditingMemoId(null); }}
                  className="text-xs text-gray-400 hover:text-gray-600 font-bold"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSaveMemo} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Target Villa *</label>
                    <select
                      value={formPropertyId}
                      onChange={(e) => setFormPropertyId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    >
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Memo Title *</label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. WiFi & Gate Passwords"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* WiFi Credentials */}
                <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2 col-span-full text-xs font-bold text-blue-900">
                    <Wifi className="w-4 h-4 text-blue-600" />
                    <span>Wi-Fi Network Info</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Wi-Fi Name (SSID)</label>
                    <input
                      type="text"
                      value={formWifiName}
                      onChange={(e) => setFormWifiName(e.target.value)}
                      placeholder="PD_Villa_Guest"
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Wi-Fi Password</label>
                    <input
                      type="text"
                      value={formWifiPassword}
                      onChange={(e) => setFormWifiPassword(e.target.value)}
                      placeholder="villa2026pass"
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Netflix Logins */}
                <div className="p-3.5 bg-red-50/60 border border-red-100 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2 col-span-full text-xs font-bold text-red-900">
                    <Tv className="w-4 h-4 text-red-600" />
                    <span>Netflix / TV Account</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Account Email / ID</label>
                    <input
                      type="text"
                      value={formNetflixAccount}
                      onChange={(e) => setFormNetflixAccount(e.target.value)}
                      placeholder="tv@pdvillas.com"
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Password / PIN</label>
                    <input
                      type="text"
                      value={formNetflixPassword}
                      onChange={(e) => setFormNetflixPassword(e.target.value)}
                      placeholder="1234"
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Gate & Lockbox Codes */}
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2 col-span-full text-xs font-bold text-emerald-900">
                    <Key className="w-4 h-4 text-emerald-600" />
                    <span>Door Codes & Access</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Gate / Main Door Code</label>
                    <input
                      type="text"
                      value={formGateCode}
                      onChange={(e) => setFormGateCode(e.target.value)}
                      placeholder="#8899"
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Key Lockbox Code</label>
                    <input
                      type="text"
                      value={formLockboxCode}
                      onChange={(e) => setFormLockboxCode(e.target.value)}
                      placeholder="4567"
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Custom Notes */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Additional Instructions & Notes</label>
                  <textarea
                    rows={3}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="e.g. Garbage collection on Tuesdays. Water heater switch is next to the kitchen door."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setIsCreatingNew(false); setEditingMemoId(null); }}
                    className="px-4 py-2 text-gray-500 hover:text-gray-700 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Saving...' : 'Save Memo'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Memo Cards Grid */}
          {filteredMemos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
              <StickyNote className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-500">No memos added yet.</p>
              {isSuperAdmin && (
                <button
                  onClick={handleStartCreate}
                  className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-amber-600"
                >
                  Create First Memo
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMemos.map((memo) => {
                const prop = properties.find(p => p.id === memo.propertyId);
                const wifiPassKey = `wifi-${memo.id}`;
                const netflixPassKey = `netflix-${memo.id}`;
                const gateCodeKey = `gate-${memo.id}`;
                const lockboxKey = `lockbox-${memo.id}`;

                return (
                  <div
                    key={memo.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
                  >
                    {/* Memo Card Header */}
                    <div
                      className="p-4 border-b border-gray-100 flex items-center justify-between"
                      style={{ borderLeft: `4px solid ${prop?.color || '#f59e0b'}` }}
                    >
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          {prop?.name || memo.propertyName || 'Villa Memo'}
                        </span>
                        <h3 className="text-sm font-bold text-gray-900">{memo.title}</h3>
                      </div>

                      {isSuperAdmin && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleStartEdit(memo)}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit Memo"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMemo(memo)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Memo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Memo Credentials Details */}
                    <div className="p-4 space-y-3 flex-1 text-xs">
                      {/* Wi-Fi Section */}
                      {(memo.wifiName || memo.wifiPassword) && (
                        <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1.5">
                          <div className="flex items-center space-x-2 text-blue-900 font-bold text-[11px]">
                            <Wifi className="w-3.5 h-3.5 text-blue-600" />
                            <span>Wi-Fi Network</span>
                          </div>
                          {memo.wifiName && (
                            <div className="flex items-center justify-between text-gray-700 text-xs">
                              <span className="text-gray-500 font-medium">SSID:</span>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-semibold text-gray-900">{memo.wifiName}</span>
                                <button
                                  onClick={() => copyToClipboard(memo.wifiName!, `ssid-${memo.id}`)}
                                  className="text-gray-400 hover:text-blue-600"
                                  title="Copy SSID"
                                >
                                  {copiedField === `ssid-${memo.id}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          )}
                          {memo.wifiPassword && (
                            <div className="flex items-center justify-between text-gray-700 text-xs">
                              <span className="text-gray-500 font-medium">Password:</span>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-800">
                                  {showPasswords[wifiPassKey] ? memo.wifiPassword : '••••••••'}
                                </span>
                                <button
                                  onClick={() => togglePasswordVisibility(wifiPassKey)}
                                  className="text-gray-400 hover:text-blue-600"
                                >
                                  {showPasswords[wifiPassKey] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(memo.wifiPassword!, `wifipass-${memo.id}`)}
                                  className="text-gray-400 hover:text-blue-600"
                                  title="Copy Password"
                                >
                                  {copiedField === `wifipass-${memo.id}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Netflix Section */}
                      {(memo.netflixAccount || memo.netflixPassword) && (
                        <div className="p-3 bg-red-50/70 border border-red-100 rounded-xl space-y-1.5">
                          <div className="flex items-center space-x-2 text-red-900 font-bold text-[11px]">
                            <Tv className="w-3.5 h-3.5 text-red-600" />
                            <span>Netflix / TV Account</span>
                          </div>
                          {memo.netflixAccount && (
                            <div className="flex items-center justify-between text-gray-700 text-xs">
                              <span className="text-gray-500 font-medium">Account:</span>
                              <span className="font-semibold text-gray-900">{memo.netflixAccount}</span>
                            </div>
                          )}
                          {memo.netflixPassword && (
                            <div className="flex items-center justify-between text-gray-700 text-xs">
                              <span className="text-gray-500 font-medium">Password:</span>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-800">
                                  {showPasswords[netflixPassKey] ? memo.netflixPassword : '••••••••'}
                                </span>
                                <button
                                  onClick={() => togglePasswordVisibility(netflixPassKey)}
                                  className="text-gray-400 hover:text-red-600"
                                >
                                  {showPasswords[netflixPassKey] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Access Codes Section */}
                      {(memo.gateCode || memo.lockboxCode) && (
                        <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1.5">
                          <div className="flex items-center space-x-2 text-emerald-900 font-bold text-[11px]">
                            <Key className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Access & Door Codes</span>
                          </div>
                          {memo.gateCode && (
                            <div className="flex items-center justify-between text-gray-700 text-xs">
                              <span className="text-gray-500 font-medium">Gate Code:</span>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-gray-200 text-emerald-900">
                                  {showPasswords[gateCodeKey] ? memo.gateCode : '••••'}
                                </span>
                                <button
                                  onClick={() => togglePasswordVisibility(gateCodeKey)}
                                  className="text-gray-400 hover:text-emerald-600"
                                >
                                  {showPasswords[gateCodeKey] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          )}
                          {memo.lockboxCode && (
                            <div className="flex items-center justify-between text-gray-700 text-xs">
                              <span className="text-gray-500 font-medium">Lockbox Code:</span>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-gray-200 text-emerald-900">
                                  {showPasswords[lockboxKey] ? memo.lockboxCode : '••••'}
                                </span>
                                <button
                                  onClick={() => togglePasswordVisibility(lockboxKey)}
                                  className="text-gray-400 hover:text-emerald-600"
                                >
                                  {showPasswords[lockboxKey] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* General Notes */}
                      {memo.notes && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Notes & Instructions</span>
                          <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">{memo.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Memo Footer Info */}
                    <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 flex items-center justify-between">
                      <span>Updated by {memo.updatedBy}</span>
                      <span>{memo.updatedAt ? format(new Date(memo.updatedAt), 'MMM d, yyyy') : ''}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
