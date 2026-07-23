import React from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  Wifi, 
  WifiOff, 
  User as UserIcon, 
  LogOut, 
  Check, 
  ShieldAlert, 
  Smartphone,
  MessageSquare
} from 'lucide-react';
import { CalendarViewMode, Role, Staff } from '../types';
import { format } from 'date-fns';

interface HeaderProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onNavigateDate: (direction: 'prev' | 'next' | 'today') => void;
  onToggleSidebar: () => void;
  activeRole: Role;
  activeStaff: Staff | null;
  staffList: Staff[];
  onSelectRoleContext: (role: Role, staff: Staff | null) => void;
  isOnline: boolean;
  userEmail?: string | null;
  userName?: string | null;
  userPhoto?: string | null;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  viewMode,
  onViewModeChange,
  onNavigateDate,
  onToggleSidebar,
  activeRole,
  activeStaff,
  staffList,
  onSelectRoleContext,
  isOnline,
  userEmail,
  userName,
  userPhoto,
  onGoogleSignIn,
  onSignOut
}) => {
  const [showRoleDropdown, setShowRoleDropdown] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-3 sm:px-4 flex items-center justify-between sticky top-0 z-30 shadow-xs select-none">
      {/* Left Section: Drawer Toggle, Month navigation */}
      <div className="flex items-center space-x-1 sm:space-x-3 shrink min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-full transition-colors focus:outline-hidden shrink-0"
          title="Toggle Navigation Drawer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo (Hidden on mobile) */}
        <div className="hidden md:flex items-center space-x-2 mr-1 sm:mr-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 via-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-xs font-bold text-lg">
            <CalendarIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-gray-900 text-sm sm:text-base leading-none">PD Holiday Villas</span>
            </div>
            <p className="text-xs text-gray-500">Port Dickson Homestay System</p>
          </div>
        </div>

        {/* Navigation Arrows (Hidden on mobile) */}
        <div className="hidden sm:flex items-center space-x-0.5 sm:space-x-1 shrink-0">
          <button
            onClick={() => onNavigateDate('prev')}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            title="Previous Period"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={() => onNavigateDate('next')}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            title="Next Period"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <h1 className="text-sm sm:text-lg font-bold sm:font-semibold text-gray-800 ml-1 truncate">
          {format(currentDate, 'MMM yyyy')}
        </h1>
      </div>

      {/* Right Section: View Mode, Role Switcher, Auth & Sync */}
      <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
        {/* Today Button */}
        <button
          onClick={() => onNavigateDate('today')}
          className="px-2.5 sm:px-3.5 py-1 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-full transition-colors focus:outline-hidden shrink-0"
        >
          Today
        </button>

        {/* Offline / Online Status Indicator (Hidden on mobile) */}
        <div 
          className={`hidden md:flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isOnline 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
          }`}
          title={isOnline ? 'Online real-time sync active' : 'Offline mode: Changes cached locally'}
        >
          {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-amber-600" />}
          <span className="hidden lg:inline">{isOnline ? 'Realtime Sync' : 'Offline Mode'}</span>
        </div>

        {/* View Mode Dropdown / Segmented Control */}
        <div className="bg-gray-100 p-0.5 rounded-lg flex items-center text-[10px] sm:text-xs font-medium text-gray-700 shrink-0">
          <button
            onClick={() => onViewModeChange('month')}
            className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md transition-all ${
              viewMode === 'month' ? 'bg-white text-blue-600 shadow-xs font-semibold' : 'hover:text-gray-900'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => onViewModeChange('day')}
            className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md transition-all ${
              viewMode === 'day' ? 'bg-white text-blue-600 shadow-xs font-semibold' : 'hover:text-gray-900'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => onViewModeChange('agenda')}
            className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md transition-all ${
              viewMode === 'agenda' ? 'bg-white text-blue-600 shadow-xs font-semibold' : 'hover:text-gray-900'
            }`}
          >
            List
          </button>
        </div>

        {/* Role Display Badge (Hidden on mobile) */}
        <div className="hidden lg:flex items-center">
          <span className={`px-3 py-1 rounded-lg text-xs font-bold border flex items-center space-x-1 shrink-0 ${
            activeRole === 'super_admin'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : activeRole === 'owner'
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : 'bg-teal-50 text-teal-800 border-teal-200'
          }`}>
            <span>
              {activeRole === 'super_admin' && '👑'}
              {activeRole === 'owner' && '💼'}
              {activeRole === 'staff' && '👤'}
            </span>
            <span>
              {activeRole === 'super_admin' && 'Super Admin'}
              {activeRole === 'owner' && 'Jeff (Owner)'}
              {activeRole === 'staff' && `Staff: ${activeStaff?.name || 'Member'}`}
            </span>
          </span>
        </div>

        {/* Sign Out Button (Hidden on mobile) */}
        <button
          onClick={onSignOut}
          className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-colors border border-red-200 shrink-0"
          title="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5 text-red-600" />
          <span>Sign Out</span>
        </button>

        {/* User Google Account Menu */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-1.5 p-1 hover:bg-gray-100 rounded-full transition-colors border border-gray-200"
          >
            {activeStaff?.avatarUrl ? (
              <img src={activeStaff.avatarUrl} alt={userName || 'User'} className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center">
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-900">{userName}</p>
                <p className="text-[11px] text-gray-500 truncate">{userEmail}</p>
                <p className="text-[10px] mt-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 font-bold uppercase rounded w-fit">
                  {activeRole === 'super_admin' ? 'Super Admin' : activeRole === 'owner' ? 'Owner' : 'Staff'}
                </p>
              </div>

              <button
                onClick={() => {
                  onSignOut();
                  setShowUserMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
