import React, { useState } from 'react';
import { Property, Staff, Role } from '../types';
import { 
  Home, MapPin, Users, Bed, Calendar, ShieldCheck, 
  Plus, Edit, Trash2, X, Save, Image, Tag, Compass, AlertCircle, Lock,
  ChevronLeft, Menu
} from 'lucide-react';
import { supabase, logActivity } from '../lib/supabase';

interface PropertiesViewProps {
  properties: Property[];
  staffList: Staff[];
  onSelectPropertyForCalendar: (propertyId: string) => void;
  activeRole: Role;
  userEmail?: string;
  userName?: string;
  onRefreshData?: () => Promise<void>;
  onBackToCalendar?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

const PRESET_COLORS = [
  { hex: '#1a73e8', label: 'Blue' },
  { hex: '#00897b', label: 'Teal' },
  { hex: '#e65100', label: 'Orange' },
  { hex: '#8e24aa', label: 'Purple' },
  { hex: '#43a047', label: 'Green' },
  { hex: '#d93025', label: 'Red' },
  { hex: '#eab308', label: 'Yellow' },
  { hex: '#18181b', label: 'Black' },
  { hex: '#d97706', label: 'Amber' },
  { hex: '#db2777', label: 'Pink' },
  { hex: '#0284c7', label: 'Sky Blue' },
  { hex: '#7c3aed', label: 'Violet' },
  { hex: '#059669', label: 'Emerald' },
  { hex: '#4b5563', label: 'Slate Gray' }
];

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    // Fail-safe timeout after 5 seconds to prevent freezing
    const timeoutId = setTimeout(() => {
      const fallbackReader = new FileReader();
      fallbackReader.onload = () => resolve(fallbackReader.result as string);
      fallbackReader.onerror = () => resolve('');
      fallbackReader.readAsDataURL(file);
    }, 5000);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        clearTimeout(timeoutId);
        try {
          const canvas = document.createElement('canvas');
          let width = img.width || 800;
          let height = img.height || 600;

          const MAX_SIZE = 800;
          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round(height * (MAX_SIZE / width));
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round(width * (MAX_SIZE / height));
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            resolve(dataUrl);
          } else {
            resolve(event.target?.result as string);
          }
        } catch (e) {
          console.warn('Canvas compression fallback:', e);
          resolve(event.target?.result as string);
        }
      };

      img.onerror = () => {
        clearTimeout(timeoutId);
        resolve(event.target?.result as string);
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      clearTimeout(timeoutId);
      resolve('');
    };
  });
};

