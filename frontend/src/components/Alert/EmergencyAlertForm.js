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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6" />
            <h3 className="font-semibold text-lg">Post Emergency Alert</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alert Title *</label>
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Urgent food needed in Andheri"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Describe the situation and what kind of food is needed..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Affected Area *</label>
              <input
                name="area"
                value={formData.area}
                onChange={handleChange}
                placeholder="e.g., Andheri West"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                name="severity"
                value={formData.severity}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="critical">🔴 Critical</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">People Affected (approx.)</label>
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-gray-400" />
              <input
                type="number"
                name="peopleAffected"
                value={formData.peopleAffected}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
            <div className="flex space-x-2">
              <input
                value={formData.location.address}
                onChange={(e) => setFormData(prev => ({ ...prev, location: { ...prev.location, address: e.target.value } }))}
                placeholder="Enter affected area address"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {gettingLocation ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Navigation className="h-4 w-4" />
                )}
              </button>
            </div>
            {formData.location.coordinates.lat > 0 && (
              <p className="text-xs text-green-600 mt-1">✅ Location set</p>
            )}
          </div>

          <div className="flex space-x-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 transition-colors" disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center">
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Post Alert
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
