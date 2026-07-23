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
  SendHorizontal
} from 'lucide-react';
import { Property, Role, Staff } from '../types';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';

interface SidebarProps {
  isOpen: boolean;
  onCloseSidebar?: () => void;
  activeTab: 'calendar' | 'properties' | 'staff' | 'ical' | 'notifications' | 'flutter' | 'settings';
  onSelectTab: (tab: 'calendar' | 'properties' | 'staff' | 'ical' | 'notifications' | 'flutter' | 'settings') => void;
  onCreateBookingClick: () => void;
  properties: Property[];
  selectedPropertyIds: string[];
  onTogglePropertyFilter: (propertyId: string) => void;
  onSelectAllProperties: () => void;
  currentDate: Date;
  onSelectDate: (date: Date) => void;
  activeRole: Role;
  activeStaff: Staff | null;
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
  activeStaff
}) => {
  const [miniCalMonth, setMiniCalMonth] = React.useState(currentDate);

  const handleTabClick = (tab: 'calendar' | 'properties' | 'staff' | 'ical' | 'notifications' | 'flutter' | 'settings') => {
    onSelectTab(tab);
    if (onCloseSidebar && window.innerWidth < 768) {
      onCloseSidebar();
    }
  };

  // Calculate mini calendar days
  const monthStart = startOfMonth(miniCalMonth);
  const monthEnd = endOfMonth(miniCalMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Filter properties based on role context
  const visibleProperties = (activeRole === 'super_admin' || activeRole === 'owner') 
    ? properties 
    : properties.filter(p => activeStaff?.assignedPropertyIds.includes(p.id));

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-xs z-30 md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onCloseSidebar}
      />

      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-72 md:w-64 bg-white border-r border-gray-200 h-full md:h-[calc(100vh-4rem)] overflow-y-auto flex flex-col p-4 shrink-0 transition-transform duration-300 ease-in-out select-none shadow-xl md:shadow-none ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
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

          <button
            onClick={() => handleTabClick('properties')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === 'properties' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Home className="w-4 h-4 text-teal-600" />
            <span>Villas ({visibleProperties.length})</span>
          </button>

          {(activeRole === 'super_admin' || activeRole === 'owner') && (
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

          {activeRole === 'super_admin' && (
            <button
              onClick={() => handleTabClick('flutter')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'flutter' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Smartphone className="w-4 h-4 text-indigo-600" />
              <span>Flutter Mobile App & APK</span>
            </button>
          )}
        </nav>

      {/* Mini Calendar Widget */}
      <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-800">
            {format(miniCalMonth, 'MMMM yyyy')}
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setMiniCalMonth(subMonths(miniCalMonth, 1))}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setMiniCalMonth(addMonths(miniCalMonth, 1))}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 mb-1">
          <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {daysInMonth.map((day) => {
            const isSelected = isSameDay(day, currentDate);
            return (
              <button
                key={day.toISOString()}
                onClick={() => onSelectDate(day)}
                className={`text-[11px] h-6 w-6 mx-auto rounded-full flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Property Isolation Filter Section */}
      <div className="flex-1 overflow-y-auto">
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

      <div className="mt-auto pt-4 border-t border-gray-200 text-center text-[10px] text-gray-400">
        PD Holiday Villas System v2.5
      </div>
    </aside>
    </>
  );
};
