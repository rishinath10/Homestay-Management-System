import React, { useState } from 'react';
import { Smartphone, Download, Copy, Check, Code, FileText, Play, Wifi, RefreshCw } from 'lucide-react';
import { getFlutterCodebase, FlutterFile } from '../lib/flutterExporter';
import { Booking, Property, Staff } from '../types';

interface FlutterAppHubViewProps {
  bookings: Booking[];
  properties: Property[];
  staffList: Staff[];
}

export const FlutterAppHubView: React.FC<FlutterAppHubViewProps> = ({
  bookings,
  properties,
  staffList
}) => {
  const codeFiles = React.useMemo(() => getFlutterCodebase(), []);
  const [selectedFile, setSelectedFile] = useState<FlutterFile>(codeFiles[0]);
  const [copied, setCopied] = useState(false);
  const [activeStaffIndex, setActiveStaffIndex] = useState(0);

  const activeStaff = staffList[activeStaffIndex] || staffList[0];
  const assignedProps = properties.filter((p) => activeStaff.assignedPropertyIds.includes(p.id));
  const assignedBookings = bookings.filter((b) => activeStaff.assignedPropertyIds.includes(b.propertyId));

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCodeZip = () => {
    const element = document.createElement('a');
    const file = new Blob([selectedFile.code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = selectedFile.path.split('/').pop() || 'flutter_code.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Flutter Mobile App Hub & APK Compiler</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Download Flutter source code for staff phones with real-time Firebase sync and offline support.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadCodeZip}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Selected File</span>
            </button>
          </div>
        </div>

        {/* Layout: Left = Live Mobile Phone Simulator, Right = Flutter Code Explorer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Live Mobile Phone Simulator */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-gray-800 flex items-center space-x-1.5">
                <Play className="w-4 h-4 text-emerald-600" />
                <span>Live Staff Mobile App Preview</span>
              </span>
              <div className="flex items-center space-x-1">
                {staffList.map((st, idx) => (
                  <button
                    key={st.id}
                    onClick={() => setActiveStaffIndex(idx)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                      activeStaffIndex === idx
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {st.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Smartphone Mockup Frame */}
            <div className="w-[290px] h-[560px] bg-gray-900 rounded-[40px] p-3 shadow-2xl border-4 border-gray-800 relative flex flex-col">
              {/* Notch */}
              <div className="w-28 h-4 bg-gray-900 rounded-b-xl mx-auto z-20 flex items-center justify-center">
                <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
              </div>

              {/* Phone Display Screen */}
              <div className="flex-1 bg-gray-50 rounded-[28px] overflow-hidden flex flex-col text-xs text-gray-900 font-sans relative">
                {/* Status Bar */}
                <div className="bg-white px-4 pt-1.5 pb-1 flex items-center justify-between text-[10px] font-bold text-gray-600 border-b border-gray-100">
                  <span>9:41 AM</span>
                  <div className="flex items-center space-x-1 text-emerald-600">
                    <Wifi className="w-3 h-3" />
                    <span className="text-[9px]">4G</span>
                  </div>
                </div>

                {/* App Bar */}
                <div className="bg-white p-3 border-b border-gray-200 flex items-center justify-between shadow-2xs">
                  <div>
                    <h3 className="font-bold text-gray-900 text-xs">PD Villas Staff</h3>
                    <p className="text-[10px] text-gray-500">Staff: {activeStaff.name}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold text-[9px] rounded-full">
                    {assignedProps.length} Homestays
                  </span>
                </div>

                {/* Assigned Homestay Pills */}
                <div className="p-2 bg-blue-50/60 border-b border-blue-100 flex items-center space-x-1.5 overflow-x-auto text-[10px]">
                  {assignedProps.map((p) => (
                    <span key={p.id} className="px-2 py-0.5 bg-white text-blue-900 font-medium rounded-full shadow-2xs shrink-0">
                      🏡 {p.code}
                    </span>
                  ))}
                </div>

                {/* Bookings Stream List */}
                <div className="flex-1 p-2.5 overflow-y-auto space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Assigned Bookings ({assignedBookings.length})
                  </p>

                  {assignedBookings.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-[11px]">
                      No active bookings assigned.
                    </div>
                  ) : (
                    assignedBookings.map((b) => (
                      <div
                        key={b.id}
                        className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-2xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900 text-[11px] truncate">{b.propertyName}</span>
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[9px] rounded-md">
                            {b.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500">
                          📅 {b.bookingDate} | 🕒 {b.checkinTime}
                        </p>
                        <p className="text-[10px] font-medium text-gray-700">
                          👤 {b.guestName || 'Guest'} ({b.guestPhone || 'Direct'})
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Bottom Navigation */}
                <div className="bg-white border-t border-gray-200 p-2 grid grid-cols-3 text-center text-[10px] text-gray-500">
                  <div className="text-blue-600 font-bold">📅 Calendar</div>
                  <div>🏡 Properties</div>
                  <div>👤 Profile</div>
                </div>
              </div>
            </div>
          </div>

          {/* Flutter Code Explorer */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden flex flex-col">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Code className="w-5 h-5 text-indigo-600" />
                <span className="font-bold text-xs text-gray-800">Flutter Source Code & Config</span>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold text-xs rounded-lg transition-colors flex items-center space-x-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            {/* File List Tabs */}
            <div className="bg-gray-100 p-2 flex items-center space-x-1 overflow-x-auto border-b border-gray-200">
              {codeFiles.map((f) => (
                <button
                  key={f.path}
                  onClick={() => setSelectedFile(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono shrink-0 transition-all ${
                    selectedFile.path === f.path
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.path.split('/').pop()}
                </button>
              ))}
            </div>

            {/* File Description */}
            <div className="px-4 py-2 bg-indigo-50/50 border-b border-indigo-100 text-xs text-indigo-900 font-medium flex items-center justify-between">
              <span>{selectedFile.description}</span>
              <span className="font-mono text-[10px] text-gray-400">{selectedFile.path}</span>
            </div>

            {/* Code Text Editor View */}
            <div className="flex-1 bg-gray-950 p-4 font-mono text-[11px] text-emerald-400 overflow-auto max-h-[420px] select-text">
              <pre>{selectedFile.code}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
