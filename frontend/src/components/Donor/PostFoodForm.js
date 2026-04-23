import { useState, useEffect, useRef } from 'react';
import { X, Upload, MapPin, Clock, Package, AlertCircle, Navigation } from 'lucide-react';
import { donationsAPI, uploadAPI } from '../../lib/api';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';
import toast from 'react-hot-toast';

export const PostFoodForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    quantity: '',
    foodType: 'prepared',
    expiryTime: '',
    pickupWindow: { start: '', end: '' },
    location: { address: '', lat: 0, lng: 0 }
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [locationLoading, setLocationLoading] = useState(false);

  const locationInputRef = useRef(null);
  const { isLoaded, loadError, createAutocomplete, getCurrentLocation, reverseGeocode } = useGoogleMaps();

  // Initialize autocomplete when Google Maps is loaded
  useEffect(() => {
    if (!isLoaded || !locationInputRef.current) {
      return;
    }

    try {
      const autocomplete = createAutocomplete(locationInputRef.current);

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          setFormData(prev => ({
            ...prev,
            location: {
              address: place.formatted_address,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            }
          }));
        }
      });

      console.log('✅ Google Places Autocomplete initialized');
    } catch (error) {
      console.error('Failed to initialize autocomplete:', error);
      toast.error('Location autocomplete unavailable. Please enter address manually.');
    }
  }, [isLoaded, createAutocomplete]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setImage(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview('');
  };

  const handleGetCurrentLocation = async () => {
    if (!isLoaded) {
      toast.error('Google Maps is not loaded yet. Please wait.');
      return;
    }

    setLocationLoading(true);
    try {
      const position = await getCurrentLocation();
      const locationData = await reverseGeocode(position.lat, position.lng);

      setFormData(prev => ({
        ...prev,
        location: {
          address: locationData.address,
          lat: locationData.lat,
          lng: locationData.lng
        }
      }));

      toast.success('Current location detected!');
    } catch (error) {
      console.error('Error getting current location:', error);
      if (error.code === 1) {
        toast.error('Location access denied. Please allow location access or enter address manually.');
      } else if (error.code === 2) {
        toast.error('Location unavailable. Please enter address manually.');
      } else if (error.code === 3) {
        toast.error('Location request timed out. Please try again or enter address manually.');
      } else {
        toast.error('Failed to get current location. Please enter address manually.');
      }
    } finally {
      setLocationLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.quantity.trim()) {
      newErrors.quantity = 'Quantity is required';
    }

    if (!formData.expiryTime) {
      newErrors.expiryTime = 'Expiry time is required';
    }

    if (!formData.pickupWindow.start || !formData.pickupWindow.end) {
      newErrors.pickupWindow = 'Pickup window is required';
    }

    if (!formData.location.address.trim()) {
      newErrors.location = 'Location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadImage = async (file) => {
    try {
      console.log('📤 Uploading image...', file.name);
      const formData = new FormData();
      formData.append('image', file);

      const response = await uploadAPI.uploadImage(formData);
      console.log('✅ Image uploaded successfully:', response.data);
      return response.data.imageUrl;
    } catch (error) {
      console.error('❌ Image upload error:', error);
      console.error('Error details:', error.response?.data);
      throw new Error(error.response?.data?.error || 'Failed to upload image');
    }
  };

  // In PostFoodForm.js - handleSubmit function ko update karo
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = '';

      // Upload image if selected
      if (image) {
        try {
          imageUrl = await uploadImage(image);
          toast.success('Image uploaded successfully');
        } catch (uploadError) {
          console.warn('Image upload failed, continuing without image:', uploadError);
          toast.error('Image upload failed. Posting donation without image.');
        }
      }

      // Proper location structure with coordinates
      const donationData = {
        title: formData.title,
        description: formData.description,
        quantity: formData.quantity,
        foodType: formData.foodType,
        expiryTime: formData.expiryTime,
        pickupWindow: {
          start: formData.pickupWindow.start,
          end: formData.pickupWindow.end
        },
        location: {
          address: formData.location.address,
          coordinates: {
            lat: formData.location.lat,
            lng: formData.location.lng
          }
        },
        status: 'available'
      };

      // Only add imageUrl if it was successfully uploaded
      if (imageUrl) {
        donationData.imageUrl = imageUrl;
      }

      console.log('📦 Submitting donation data:', JSON.stringify(donationData, null, 2));

      const response = await donationsAPI.create(donationData);
      console.log('✅ Donation posted successfully:', response.data);

      // 🎉 SUCCESS: Show success message
      toast.success('🎉 Donation posted successfully! NGOs near you will be notified.', {
        duration: 4000,
        icon: '✅'
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        quantity: '',
        foodType: 'prepared',
        expiryTime: '',
        pickupWindow: { start: '', end: '' },
        location: { address: '', lat: 0, lng: 0 }
      });
      setImage(null);
      setImagePreview('');

      // ✅ Close the form after successful submission
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(response.data); // Pass the new donation data to parent
        }
        onClose(); // Close the form modal
      }, 1500); // Small delay to show success message

    } catch (error) {
      console.error('❌ Post donation error:', error);
      let errorMessage = 'Failed to post donation';

      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      // 🚨 ERROR: Show detailed error message
      toast.error(`Donation failed: ${errorMessage}`, {
        duration: 5000,
        icon: '❌'
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-premium-hover max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide animate-scale-in relative border border-slate-100">
        {/* Decorative Top Gradient */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-400 to-emerald-600"></div>

        <div className="flex items-center justify-between p-8 border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <Package className="h-5 w-5 text-primary-500" />
              <span className="text-primary-600 font-bold uppercase tracking-widest text-[10px]">Surplus Rescue</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Post Surplus Food</h2>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900 active:scale-95"
            disabled={loading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Food Details Section */}
          <section className="space-y-6">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                <Package className="h-4 w-4" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800">Essential Details</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Food Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={`input-modern ${errors.title ? 'border-red-300 ring-red-50' : ''}`}
                  placeholder="e.g., Fresh Gourmet Sandwiches, Pizza Slices"
                  disabled={loading}
                />
                {errors.title && (
                  <p className="mt-2 text-xs text-red-600 font-bold flex items-center ml-1 animate-slide-up">
                    <AlertCircle className="h-3 w-3 mr-1.5" />
                    {errors.title}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="description" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className={`input-modern resize-none ${errors.description ? 'border-red-300 ring-red-50' : ''}`}
                  placeholder="Describe items, ingredients, packaging details..."
                  disabled={loading}
                />
                {errors.description && (
                  <p className="mt-2 text-xs text-red-600 font-bold flex items-center ml-1 animate-slide-up">
                    <AlertCircle className="h-3 w-3 mr-1.5" />
                    {errors.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="quantity" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Quantity / Servings
                  </label>
                  <input
                    type="text"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    className={`input-modern ${errors.quantity ? 'border-red-300 ring-red-50' : ''}`}
                    placeholder="e.g., 15 meals, 5 kg"
                    disabled={loading}
                  />
                  {errors.quantity && (
                    <p className="mt-2 text-xs text-red-600 font-bold flex items-center ml-1 animate-slide-up">
                      <AlertCircle className="h-3 w-3 mr-1.5" />
                      {errors.quantity}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="foodType" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Food Category
                  </label>
                  <select
                    id="foodType"
                    name="foodType"
                    value={formData.foodType}
                    onChange={handleInputChange}
                    className="input-modern appearance-none cursor-pointer"
                    disabled={loading}
                  >
                    <option value="prepared">Prepared Meals</option>
                    <option value="fresh">Fresh Produce</option>
                    <option value="packaged">Packaged Goods</option>
                    <option value="beverages">Beverages</option>
                    <option value="bakery">Bakery Items</option>
                    <option value="dairy">Dairy Products</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Timing Section */}
          <section className="space-y-6">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                <Clock className="h-4 w-4" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800">Freshness Window</h3>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="expiryTime" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Estimated Expiry *
                </label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    id="expiryTime"
                    name="expiryTime"
                    value={formData.expiryTime}
                    onChange={handleInputChange}
                    min={getCurrentDateTime()}
                    className={`input-modern pr-10 ${errors.expiryTime ? 'border-red-300 ring-red-50' : ''}`}
                    disabled={loading}
                  />
                  <Clock className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                </div>
                {errors.expiryTime && (
                  <p className="mt-2 text-xs text-red-600 font-bold flex items-center ml-1 animate-slide-up">
                    <AlertCircle className="h-3 w-3 mr-1.5" />
                    {errors.expiryTime}
                  </p>
                )}
              </div>

              <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-4">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                  Pickup Availability Window
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Available From</span>
                    <input
                      type="datetime-local"
                      id="pickupStart"
                      name="pickupWindow.start"
                      value={formData.pickupWindow.start}
                      onChange={handleInputChange}
                      min={getCurrentDateTime()}
                      className="input-modern bg-white text-xs py-3"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Until</span>
                    <input
                      type="datetime-local"
                      id="pickupEnd"
                      name="pickupWindow.end"
                      value={formData.pickupWindow.end}
                      onChange={handleInputChange}
                      min={formData.pickupWindow.start || getCurrentDateTime()}
                      className="input-modern bg-white text-xs py-3"
                      disabled={loading}
                    />
                  </div>
                </div>
                {errors.pickupWindow && (
                  <p className="mt-2 text-xs text-red-600 font-bold flex items-center ml-1 animate-slide-up">
                    <AlertCircle className="h-3 w-3 mr-1.5" />
                    {errors.pickupWindow}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Location Section */}
          <section className="space-y-6">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                <MapPin className="h-4 w-4" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800">Location</h3>
            </div>

            <div className="space-y-4">
              <label htmlFor="location" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Pickup Address
              </label>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <div className="relative flex-1">
                  <input
                    ref={locationInputRef}
                    type="text"
                    id="location"
                    name="location.address"
                    value={formData.location.address}
                    onChange={handleInputChange}
                    className={`input-modern pl-10 ${errors.location ? 'border-red-300 ring-red-50' : ''}`}
                    placeholder="Search address or use current location"
                    disabled={loading}
                  />
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-400" />
                </div>
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={loading || locationLoading || !isLoaded}
                  className="px-6 py-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center justify-center space-x-2 font-bold text-xs uppercase tracking-widest"
                >
                  {locationLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                  <span>GPS Sync</span>
                </button>
              </div>
              {errors.location && (
                <p className="mt-2 text-xs text-red-600 font-bold flex items-center ml-1 animate-slide-up">
                  <AlertCircle className="h-3 w-3 mr-1.5" />
                  {errors.location}
                </p>
              )}
            </div>
          </section>

          {/* Image Upload Area */}
          <section className="space-y-6">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                <Upload className="h-4 w-4" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800">Visual Evidence</h3>
            </div>

            <div className="group relative">
              {imagePreview ? (
                <div className="relative animate-scale-in">
                  <img
                    src={imagePreview}
                    alt="Food preview"
                    className="w-full h-72 object-cover rounded-[2.5rem] border-4 border-slate-50 shadow-premium"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-4 right-4 bg-red-500 text-white rounded-full p-3 shadow-xl hover:bg-red-600 transition-all hover:scale-110 active:scale-90"
                    disabled={loading}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-72 border-4 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/50 cursor-pointer hover:border-primary-200 hover:bg-primary-50/20 transition-all group overflow-hidden">
                  <div className="bg-white p-6 rounded-3xl shadow-sm group-hover:shadow-md transition-all group-hover:-translate-y-2">
                    <Upload className="h-10 w-10 text-primary-500" />
                  </div>
                  <div className="mt-6 text-center">
                    <span className="block text-slate-900 font-black text-sm uppercase tracking-widest mb-1">Add Food Photo</span>
                    <span className="block text-slate-400 text-xs font-medium">JPG, PNG up to 5MB</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
              )}
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 pt-8 border-t border-slate-100 pb-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 px-6 border border-slate-200 text-slate-400 font-bold rounded-2xl hover:bg-slate-50 hover:text-slate-900 transition-all uppercase tracking-widest text-xs"
              disabled={loading}
            >
              Discard Changes
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] btn-primary py-4 px-8 text-sm tracking-widest shadow-premium active:scale-95 transition-all"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-3"></div>
                  Posting Donation...
                </div>
              ) : (
                'Post Donation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
