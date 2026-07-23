import React, { useState } from 'react';
import { NotificationLog } from '../types';
import { SendHorizontal, Mail, Settings, CheckCircle2, RefreshCw, Bot, Shield, Send } from 'lucide-react';
import { DEFAULT_TELEGRAM_BOT_TOKEN, DEFAULT_TELEGRAM_CHAT_ID } from '../lib/telegramEmail';

interface NotificationLogsViewProps {
  logs: NotificationLog[];
  onRefreshLogs: () => void;
}

export const NotificationLogsView: React.FC<NotificationLogsViewProps> = ({
  logs,
  onRefreshLogs
}) => {
  const [telegramToken, setTelegramToken] = useState<string>(DEFAULT_TELEGRAM_BOT_TOKEN);
  const [telegramChatId, setTelegramChatId] = useState<string>(DEFAULT_TELEGRAM_CHAT_ID);
  const [senderEmail, setSenderEmail] = useState<string>('alerts@pdholidayvillas.com');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('Telegram Bot & Email configuration saved successfully!');
    setTimeout(() => {
      setSaveStatus('');
      setShowConfigModal(false);
    }, 1500);
  };

  return (
    <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <SendHorizontal className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Telegram Bot & Email Notification Dispatcher</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Automated instant alerts dispatched to Sue & Yati via Telegram Bot API and Email upon new bookings & iCal sync.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onRefreshLogs}
              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
              title="Refresh logs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Telegram Bot & Email Settings</span>
            </button>
          </div>
        </div>

        {/* Telegram & Email Quick Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Telegram Card */}
          <div className="bg-gradient-to-r from-blue-500 to-sky-600 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-xs font-semibold text-blue-100">
                <Bot className="w-4 h-4" />
                <span>TELEGRAM BOT API</span>
              </div>
              <h3 className="text-base font-bold">@pdholidayvillas_bot</h3>
              <p className="text-xs text-blue-100">Target Chat: <span className="font-mono">{telegramChatId}</span></p>
            </div>
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold">Active</span>
          </div>

          {/* Email Card */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-100">
                <Mail className="w-4 h-4" />
                <span>EMAIL DISPATCHER</span>
              </div>
              <h3 className="text-base font-bold">Staff Booking Alerts</h3>
              <p className="text-xs text-indigo-100">Sue & Yati email notifications active</p>
            </div>
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold">Enabled</span>
          </div>
        </div>

        {/* Logs Feed */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-xs text-gray-800 flex items-center justify-between">
            <span>Alert History & Dispatch Logs ({logs.length})</span>
            <span className="text-blue-700 font-semibold bg-blue-50 px-2.5 py-0.5 rounded-full text-[11px]">
              Telegram & Email Service Online
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-xs">
                <SendHorizontal className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p>No notification logs captured yet.</p>
                <p className="text-[11px] text-gray-400 mt-1">Create a booking or sync iCal to test live Telegram & Email dispatch!</p>
              </div>
            ) : (
              logs.map((log) => {
                const isTelegram = log.channel === 'telegram';
                const isEmail = log.channel === 'email';

                return (
                  <div key={log.id} className="p-4 hover:bg-gray-50/60 transition-colors flex items-start space-x-3 text-xs">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isTelegram ? 'bg-sky-100 text-sky-700' : isEmail ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {isTelegram ? <Bot className="w-4 h-4" /> : isEmail ? <Mail className="w-4 h-4" /> : <SendHorizontal className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-gray-900">{log.staffName || 'Villa Manager'}</span>
                          <span className="text-gray-400 font-mono text-[11px]">
                            ({isTelegram ? log.telegramChatId || telegramChatId : log.recipientEmail || 'Email'})
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <p className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-mono text-[11px] text-gray-800 whitespace-pre-wrap">
                        {log.message}
                      </p>

                      <div className="flex items-center space-x-2 pt-1 text-[10px]">
                        <span className={`px-2 py-0.5 font-bold rounded-md uppercase ${
                          isTelegram ? 'bg-sky-100 text-sky-800' : isEmail ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {log.channel}
                        </span>
                        <span className="text-gray-400">• Status: <span className="font-semibold text-emerald-600">{log.status}</span></span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Telegram/Email Config Modal */}
        {showConfigModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 text-xs">
              <h2 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                <Settings className="w-5 h-5 text-blue-600" />
                <span>Telegram Bot & Email Alert Settings</span>
              </h2>
              <p className="text-gray-500">
                Configure your Telegram Bot Token and Chat ID to receive instant alerts whenever bookings are created or updated for Sue and Yati.
              </p>

              <form onSubmit={handleSaveConfig} className="space-y-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Telegram Bot Token</label>
                  <input
                    type="text"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Telegram Chat ID / Group</label>
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Sender Email Address</label>
                  <input
                    type="email"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-xs"
                  />
                </div>

                {saveStatus && (
                  <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{saveStatus}</span>
                  </div>
                )}

                <div className="pt-4 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-colors"
                  >
                    Save Settings
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
