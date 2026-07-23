import React, { useState } from 'react';
import { Property, Staff, Booking } from '../types';
import { syncICalForProperty, generateExportICalFeed } from '../lib/icalSync';
import { 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink, 
  Calendar, 
  Download, 
  Upload, 
  Globe, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  SendHorizontal
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ICalSyncViewProps {
  properties: Property[];
  staffList: Staff[];
  bookings: Booking[];
}

export const ICalSyncView: React.FC<ICalSyncViewProps> = ({ properties, staffList, bookings }) => {
  const [selectedProperty, setSelectedProperty] = useState<Property>(properties[0] || null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form states for URLs
  const [airbnbUrl, setAirbnbUrl] = useState<string>(selectedProperty?.icalUrls?.airbnb || '');
  const [bookingComUrl, setBookingComUrl] = useState<string>(selectedProperty?.icalUrls?.bookingCom || '');
  const [agodaUrl, setAgodaUrl] = useState<string>(selectedProperty?.icalUrls?.agoda || '');
  const [saveStatus, setSaveStatus] = useState<string>('');

  // When selected property changes, update input states
  React.useEffect(() => {
    if (selectedProperty) {
      setAirbnbUrl(selectedProperty.icalUrls?.airbnb || '');
      setBookingComUrl(selectedProperty.icalUrls?.bookingCom || '');
      setAgodaUrl(selectedProperty.icalUrls?.agoda || '');
      setSaveStatus('');
    }
  }, [selectedProperty]);

  if (!selectedProperty) return null;

  // Save updated iCal URLs to Firestore
  const handleSaveICalUrls = async () => {
    try {
      const updatedICalUrls = {
        ...selectedProperty.icalUrls,
        airbnb: airbnbUrl,
        bookingCom: bookingComUrl,
        agoda: agodaUrl
      };

      await setDoc(doc(db, 'properties', selectedProperty.id), {
        icalUrls: updatedICalUrls
      }, { merge: true });

      setSaveStatus('iCal calendar URLs saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      setSaveStatus('Failed to save iCal URLs');
    }
  };

  // Sync selected property iCal
  const handleSyncProperty = async () => {
    setIsSyncing(true);
    setSyncLogs(['Starting iCal import sync process...']);

    const result = await syncICalForProperty(selectedProperty, staffList);
    setSyncLogs(result.logs);
    setIsSyncing(false);
  };

  // Sync ALL properties iCal
  const handleSyncAllProperties = async () => {
    setIsSyncing(true);
    setSyncLogs(['Initiating multi-property iCal sync...']);

    let totalImported = 0;
    const allLogs: string[] = [];

    for (const prop of properties) {
      allLogs.push(`--- Syncing ${prop.name} ---`);
      const res = await syncICalForProperty(prop, staffList);
      totalImported += res.eventsImported;
      allLogs.push(...res.logs);
    }

    allLogs.push(`Sync Complete! Total imported/updated bookings: ${totalImported}`);
    setSyncLogs(allLogs);
    setIsSyncing(false);
  };

  // Copy to clipboard helper
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Generate Export iCal feed text
  const exportFeedText = generateExportICalFeed(selectedProperty, bookings);

  // Assigned Staff Member for Selected Villa
  const assignedStaff = staffList.find(s => s.assignedPropertyIds.includes(selectedProperty.id));

  return (
    <div className="h-full flex-1 overflow-y-auto p-6 bg-gray-50">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-orange-600 bg-orange-50 px-3 py-1 rounded-full w-fit mb-2">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Automatic Multi-OTA Calendar Synchronization</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">iCal Calendar Links (Booking.com, Airbnb, Agoda)</h1>
          <p className="text-xs text-gray-500 mt-1">
            Link external .ics calendar feeds to auto-import bookings and prevent double bookings across platforms.
          </p>
        </div>

        <button
          onClick={handleSyncAllProperties}
          disabled={isSyncing}
          className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing All Feeds...' : 'Sync All Villas Now'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Property Selector */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Select Villa</h2>
            <div className="space-y-2">
              {properties.map((prop) => {
                const isSelected = prop.id === selectedProperty.id;
                const propStaff = staffList.find(s => s.assignedPropertyIds.includes(prop.id));

                return (
                  <button
                    key={prop.id}
                    onClick={() => setSelectedProperty(prop)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/50 shadow-xs'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: prop.color }}
                      />
                      <div>
                        <h3 className="text-xs font-bold text-gray-900">{prop.name}</h3>
                        <p className="text-[10px] text-gray-500">
                          Manager: <span className="font-semibold text-gray-700">{propStaff?.name || 'Unassigned'}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                      {prop.code}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manager Info Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-center space-x-3">
              <img
                src={assignedStaff?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
                alt={assignedStaff?.name}
                className="w-10 h-10 rounded-full object-cover border border-white shadow-xs"
              />
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Assigned Villa Manager</span>
                <h4 className="text-sm font-bold text-gray-900">{assignedStaff?.name || 'Staff Member'}</h4>
                <p className="text-[11px] text-gray-600">Telegram: <span className="font-medium text-blue-700">{assignedStaff?.telegramChatId || '@pdvillas_alerts'}</span></p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200/60 flex items-center justify-between text-[11px] text-blue-900">
              <span>Automatic Telegram Alerts:</span>
              <span className="font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">Active</span>
            </div>
          </div>
        </div>

        {/* Right Column: iCal Inputs & Export links */}
        <div className="lg:col-span-2 space-y-6">
          {/* External OTA iCal Inputs */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <Download className="w-5 h-5 text-orange-600" />
                <h2 className="text-base font-bold text-gray-900">Import External iCal Feeds into {selectedProperty.name}</h2>
              </div>
              <button
                onClick={handleSyncProperty}
                disabled={isSyncing}
                className="px-3.5 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync This Villa</span>
              </button>
            </div>

            {/* Airbnb iCal */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>Airbnb Calendar Export iCal URL</span>
              </label>
              <input
                type="text"
                value={airbnbUrl}
                onChange={(e) => setAirbnbUrl(e.target.value)}
                placeholder="https://www.airbnb.com/calendar/ical/..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all font-mono"
              />
            </div>

            {/* Booking.com iCal */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>Booking.com Calendar Export iCal URL</span>
              </label>
              <input
                type="text"
                value={bookingComUrl}
                onChange={(e) => setBookingComUrl(e.target.value)}
                placeholder="https://admin.booking.com/hotel/ical/..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all font-mono"
              />
            </div>

            {/* Agoda iCal */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                <span>Agoda Calendar Export iCal URL</span>
              </label>
              <input
                type="text"
                value={agodaUrl}
                onChange={(e) => setAgodaUrl(e.target.value)}
                placeholder="https://ycs.agoda.com/ical/..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {saveStatus ? (
                <span className="text-xs font-semibold text-emerald-600 flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{saveStatus}</span>
                </span>
              ) : (
                <span className="text-[11px] text-gray-400">
                  Last synced: {selectedProperty.icalUrls?.lastSyncedAt ? new Date(selectedProperty.icalUrls.lastSyncedAt).toLocaleString() : 'Never'}
                </span>
              )}

              <button
                onClick={handleSaveICalUrls}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                Save iCal Links
              </button>
            </div>
          </div>

          {/* Export PD Holiday Villas Feed */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
              <Upload className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-gray-900">Export PD Holiday Villas iCal to External Channels</h2>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Copy this export feed URL and paste it into Airbnb, Booking.com, and Agoda sync settings so direct PD Holiday Villas bookings automatically block out dates on external OTAs.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between font-mono text-xs text-gray-700 overflow-x-auto">
              <span className="truncate mr-2">
                https://pdholidayvillas.com/api/ical/export?villaId={selectedProperty.id}
              </span>
              <button
                onClick={() => handleCopy(`https://pdholidayvillas.com/api/ical/export?villaId=${selectedProperty.id}`, 'exportUrl')}
                className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center space-x-1 shrink-0 transition-colors"
              >
                {copiedField === 'exportUrl' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Live Sync Output Logs */}
          {syncLogs.length > 0 && (
            <div className="bg-gray-900 text-gray-100 rounded-2xl p-4 font-mono text-xs space-y-1 shadow-inner max-h-60 overflow-y-auto">
              <div className="flex items-center space-x-2 text-gray-400 border-b border-gray-800 pb-2 mb-2">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                <span className="font-bold">Sync Console Log</span>
              </div>
              {syncLogs.map((log, index) => (
                <div key={index} className="text-[11px] leading-tight">
                  <span className="text-orange-400 mr-1">&gt;</span> {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
