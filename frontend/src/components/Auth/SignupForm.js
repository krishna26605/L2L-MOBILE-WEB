import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, MapPin, Navigation, Search, Phone } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

export const SignupForm = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    phone: '',
    role: 'donor',
    location: {
      address: '',
      coordinates: { lat: null, lng: null }
    },
    ngoDetails: {
      description: '',
      contactNumber: '',
      website: '',
      operationalRadius: 20
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [gettingLocation, setGettingLocation] = useState(false);
  
  // ✅ NEW: Auto-suggestion states
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const addressInputRef = useRef(null);

  const { signUp } = useAuth();
  const router = useRouter();

  // ✅ NEW: Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addressInputRef.current && !addressInputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleLocationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value
      }
    }));

    // ✅ NEW: Fetch address suggestions when user types
    if (field === 'address' && value.length > 2) {
      fetchAddressSuggestions(value);
    } else {
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }

    if (errors.location) {
      setErrors(prev => ({
        ...prev,
        location: ''
      }));
    }
  };

  const handleNGODetailsChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      ngoDetails: {
        ...prev.ngoDetails,
        [field]: value
      }
    }));
  };

  // ✅ NEW: Fetch address suggestions using OpenStreetMap Nominatim
  const fetchAddressSuggestions = async (query) => {
    if (!query || query.length < 3) return;
    
    setAddressLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`
      );
      
      if (response.ok) {
        const data = await response.json();
        setAddressSuggestions(data);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
    } finally {
      setAddressLoading(false);
    }
  };

  // ✅ NEW: Handle address selection from suggestions
  const handleAddressSelect = (suggestion) => {
    const address = suggestion.display_name;
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    
    setFormData(prev => ({
      ...prev,
      location: {
        address: address,
        coordinates: { lat, lng }
      }
    }));
    
    setAddressSuggestions([]);
    setShowSuggestions(false);
    toast.success('Address selected successfully!');
  };

  // ✅ ENHANCED: Get current location with better accuracy and reverse geocoding
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // ✅ NEW: Reverse geocode to get address from coordinates
          const address = await reverseGeocode(latitude, longitude);
          
          handleLocationChange('address', address);
          handleLocationChange('coordinates', { 
            lat: latitude, 
            lng: longitude 
          });
          
          setGettingLocation(false);
          toast.success('Location detected successfully!');
        } catch (error) {
          setGettingLocation(false);
          // Fallback: use coordinates if reverse geocoding fails
          const fallbackAddress = `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`;
          handleLocationChange('address', fallbackAddress);
          handleLocationChange('coordinates', { 
            lat: latitude, 
            lng: longitude 
          });
          toast.success('Location detected! Consider adding a proper address for better accuracy.');
        }
      },
      (error) => {
        setGettingLocation(false);
        let errorMessage = 'Unable to get your location. ';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access or enter address manually.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
            break;
        }
        
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000
      }
    );
  };

  // ✅ NEW: Reverse geocoding function
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.display_name || `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
      }
      throw new Error('Reverse geocoding failed');
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      throw error;
    }
  };

  // ✅ NEW: Auto-fetch location when NGO role is selected
  useEffect(() => {
    if (formData.role === 'ngo' && !formData.location.address && navigator.geolocation) {
      // Small delay to let user see the location section first
      const timer = setTimeout(() => {
        getCurrentLocation();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [formData.role]);

  const validateForm = () => {
    const newErrors = {};

    // Basic validations
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    } else if (formData.displayName.trim().length < 2) {
      newErrors.displayName = 'Display name must be at least 2 characters';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }

    // NGO-specific validations
    if (formData.role === 'ngo') {
      if (!formData.location.address?.trim()) {
        newErrors.location = 'NGO location address is required';
      }
      
      if (!formData.location.coordinates?.lat || !formData.location.coordinates?.lng) {
        newErrors.location = 'Valid coordinates are required for NGOs';
      }
      
      if (formData.location.coordinates?.lat) {
        const lat = formData.location.coordinates.lat;
        if (lat < -90 || lat > 90) {
          newErrors.location = 'Latitude must be between -90 and 90';
        }
      }
      
      if (formData.location.coordinates?.lng) {
        const lng = formData.location.coordinates.lng;
        if (lng < -180 || lng > 180) {
          newErrors.location = 'Longitude must be between -180 and 180';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      console.log('🔄 SignupForm: Attempting registration for:', formData.email, 'as', formData.role);
      console.log('📍 Location data:', formData.role === 'ngo' ? formData.location : 'Not required for donor');
      
      const signupData = {
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName.trim(),
        phone: formData.phone.trim(),
        role: formData.role
      };

      if (formData.role === 'ngo') {
        signupData.location = formData.location;
        signupData.ngoDetails = formData.ngoDetails;
      }

      const response = await signUp(signupData);
      
      console.log('✅ SignupForm: Registration successful!', response);
      
      // Verify auth data was saved to localStorage
      const storedData = localStorage.getItem('auth_token');
      console.log('💾 Token after signup:', storedData ? 'PRESENT' : 'MISSING');
      
      toast.success('Account created successfully!');
      
      let redirectPath = '/donor-dashboard';
      
      if (response?.redirectTo) {
        redirectPath = response.redirectTo;
        console.log('🎯 Using backend redirect:', redirectPath);
      } else if (response?.user?.role) {
        redirectPath = response.user.role === 'ngo' ? '/ngo-dashboard' : '/donor-dashboard';
        console.log('🎯 Determined redirect from role:', redirectPath);
      } else if (formData.role) {
        redirectPath = formData.role === 'ngo' ? '/ngo-dashboard' : '/donor-dashboard';
        console.log('🎯 Fallback redirect from form role:', redirectPath);
      }
      
      console.log('🔄 Redirecting to:', redirectPath);
      router.push(redirectPath);
      
    } catch (error) {
      console.error('❌ SignupForm: Registration failed!', error);
      
      let errorMessage = 'Signup failed. Please try again.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-premium p-8 sm:p-10 animate-fade-in max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-premium ring-4 ring-primary-50">
          <span className="text-white font-bold text-3xl">ZW</span>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Join ZeroWaste</h2>
        <p className="text-slate-500 mt-2.5 font-medium">Create your account to start making an impact</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Role Selection - Moved up for better flow */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <label className="block text-sm font-bold text-slate-700 mb-4 ml-1 uppercase tracking-wider">
            Register As
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className={`relative flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${
              formData.role === 'donor' 
                ? 'border-primary-500 bg-white shadow-premium scale-[1.02]' 
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}>
              <input
                type="radio"
                name="role"
                value="donor"
                checked={formData.role === 'donor'}
                onChange={handleChange}
                className="sr-only"
                disabled={loading}
              />
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                formData.role === 'donor' ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-400'
              }`}>
                <User className="h-6 w-6" />
              </div>
              <div className="text-center">
                <div className={`text-base font-bold ${formData.role === 'donor' ? 'text-slate-900' : 'text-slate-600'}`}>Donor</div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter mt-0.5">I have food</div>
              </div>
              {formData.role === 'donor' && (
                <div className="absolute -top-2 -right-2 bg-primary-500 text-white rounded-full p-1 shadow-sm">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </label>
            
            <label className={`relative flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer transition-all ${
              formData.role === 'ngo' 
                ? 'border-primary-500 bg-white shadow-premium scale-[1.02]' 
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}>
              <input
                type="radio"
                name="role"
                value="ngo"
                checked={formData.role === 'ngo'}
                onChange={handleChange}
                className="sr-only"
                disabled={loading}
              />
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                formData.role === 'ngo' ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-400'
              }`}>
                <MapPin className="h-6 w-6" />
              </div>
              <div className="text-center">
                <div className={`text-base font-bold ${formData.role === 'ngo' ? 'text-slate-900' : 'text-slate-600'}`}>NGO</div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter mt-0.5">I collect food</div>
              </div>
              {formData.role === 'ngo' && (
                <div className="absolute -top-2 -right-2 bg-primary-500 text-white rounded-full p-1 shadow-sm">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </label>
          </div>
          {errors.role && (
            <div className="flex items-center mt-3 ml-1 text-xs text-red-600 font-semibold uppercase tracking-wide">
              <AlertCircle className="h-3.5 w-3.5 mr-1" />
              {errors.role}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Display Name Field */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
              {formData.role === 'ngo' ? 'NGO Name' : 'Display Name'}
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary-500">
                <User className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="displayName"
                name="displayName"
                type="text"
                value={formData.displayName}
                onChange={handleChange}
                className={`input-modern pl-12 ${
                  errors.displayName ? 'border-red-300 bg-red-50' : ''
                }`}
                placeholder={formData.role === 'ngo' ? 'NGO Name' : 'Your name'}
                disabled={loading}
              />
            </div>
            {errors.displayName && (
              <div className="flex items-center mt-2 ml-1 text-xs text-red-600 font-medium">
                <AlertCircle className="h-3.5 w-3.5 mr-1" />
                {errors.displayName}
              </div>
            )}
          </div>

          {/* Phone Number Field */}
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
              Mobile Number
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary-500">
                <Phone className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className={`input-modern pl-12 ${
                  errors.phone ? 'border-red-300 bg-red-50' : ''
                }`}
                placeholder="+1 234 567 890"
                disabled={loading}
              />
            </div>
            {errors.phone && (
              <div className="flex items-center mt-2 ml-1 text-xs text-red-600 font-medium">
                <AlertCircle className="h-3.5 w-3.5 mr-1" />
                {errors.phone}
              </div>
            )}
          </div>

          {/* Email Field */}
          <div className="md:col-span-2">
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
              Email Address
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary-500">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={`input-modern pl-12 ${
                  errors.email ? 'border-red-300 bg-red-50' : ''
                }`}
                placeholder="email@example.com"
                disabled={loading}
              />
            </div>
            {errors.email && (
              <div className="flex items-center mt-2 ml-1 text-xs text-red-600 font-medium">
                <AlertCircle className="h-3.5 w-3.5 mr-1" />
                {errors.email}
              </div>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
              Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary-500">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                className={`input-modern pl-12 pr-12 ${
                  errors.password ? 'border-red-300 bg-red-50' : ''
                }`}
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <div className="flex items-center mt-2 ml-1 text-xs text-red-600 font-medium">
                <AlertCircle className="h-3.5 w-3.5 mr-1" />
                {errors.password}
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
              Confirm Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary-500">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`input-modern pl-12 pr-12 ${
                  errors.confirmPassword ? 'border-red-300 bg-red-50' : ''
                }`}
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <div className="flex items-center mt-2 ml-1 text-xs text-red-600 font-medium">
                <AlertCircle className="h-3.5 w-3.5 mr-1" />
                {errors.confirmPassword}
              </div>
            )}
          </div>
        </div>

        {/* NGO Location Section */}
        {formData.role === 'ngo' && (
          <div className="bg-primary-50/50 p-6 rounded-2xl border border-primary-100 animate-slide-up">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center mr-3">
                <MapPin className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">NGO Location Details</h3>
            </div>
            
            <p className="text-xs text-slate-500 font-medium mb-5 leading-relaxed">
              Your location is used to match you with nearby donations. This information is visible to donors when you claim a donation.
            </p>
            
            {/* Location Address */}
            <div className="mb-6 relative" ref={addressInputRef}>
              <label className="block text-xs font-bold text-slate-700 mb-2 ml-1 uppercase tracking-tighter">
                NGO Address <span className="text-primary-500 font-black">*</span>
              </label>
              <div className="flex space-x-3">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.location.address}
                    onChange={(e) => handleLocationChange('address', e.target.value)}
                    onFocus={() => formData.location.address.length > 2 && setShowSuggestions(true)}
                    className={`input-modern pl-11 py-2.5 text-sm ${
                      errors.location ? 'border-red-300 bg-red-50' : ''
                    }`}
                    placeholder="Search NGO address..."
                    disabled={loading}
                  />
                  
                  {addressLoading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500/30 border-t-primary-500"></div>
                    </div>
                  )}
                  
                  {showSuggestions && addressSuggestions.length > 0 && (
                    <div className="absolute z-20 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-premium-hover max-h-60 overflow-y-auto animate-scale-in">
                      {addressSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleAddressSelect(suggestion)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-b-0 transition-colors group"
                        >
                          <div className="font-bold text-slate-900 text-xs truncate group-hover:text-primary-600">
                            {suggestion.display_name.split(',').slice(0, 2).join(',')}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate uppercase tracking-tighter">
                            {suggestion.display_name}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={loading || gettingLocation}
                  className="btn-secondary px-4 py-2.5 rounded-xl border-slate-200"
                  title="Detect my location"
                >
                  {gettingLocation ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-400/30 border-t-slate-500"></div>
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Coordinates Badge */}
            <div className="flex items-center justify-between">
              {formData.location.coordinates.lat && formData.location.coordinates.lng ? (
                <div className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-[10px] font-black uppercase tracking-widest animate-fade-in shadow-sm border border-primary-200">
                  <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-2 animate-pulse"></div>
                  Location Verified
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 italic">No coordinates set</div>
              )}

              <div className="flex items-center space-x-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Operational Radius</label>
                <select
                  value={formData.ngoDetails.operationalRadius}
                  onChange={(e) => handleNGODetailsChange('operationalRadius', parseInt(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-2 py-1 outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500"
                  disabled={loading}
                >
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={20}>20 km</option>
                  <option value={50}>50 km</option>
                </select>
              </div>
            </div>

            {errors.location && (
              <div className="flex items-center mt-4 text-xs text-red-600 font-semibold animate-slide-up">
                <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                {errors.location}
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 text-base tracking-wide"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-3"></div>
                Initializing impact...
              </div>
            ) : (
              'Create Free Account'
            )}
          </button>
          
          <p className="text-[10px] text-slate-400 text-center mt-4 uppercase tracking-widest font-bold">
            By joining, you agree to our <span className="text-slate-600 underline">Terms of Service</span>
          </p>
        </div>
      </form>

      {/* Switch to Login */}
      <div className="mt-8 text-center bg-slate-50 -mx-8 -mb-8 p-6 border-t border-slate-100 sm:-mx-10 sm:-mb-10 rounded-b-2xl">
        <p className="text-slate-600 text-sm font-medium">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-primary-600 hover:text-primary-700 font-bold transition-colors ml-1"
            disabled={loading}
          >
            Sign in here
          </button>
        </p>
      </div>
    </div>
  );
};