import { useState, useRef, useEffect } from 'react';
import { X, AlertTriangle, MapPin, Navigation, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { alertsAPI } from '../../lib/api';
import { getSocket } from '../../lib/socket';

export const EmergencyAlertForm = ({ onClose, onSuccess, userLocation }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    area: '',
    severity: 'high',
    peopleAffected: 0,
    location: {
      address: userLocation?.address || '',
      coordinates: {
        lat: userLocation?.coordinates?.lat || 0,
        lng: userLocation?.coordinates?.lng || 0
      }
    }
  });
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          setFormData(prev => ({
            ...prev,
            location: {
              address: data.display_name || `${latitude}, ${longitude}`,
              coordinates: { lat: latitude, lng: longitude }
            },
            area: data.address?.suburb || data.address?.city || data.address?.town || ''
          }));
          toast.success('Location detected!');
        } catch {
          setFormData(prev => ({
            ...prev,
            location: {
              address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              coordinates: { lat: latitude, lng: longitude }
            }
          }));
        }
        setGettingLocation(false);
      },
      () => {
        toast.error('Could not get location');
        setGettingLocation(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.area) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!formData.location.coordinates.lat) {
      toast.error('Please set the affected area location');
      return;
    }

    setLoading(true);
    try {
      const response = await alertsAPI.create(formData);
      
      // Broadcast via socket
      const socket = getSocket();
      if (socket) {
        socket.emit('emergency-alert', response.data.alert);
      }

      toast.success('🚨 Emergency alert posted!');
      if (onSuccess) onSuccess(response.data.alert);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to post alert');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] shadow-premium-hover max-w-lg w-full animate-scale-in relative overflow-hidden border border-slate-100 my-auto">
        {/* Urgent Decorative Bar */}
        <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-red-600 via-orange-500 to-red-700"></div>

        <div className="flex items-center justify-between p-8 border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 animate-pulse">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <span className="text-red-600 font-bold uppercase tracking-widest text-[10px]">Priority Broadcast</span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Emergency Alert</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900 active:scale-95"
            disabled={loading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-7">
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
              Broadcast Title
            </label>
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Immediate Food Rescue Needed in Sector 7"
              className="input-modern border-red-100 focus:ring-red-500/20 focus:border-red-500"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
              Mission Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Detail the urgency, estimated volume, and type of food required..."
              className="input-modern resize-none border-red-50 border-red-100 focus:ring-red-500/20 focus:border-red-500"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                Affected Hub
              </label>
              <div className="relative">
                <input
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  placeholder="e.g., Slum Area A"
                  className="input-modern pl-10"
                  disabled={loading}
                />
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                Severity Level
              </label>
              <select
                name="severity"
                value={formData.severity}
                onChange={handleChange}
                className="input-modern border-red-100 cursor-pointer appearance-none"
                disabled={loading}
              >
                <option value="critical">🔴 Critical Response</option>
                <option value="high">🟠 High Urgency</option>
                <option value="medium">🟡 Medium Concern</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
              Expected Beneficiaries
            </label>
            <div className="relative group">
              <input
                type="number"
                name="peopleAffected"
                value={formData.peopleAffected}
                onChange={handleChange}
                min="0"
                className="input-modern pl-10"
                disabled={loading}
              />
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
              Rescue Site GPS
            </label>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <div className="relative flex-1">
                <input
                  value={formData.location.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: { ...prev.location, address: e.target.value } }))}
                  placeholder="Identify landing site address"
                  className="input-modern pl-10"
                  disabled={loading}
                />
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-400" />
              </div>
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="px-6 py-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center justify-center space-x-2 font-bold text-xs uppercase tracking-widest"
              >
                {gettingLocation ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
                <span>Site GPS</span>
              </button>
            </div>
            {formData.location.coordinates.lat > 0 && (
              <div className="flex items-center space-x-2 mt-2 ml-1 text-[10px] font-black text-emerald-600 uppercase tracking-tighter animate-fade-in">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                <span>Signal Locked: {formData.location.coordinates.lat.toFixed(4)}, {formData.location.coordinates.lng.toFixed(4)}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 pt-4 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 px-6 border border-slate-200 text-slate-400 font-bold rounded-2xl hover:bg-slate-50 hover:text-slate-900 transition-all uppercase tracking-widest text-xs"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[1.5] py-4 px-8 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center font-black uppercase tracking-widest text-xs"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-3" />
                  INITIATE EMERGENCY BROADCAST
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

