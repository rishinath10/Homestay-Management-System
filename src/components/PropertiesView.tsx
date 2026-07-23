import React, { useState } from 'react';
import { Property, Staff, Role } from '../types';
import { 
  Home, MapPin, Users, Bed, Calendar, ShieldCheck, 
  Plus, Edit, Trash2, X, Save, Image, Tag, Compass, AlertCircle, Lock 
} from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, logActivity } from '../lib/firebase';

interface PropertiesViewProps {
  properties: Property[];
  staffList: Staff[];
  onSelectPropertyForCalendar: (propertyId: string) => void;
  activeRole: Role;
}

const PRESET_COLORS = [
  { hex: '#1a73e8', label: 'Blue' },
  { hex: '#00897b', label: 'Teal' },
  { hex: '#e65100', label: 'Orange' },
  { hex: '#8e24aa', label: 'Purple' },
  { hex: '#43a047', label: 'Green' },
  { hex: '#d93025', label: 'Red' }
];

export const PropertiesView: React.FC<PropertiesViewProps> = ({
  properties,
  staffList,
  onSelectPropertyForCalendar,
  activeRole
}) => {
  const isSuperAdmin = activeRole === 'super_admin';

  // Modal / Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  
  // Inputs states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#1a73e8');
  const [imageUrl, setImageUrl] = useState('');
  const [bedrooms, setBedrooms] = useState(3);
  const [maxGuests, setMaxGuests] = useState(8);
  const [formError, setFormError] = useState<string | null>(null);

  const handleAddClick = () => {
    setEditingProperty(null);
    setName('');
    setCode('');
    setAddress('');
    setDescription('');
    setColor('#1a73e8');
    setImageUrl('');
    setBedrooms(4);
    setMaxGuests(12);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (prop: Property) => {
    setEditingProperty(prop);
    setName(prop.name);
    setCode(prop.code);
    setAddress(prop.address);
    setDescription(prop.description);
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
      await deleteDoc(doc(db, 'properties', prop.id));
      
      // Log activity
      await logActivity(
        'admin@pdvillas.com',
        'Super Admin',
        'super_admin',
        'Removed Villa',
        `Villa Name: ${prop.name}, Code: ${prop.code}`
      );
    } catch (err: any) {
      alert(`Failed to delete villa: ${err.message || 'unknown error'}`);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name || !code || !address || !description || !imageUrl) {
      setFormError('Please fill in all fields.');
      return;
    }

    try {
      const propId = editingProperty?.id || `prop-${Date.now()}`;
      
      const propData: Property = {
        id: propId,
        name,
        code: code.toUpperCase().trim(),
        address,
        description,
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

      await setDoc(doc(db, 'properties', propId), propData, { merge: true });

      // Log activity
      await logActivity(
        'admin@pdvillas.com',
        'Super Admin',
        'super_admin',
        editingProperty ? 'Updated Villa' : 'Added Villa',
        `Villa Name: ${name}, Code: ${code}`
      );

      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save villa details.');
    }
  };

  return (
    <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Home className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">PD Holiday Villas Portfolio</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Managing Port Dickson, Malaysia luxury beachfront and family homestay properties.
            </p>
          </div>

          <div className="flex items-center space-x-3 self-start md:self-auto">
            <span className="px-3 py-1.5 bg-blue-50 text-blue-800 text-xs font-bold rounded-xl border border-blue-200">
              {properties.length} Active Villas
            </span>
            {isSuperAdmin && (
              <button
                onClick={handleAddClick}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Villa</span>
              </button>
            )}
          </div>
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
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">{prop.description}</p>
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
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
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

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Description *</label>
                  <textarea
                    required
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Charming tropical bird-themed homestay with BBQ..."
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
                    <span>Villa Picture URL *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                  />
                  {imageUrl && (
                    <div className="mt-2 h-20 w-32 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Theme Calendar Color *</label>
                  <div className="flex flex-wrap gap-2.5">
                    {PRESET_COLORS.map((col) => (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => setColor(col.hex)}
                        className={`w-7 h-7 rounded-full border-2 transition-all shrink-0 ${
                          color === col.hex ? 'border-black scale-110 shadow-md' : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: col.hex }}
                        title={col.label}
                      />
                    ))}
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
  );
};
