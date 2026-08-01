import React from 'react';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Home, 
  Users, 
  MessageSquare, 
  Smartphone, 
  Settings, 
  CheckSquare, 
  Square,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldCheck,
  RefreshCw,
  SendHorizontal,
  LogOut,
  StickyNote
} from 'lucide-react';
import { Property, Role, Staff } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onCloseSidebar?: () => void;
  activeTab: 'calendar' | 'properties' | 'staff' | 'memos' | 'ical' | 'notifications' | 'settings';
  onSelectTab: (tab: 'calendar' | 'properties' | 'staff' | 'memos' | 'ical' | 'notifications' | 'settings') => void;
  onCreateBookingClick: () => void;
  properties: Property[];
  selectedPropertyIds: string[];
  onTogglePropertyFilter: (propertyId: string) => void;
  onSelectAllProperties: () => void;
  currentDate: Date;
  onSelectDate: (date: Date) => void;
  activeRole: Role;
  activeStaff: Staff | null;
  isOnline: boolean;
  userName: string | null;
  userEmail: string | null;
  onSignOut: () => void;
  onToggleSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onCloseSidebar,
  activeTab,
  onSelectTab,
  onCreateBookingClick,
  properties,
  selectedPropertyIds,
  onTogglePropertyFilter,
  onSelectAllProperties,
  currentDate,
  onSelectDate,
  activeRole,
  activeStaff,
  isOnline,
  userName,
  userEmail,
  onSignOut,
  onToggleSidebar
}) => {
  const handleTabClick = (tab: 'calendar' | 'properties' | 'staff' | 'memos' | 'ical' | 'notifications' | 'settings') => {
    onSelectTab(tab);
    if (onCloseSidebar && window.innerWidth < 768) {
      onCloseSidebar();
    }
  };

  const visibleProperties = React.useMemo(() => {
    return (activeRole === 'super_admin' || activeRole === 'owner') 
      ? properties 
      : properties.filter(p => activeStaff?.assignedPropertyIds?.includes(p.id) || false);
  }, [activeRole, properties, activeStaff]);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-xs z-30 md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onCloseSidebar}
      />

      <aside className={`fixed md:static inset-y-0 left-0 z-40 bg-white border-r border-gray-200 h-full overflow-y-auto flex flex-col p-4 shrink-0 transition-all duration-300 ease-in-out select-none shadow-xl md:shadow-none ${
        isOpen ? 'w-72 md:w-64 translate-x-0 opacity-100' : '-translate-x-full md:translate-x-0 md:w-0 md:p-0 md:border-r-0 md:opacity-0 overflow-hidden'
      }`}>
        {/* Sidebar Header: Logo & Collapse Button */}
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-2 shrink-0">
            <img
              src="/logo.jpg"
              alt="PD Villas Logo"
              className="w-8 h-8 rounded-lg object-cover shadow-xs"
            />
            <div>
              <div className="flex items-center space-x-1">
                <span className="font-bold text-gray-900 text-xs sm:text-sm leading-none">PDHV System</span>
                {/* Tiny Online/Offline Dot Indicator */}
                <div 
                  className={`w-2 h-2 rounded-full border border-white ${isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}
                  title={isOnline ? 'Online' : 'Offline'}
                />
              </div>
              <p className="text-[10px] text-gray-400">Homestay System</p>
            </div>
          </div>
          
          {/* Collapse Sidebar Button (Desktop only) */}
          <button
            onClick={onToggleSidebar}
            className="hidden md:flex p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Create Booking FAB (Only for Super Admin and Owner) */}
        {(activeRole === 'super_admin' || activeRole === 'owner') && (
          <button
            onClick={() => {
              onCreateBookingClick();
              if (onCloseSidebar && window.innerWidth < 768) onCloseSidebar();
            }}
            className="w-full py-3 px-5 bg-white hover:bg-blue-50 text-gray-800 rounded-2xl border border-gray-200 shadow-md hover:shadow-lg transition-all flex items-center space-x-3 group mb-6 focus:outline-hidden"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 via-red-500 to-yellow-500 p-0.5 flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                <Plus className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <span className="font-semibold text-sm text-gray-800">Create Booking</span>
          </button>
        )}

        {/* Navigation Sections */}
        <nav className="space-y-1 mb-6">
          <button
            onClick={() => handleTabClick('calendar')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'calendar' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <span>Calendar Schedule</span>
          </button>

          {(activeRole === 'super_admin' || activeRole === 'owner') && (
            <button
              onClick={() => handleTabClick('properties')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'properties' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Home className="w-4 h-4 text-teal-600" />
              <span>Villas ({visibleProperties.length})</span>
            </button>
          )}

          {activeRole === 'super_admin' && (
            <button
              onClick={() => handleTabClick('staff')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'staff' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4 text-purple-600" />
              <span>{activeRole === 'super_admin' ? 'Staff & Access Matrix' : 'Staff & Logs'}</span>
            </button>
          )}

          <button
            onClick={() => handleTabClick('memos')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'memos' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <StickyNote className="w-4 h-4 text-amber-500" />
            <span>Villa Memos & Passwords</span>
          </button>

          {activeRole === 'super_admin' && (
            <button
              onClick={() => handleTabClick('ical')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'ical' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <RefreshCw className="w-4 h-4 text-orange-600" />
              <span>iCal Sync (OTA Portals)</span>
            </button>
          )}

          {(activeRole === 'super_admin' || activeRole === 'owner') && (
            <button
              onClick={() => handleTabClick('notifications')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'notifications' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <SendHorizontal className="w-4 h-4 text-emerald-600" />
              <span>Alert Logs</span>
            </button>
          )}



          {(activeRole === 'super_admin' || activeRole === 'owner') && (
            <button
              onClick={() => handleTabClick('settings')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-4 h-4 text-slate-600" />
              <span>Database Settings</span>
            </button>
          )}

          <button
            onClick={onSignOut}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors mt-2"
          >
            <LogOut className="w-4 h-4 text-red-500" />
            <span>Sign Out</span>
          </button>
        </nav>

      {/* Property Isolation Filter Section */}
      <div className="py-2 shrink-0">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-800">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <span>My Properties</span>
          </div>
          <button
            onClick={onSelectAllProperties}
            className="text-[11px] font-medium text-blue-600 hover:underline"
          >
            Select All
          </button>
        </div>

        {activeRole === 'staff' && (
          <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-start space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Isolated to properties assigned to <strong>{activeStaff?.name}</strong>.</span>
          </div>
        )}

        <div className="space-y-1.5">
          {visibleProperties.map((prop) => {
            const isChecked = selectedPropertyIds.includes(prop.id);
            return (
              <button
                key={prop.id}
                onClick={() => onTogglePropertyFilter(prop.id)}
                className="w-full flex items-center space-x-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left transition-colors group"
              >
                <div 
                  className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                  style={{ backgroundColor: prop.color }}
                />
                <span className={`text-xs flex-1 truncate ${isChecked ? 'text-gray-900 font-medium' : 'text-gray-400 line-through'}`}>
                  {prop.name}
                </span>
                <span className="text-[10px] text-gray-400 group-hover:text-gray-600 font-mono">
                  {prop.code}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* User profile & Sign Out controls (Minimized) */}
      <div className="mt-auto pt-2 border-t border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          {activeStaff?.avatarUrl ? (
            <img src={activeStaff.avatarUrl} alt={userName || 'User'} className="w-7 h-7 rounded-full object-cover border border-gray-200" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-2xs">
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-gray-700 truncate leading-tight">{userName}</p>
            <p className="text-[9px] text-gray-400 truncate leading-none">
              {activeRole === 'super_admin' ? 'Admin' : activeRole === 'owner' ? 'Owner' : 'Staff'}
            </p>
          </div>
        </div>

        <button
          onClick={onSignOut}
          className="p-2.5 text-gray-550 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
          title="Sign Out"
        >
          <LogOut className="w-4.5 h-4.5" />
        </button>
      </div>
    </aside>
    </>
  );
};