export const PropertiesView: React.FC<PropertiesViewProps> = ({
  properties,
  staffList,
  onSelectPropertyForCalendar,
  activeRole,
  userEmail,
  userName,
  onRefreshData,
  onBackToCalendar,
  isSidebarOpen,
  onToggleSidebar
}) => {
  const isSuperAdmin = activeRole === 'super_admin';
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [color, setColor] = useState('#1a73e8');
  const [bedrooms, setBedrooms] = useState<number>(3);
  const [maxGuests, setMaxGuests] = useState<number>(10);
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleAddClick = () => {
    setEditingProperty(null);
    setName('');
    setCode('');
    setAddress('');
    setColor('#1a73e8');
    setBedrooms(3);
    setMaxGuests(10);
    setImageUrl('https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (prop: Property) => {
    setEditingProperty(prop);
    setName(prop.name);
    setCode(prop.code);
    setAddress(prop.address);
    setColor(prop.color);
    setImageUrl(prop.imageUrl);
    setBedrooms(prop.bedrooms);
    setMaxGuests(prop.maxGuests);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (prop: Property) => {
    if (!window.confirm(`Are you sure you want to remove the villa "${prop.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await supabase.from('properties').delete().eq('id', prop.id);
      
      if (onRefreshData) {
        await onRefreshData();
      }

      // Log activity
      await logActivity(
        userEmail || 'admin@pdvillas.com',
        userName || 'Super Admin',
        activeRole,
        'Removed Villa',
        `Villa Name: ${prop.name}, Code: ${prop.code}`
      );
    } catch (err: any) {
      alert(`Failed to delete villa: ${err.message || 'unknown error'}`);
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFormError(null);
    try {
      const dataUrl = await compressImage(file);
      setImageUrl(dataUrl);
    } catch (err: any) {
      setFormError('Failed to process image file.');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name || !code || !address || !imageUrl) {
      setFormError('Please fill in all fields (name, code, address, and upload a picture).');
      return;
    }

    try {
      const propId = editingProperty?.id || `prop-${Date.now()}`;
      
      const propData: Property = {
        id: propId,
        name,
        code: code.toUpperCase().trim(),
        address,
        description: editingProperty?.description || '',
        color,
        imageUrl,
        bedrooms: Number(bedrooms),
        maxGuests: Number(maxGuests),
        icalUrls: editingProperty?.icalUrls || {
          airbnb: '',
          bookingCom: '',
          agoda: ''
        }
      };

      const { error: upsertErr } = await supabase.from('properties').upsert(propData);
      if (upsertErr) {
        setFormError(`Failed to save villa: ${upsertErr.message}`);
        return;
      }

      if (onRefreshData) {
        await onRefreshData();
      }

      // Log activity
      await logActivity(
        userEmail || 'admin@pdvillas.com',
        userName || 'Super Admin',
        activeRole,
        editingProperty ? 'Updated Villa' : 'Added Villa',
        `Villa Name: ${name}, Code: ${code}`
      );

      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save villa details.');
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
            <Home className="w-4.5 h-4.5 text-blue-600" />
            <span>Villa Properties Portfolio</span>
          </h1>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <span className="px-2.5 py-1 bg-blue-50 text-blue-800 text-[11px] font-bold rounded-lg border border-blue-200">
            {properties.length} Active Villas
          </span>
          {isSuperAdmin && (
            <button
              onClick={handleAddClick}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Add Villa</span>
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
                <Home className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">Villas Portfolio</h1>
              </div>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-800 text-[10px] font-bold rounded-lg border border-blue-200">
                {properties.length} Villas
              </span>
            </div>
            {isSuperAdmin && (
              <button
                onClick={handleAddClick}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Villa</span>
              </button>
            )}
          </div>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((prop) => {
            // Find staff assigned to this property
            const assignedStaff = staffList.filter((s) => s.assignedPropertyIds.includes(prop.id));

            return (
              <div
                key={prop.id}
                className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-2xs hover:shadow-lg transition-all flex flex-col group relative"
              >
                {/* Photo Header */}
                <div className="h-44 relative overflow-hidden bg-gray-100">
                  <img
                    src={prop.imageUrl}
                    alt={prop.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-xs font-mono font-bold rounded-lg">
                    {prop.code}
                  </div>
                  <div
                    className="absolute top-3 right-3 w-4 h-4 rounded-full border-2 border-white shadow-xs"
                    style={{ backgroundColor: prop.color }}
                  />
                </div>

                {/* Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base leading-tight">{prop.name}</h3>
                    <p className="text-xs text-gray-500 mt-1 flex items-start space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{prop.address}</span>
                    </p>
                  </div>

                  {/* Specs */}
                  <div className="grid grid-cols-2 gap-2 py-2 border-y border-gray-100 text-xs text-gray-700">
                    <div className="flex items-center space-x-1.5">
                      <Bed className="w-4 h-4 text-blue-600" />
                      <span><strong>{prop.bedrooms}</strong> Bedrooms</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Users className="w-4 h-4 text-emerald-600" />
                      <span>Max <strong>{prop.maxGuests}</strong> Guests</span>
                    </div>
                  </div>

                  {/* Assigned Staff */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Assigned Management Staff
                    </p>
                    <div className="flex flex-wrap gap-1 min-h-[22px]">
                      {assignedStaff.length === 0 ? (
                        <span className="text-[11px] text-gray-400 italic">No staff assigned</span>
                      ) : (
                        assignedStaff.map((st) => (
                          <span
                            key={st.id}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 bg-gray-100 text-gray-800 rounded-md text-[11px] font-medium"
                          >
                            <ShieldCheck className="w-3 h-3 text-blue-600" />
                            <span>{st.name}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 w-full pt-1">
                    <button
                      onClick={() => onSelectPropertyForCalendar(prop.id)}
                      className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1.5"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>View Calendar Bookings</span>
                    </button>
                    {isSuperAdmin && (
                      <>
                        <button
                          onClick={() => handleEditClick(prop)}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors flex items-center justify-center shadow-2xs"
                          title="Edit Villa Details & Picture"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(prop)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-colors flex items-center justify-center shadow-2xs"
                          title="Delete Villa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add/Edit Modal Form Popup */}
        {isFormOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh] animate-zoom-in">
              {/* Modal Header */}
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Compass className="w-5 h-5 text-blue-400" />
                  <h2 className="text-base font-bold">
                    {editingProperty ? `Edit Villa: ${editingProperty.name}` : 'Add New Villa'}
                  </h2>
                </div>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form Scroll Area */}
              <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto text-xs text-gray-700">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center space-x-1">
                      <Tag className="w-3.5 h-3.5 text-gray-400" />
                      <span>Villa Name *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nuri"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center space-x-1">
                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                      <span>Villa Code *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="PD-NR"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>Address *</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Lot 1422, Jalan Pantai..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>



                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center space-x-1">
                      <Bed className="w-3.5 h-3.5 text-gray-400" />
                      <span>Bedrooms count *</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={bedrooms}
                      onChange={(e) => setBedrooms(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      <span>Max Guests capacity *</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={maxGuests}
                      onChange={(e) => setMaxGuests(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center space-x-1">
                    <Image className="w-3.5 h-3.5 text-gray-400" />
                    <span>Upload Villa Picture *</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-xs"
                  />
                  {isUploading && (
                    <p className="text-blue-600 font-bold text-[10px] mt-1 animate-pulse">Processing/Compressing picture...</p>
                  )}
                  {imageUrl && (
                    <div className="mt-2 h-24 w-40 border border-gray-200 rounded-xl overflow-hidden bg-gray-50 shadow-xs relative">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="absolute top-1.5 right-1.5 p-1 bg-red-600 hover:bg-red-750 text-white rounded-full transition-colors shadow-sm"
                        title="Remove image"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Theme Calendar Color *</label>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {PRESET_COLORS.map((col) => (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => setColor(col.hex)}
                        className={`w-7 h-7 rounded-full border-2 transition-all shrink-0 ${
                          color === col.hex ? 'border-blue-600 scale-110 shadow-md ring-2 ring-blue-300' : 'border-gray-200 hover:scale-105'
                        }`}
                        style={{ backgroundColor: col.hex }}
                        title={col.label}
                      />
                    ))}
                    <div className="relative flex items-center shrink-0 ml-1">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-7 h-7 rounded-full cursor-pointer border border-gray-300 p-0 overflow-hidden bg-transparent"
                        title="Custom Color Picker"
                      />
                      <span className="text-[10px] text-gray-500 font-medium ml-1.5">{color}</span>
                    </div>
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="pt-4 border-t border-gray-200 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-md transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Villa</span>
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

      </div>
    </div>
    </div>
  );
};
