import { useState, useEffect, useRef } from 'react';
import { Map, List, Navigation, Heart, Package, TrendingUp, Route, MapPin, Settings, RefreshCw, MessageCircle, Video, AlertTriangle, QrCode } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { donationsAPI, callsAPI } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { Navbar } from '../Layout/Navbar';
import { FoodMap } from './FoodMap';
import { DonationListItem } from './DonationListItem';
import { MultiLocationSelector } from './MultiLocationSelector';
import { RouteTracker } from './RouteTracker';
import { ChatWindow } from '../Chat/ChatWindow';
import { QRScanner } from '../QRScanner/QRScanner';
import { EmergencyAlertForm } from '../Alert/EmergencyAlertForm';
import { useNotifications } from '../../hooks/useNotifications';
import { Badge } from '../Common/Badge';
import toast from 'react-hot-toast';

// Radius Update Modal Component
const RadiusUpdateModal = ({ isOpen, onClose, currentRadius, onUpdate }) => {
  const [radius, setRadius] = useState(currentRadius);
  const [loading, setLoading] = useState(false);
  const { updateUserProfile } = useAuth();

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await updateUserProfile({
        ngoDetails: { operationalRadius: radius }
      });
      onUpdate(radius);
      onClose();
      toast.success(`Operational radius updated to ${radius}km!`);
    } catch (error) {
      console.error('Error updating radius:', error);
      toast.error('Failed to update radius');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Update Operational Radius
        </h3>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Current radius: <span className="font-bold text-green-600">{radius} km</span>
          </label>
          
          <input
            type="range"
            min="5"
            max="50"
            step="5"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
            className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer mb-2"
          />
          
          <div className="flex justify-between text-xs text-gray-500">
            <span>5km</span>
            <span>15km</span>
            <span>25km</span>
            <span>35km</span>
            <span>50km</span>
          </div>
          
          <p className="text-sm text-gray-600 mt-4">
            Increase your operational radius to see more donation options in your area.
            Larger radius = more donation options.
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Updating...' : 'Update Radius'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export const NGODashboard = () => {
  const { user, updateUserProfile } = useAuth();
  const [allDonations, setAllDonations] = useState([]); // All donations from API
  const [filteredDonations, setFilteredDonations] = useState([]); // Donations after filtering
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [viewMode, setViewMode] = useState('map');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [myDonations, setMyDonations] = useState([]);
  const [showMultiSelector, setShowMultiSelector] = useState(false);
  const [showRouteTracker, setShowRouteTracker] = useState(false);
  const [selectedRouteData, setSelectedRouteData] = useState([]);
  const [notification, setNotification] = useState(null);
  const [showLocationSetup, setShowLocationSetup] = useState(false);
  const [showRadiusUpdate, setShowRadiusUpdate] = useState(false);
  const [usingLocationFiltering, setUsingLocationFiltering] = useState(false);
  const [currentRadius, setCurrentRadius] = useState(20);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const refreshIntervalRef = useRef(null);
  const prevDonationsRef = useRef([]);
  const [chatDonation, setChatDonation] = useState(null);
  const { getUnreadCount } = useNotifications();
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);

  const handleVideoCall = async (donation) => {
    try {
      const res = await callsAPI.requestCall(donation._id);
      const socket = getSocket();
      if (socket) {
        socket.emit('call-request', {
          receiverId: donation.donorId?._id || donation.donorId,
          callRequest: res.data.callRequest
        });
      }
      toast.success('Video call request sent!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to request call');
    }
  };

  // Distance calculation function (Haversine formula)
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Real-time refresh setup
  useEffect(() => {
    if (user && autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        console.log('🔄 Auto-refreshing donations...');
        fetchAllDonations(false); // Silent refresh
      }, 30000);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [user, autoRefresh]);

  useEffect(() => {
    if (user) {
      setCurrentRadius(user?.ngoDetails?.operationalRadius || 20);
      fetchAllDonations();
      fetchMyDonations();
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'ngo') {
      if (!user.location || !user.location.coordinates) {
        setShowLocationSetup(true);
        setUsingLocationFiltering(false);
      } else {
        setUsingLocationFiltering(true);
      }
    }
  }, [user]);

  // ✅ UPDATED: Apply all filtering logic whenever dependencies change
  useEffect(() => {
    applyFilters();
  }, [allDonations, myDonations, filter, user, currentRadius]);

  // ✅ NEW: Main filtering function that handles everything
  const applyFilters = () => {
    console.log('🎯 Applying filters...');
    
    let filtered = [...allDonations];

    // Step 1: Filter by status and expiry
    filtered = filtered.filter(donation => {
      const isAvailable = donation.status === 'available';
      const isNotExpired = new Date(donation.expiryTime) > new Date();
      return isAvailable && isNotExpired;
    });

    console.log('📊 After status/expiry filter:', filtered.length);

    // Step 2: Apply location-based filtering if NGO has location
    if (user?.role === 'ngo' && user?.location?.coordinates && usingLocationFiltering) {
      const ngoLat = user.location.coordinates.lat;
      const ngoLng = user.location.coordinates.lng;
      
      console.log(`📍 NGO location: ${ngoLat}, ${ngoLng} (${currentRadius}km radius)`);
      
      filtered = filtered.filter(donation => {
        if (!donation.location?.coordinates) {
          console.log('❌ Donation missing coordinates:', donation.title);
          return false;
        }
        
        const distance = calculateDistance(
          ngoLat,
          ngoLng,
          donation.location.coordinates.lat,
          donation.location.coordinates.lng
        );
        
        const isWithinRadius = distance <= currentRadius;
        
        if (isWithinRadius) {
          console.log(`✅ "${donation.title}" - ${distance.toFixed(2)}km away`);
        } else {
          console.log(`❌ "${donation.title}" - ${distance.toFixed(2)}km away (outside radius)`);
        }
        
        return isWithinRadius;
      });
      
      console.log('📍 After location filter:', filtered.length);
    }

    // Step 3: Apply view filter
    switch (filter) {
      case 'available':
        // Already filtered above
        break;
      case 'claimed':
        filtered = myDonations.filter(d => d.status === 'claimed');
        break;
      case 'mine':
        filtered = myDonations;
        break;
      default:
        // 'all' - use the already filtered available donations
        break;
    }

    console.log('🎯 Final filtered donations:', filtered.length);
    setFilteredDonations(filtered);

    // Detect new donations for notifications
    const prevDonations = prevDonationsRef.current;
    const newDonations = filtered.filter(d => 
      !prevDonations.some(pd => pd._id === d._id)
    );

    if (newDonations.length > 0) {
      const notificationMessage = `🎉 ${newDonations.length} new donation${newDonations.length > 1 ? 's' : ''} available nearby!`;
      setNotification(notificationMessage);
      toast.success(notificationMessage, { duration: 5000 });
      setTimeout(() => setNotification(null), 5000);
    }

    prevDonationsRef.current = filtered;
  };

  // ✅ UPDATED: Fetch ALL donations (not just available)
  const fetchAllDonations = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      console.log('🏢 NGO Dashboard - Fetching ALL donations...');
      
      // Fetch all donations without filters
      const response = await donationsAPI.getAll();
      
      console.log('🔍 Full API Response:', response);
      
      // 🛠️ FIX: Handle different response formats
      let donationsData = [];
      
      if (response.data && Array.isArray(response.data)) {
        // Case 1: Response data is directly an array
        donationsData = response.data;
        console.log('📦 Response is direct array:', donationsData.length);
      } else if (response.data && response.data.donations && Array.isArray(response.data.donations)) {
        // Case 2: Response has donations property
        donationsData = response.data.donations;
        console.log('📦 Response has donations property:', donationsData.length);
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        // Case 3: Response has data property
        donationsData = response.data.data;
        console.log('📦 Response has data property:', donationsData.length);
      } else {
        // Case 4: Try to find any array in response
        console.warn('⚠️ Unknown response format, searching for array...');
        for (let key in response.data) {
          if (Array.isArray(response.data[key])) {
            donationsData = response.data[key];
            console.log(`🔄 Found array in key "${key}":`, donationsData.length);
            break;
          }
        }
      }
      
      console.log('📊 All donations from backend:', donationsData.length);
      
      // Debug first few donations
      if (donationsData.length > 0) {
        console.log('🔍 Sample donations:');
        donationsData.slice(0, 3).forEach((donation, index) => {
          console.log(`  ${index + 1}. "${donation.title}" - Status: ${donation.status}`, {
            coordinates: donation.location?.coordinates,
            expiryTime: donation.expiryTime,
            isExpired: new Date(donation.expiryTime) < new Date()
          });
        });
      }
      
      setAllDonations(donationsData);

    } catch (error) {
      console.error('❌ Error fetching donations:', error);
      toast.error('Failed to load donations');
      setAllDonations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch NGO's claimed donations
  const fetchMyDonations = async () => {
    try {
      const response = await donationsAPI.getAll({ 
        claimedBy: user?._id 
      });
      
      let myDonationsData = [];
      
      // Handle different response formats
      if (response.data && Array.isArray(response.data)) {
        myDonationsData = response.data;
      } else if (response.data && response.data.donations && Array.isArray(response.data.donations)) {
        myDonationsData = response.data.donations;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        myDonationsData = response.data.data;
      }
      
      setMyDonations(myDonationsData || []);
      console.log('📦 My claimed donations:', myDonationsData.length);
      
    } catch (error) {
      console.error('Error fetching my donations:', error);
      setMyDonations([]);
    }
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchAllDonations(false);
    await fetchMyDonations();
    setRefreshing(false);
    toast.success('Donations list updated!');
  };

  // Debug function
  const debugCurrentState = () => {
    console.log('🔍 DEBUG CURRENT STATE:', {
      user: {
        role: user?.role,
        location: user?.location,
        coordinates: user?.location?.coordinates,
        operationalRadius: user?.ngoDetails?.operationalRadius
      },
      donations: {
        all: allDonations,
        allCount: allDonations.length,
        filtered: filteredDonations,
        filteredCount: filteredDonations.length
      },
      myDonations: {
        all: myDonations,
        count: myDonations.length
      },
      usingLocationFiltering,
      currentRadius,
      filter
    });

    // Calculate distances for first few donations
    if (user?.location?.coordinates && allDonations.length > 0) {
      const ngoLat = user.location.coordinates.lat;
      const ngoLng = user.location.coordinates.lng;
      
      console.log('📍 DISTANCE CALCULATIONS:');
      allDonations.slice(0, 5).forEach((donation, index) => {
        if (donation.location?.coordinates) {
          const distance = calculateDistance(
            ngoLat,
            ngoLng,
            donation.location.coordinates.lat,
            donation.location.coordinates.lng
          );
          console.log(`  ${index + 1}. "${donation.title}" - ${distance.toFixed(2)}km - Status: ${donation.status}`);
        }
      });
    }
  };

  const handleClaimDonation = async (donation) => {
    if (!user || donation.status !== 'available') return;

    try {
      const response = await donationsAPI.claim(donation._id);
      toast.success('Donation claimed successfully!');
      
      if (response.data?.distance) {
        toast.success(`Donation is ${response.data.distance}km away`);
      }
      
      setTimeout(() => {
        if (confirm('Would you like to get directions to the pickup location?')) {
          handleViewRoute(donation);
        }
      }, 1000);
      
      // Refresh data after claiming
      fetchAllDonations(false);
      fetchMyDonations();
    } catch (error) {
      console.error('Error claiming donation:', error);
      const errorMessage = error.response?.data?.error || 'Failed to claim donation';
      toast.error(errorMessage);
    }
  };

  const handleViewRoute = (donation) => {
    if (!donation.location) {
      toast.error('Location information not available for this donation');
      return;
    }

    const openDirections = (userLat, userLng) => {
      if (donation.location.coordinates?.lat && donation.location.coordinates?.lng) {
        const url = `https://www.google.com/maps/dir/${userLat},${userLng}/${donation.location.coordinates.lat},${donation.location.coordinates.lng}`;
        window.open(url, '_blank');
      } else {
        const url = `https://www.google.com/maps/dir/${userLat},${userLng}/${encodeURIComponent(donation.location.address)}`;
        window.open(url, '_blank');
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          openDirections(latitude, longitude);
        }, 
        (error) => {
          console.error('Error getting current location:', error);
          toast.error('Unable to get your current location. Opening donation location...');
          
          const fallbackUrl = donation.location.coordinates?.lat && donation.location.coordinates?.lng 
            ? `https://www.google.com/maps/search/${donation.location.coordinates.lat},${donation.location.coordinates.lng}`
            : `https://www.google.com/maps/search/${encodeURIComponent(donation.location.address)}`;
          window.open(fallbackUrl, '_blank');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    } else {
      const fallbackUrl = donation.location.coordinates?.lat && donation.location.coordinates?.lng 
        ? `https://www.google.com/maps/search/${donation.location.coordinates.lat},${donation.location.coordinates.lng}`
        : `https://www.google.com/maps/search/${encodeURIComponent(donation.location.address)}`;
      window.open(fallbackUrl, '_blank');
    }
  };

  const handleStartMultiPickup = () => {
    const availableDonations = filteredDonations.filter(d => 
      d.status === 'available' && new Date(d.expiryTime) > new Date()
    );
    if (availableDonations.length > 0) {
      setShowMultiSelector(true);
    } else {
      toast.error('No available donations for multi-pickup');
    }
  };

  const handleStartRoute = (selectedDonations) => {
    setSelectedRouteData(selectedDonations);
    setShowMultiSelector(false);
    setShowRouteTracker(true);
  };

  const handleRouteComplete = () => {
    setShowRouteTracker(false);
    setSelectedRouteData([]);
    fetchAllDonations(false);
    fetchMyDonations();
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const location = {
            address: 'Current Location',
            coordinates: {
              lat: latitude,
              lng: longitude
            }
          };
          
          console.log('📍 Setting NGO location:', location);
          
          try {
            await updateUserProfile({ location });
            setShowLocationSetup(false);
            setUsingLocationFiltering(true);
            toast.success('Location set successfully! Refreshing nearby donations...');
            fetchAllDonations();
          } catch (error) {
            console.error('❌ Error saving location:', error);
            toast.error('Failed to save location');
          }
        },
        (error) => {
          console.error('❌ Error getting location:', error);
          toast.error('Unable to get your location. Please allow location access.');
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser.');
    }
  };

  const handleRadiusUpdate = (newRadius) => {
    setCurrentRadius(newRadius);
    // No need to refetch - filtering happens automatically via useEffect
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    toast(!autoRefresh ? 'Auto-refresh enabled (30s)' : 'Auto-refresh disabled');
  };

  // Stats calculation
  const stats = {
    available: filteredDonations.length,
    claimed: (myDonations || []).filter(d => d.status === 'claimed').length,
    completed: (myDonations || []).filter(d => d.status === 'picked').length,
    total: (myDonations || []).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar title="NGO Dashboard" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="NGO Dashboard" />

      {/* Global Notification Banner */}
      {notification && (
        <div className="fixed top-24 right-6 bg-primary-600 text-white px-6 py-4 rounded-2xl shadow-premium z-[60] animate-slide-up flex items-center space-x-4 border border-primary-500/20 backdrop-blur-md">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Package className="h-5 w-5" />
          </div>
          <div className="flex-1 pr-6">
            <p className="font-bold text-sm leading-tight">{notification}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <span className="sr-only">Close</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-6 animate-fade-in">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="h-1 bg-primary-500 w-12 rounded-full"></div>
              <span className="text-primary-600 font-bold uppercase tracking-widest text-xs">Mission Center</span>
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Active Operations</h1>
            <p className="text-slate-500 mt-2 font-medium max-w-lg">
              Manage food rescues, track pickup routes, and coordinate with donors efficiently.
            </p>
          </div>
          
          <div className="flex items-center space-x-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                viewMode === 'map'
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Map className="h-4 w-4" />
              <span>Map View</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                viewMode === 'list'
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <List className="h-4 w-4" />
              <span>List View</span>
            </button>
          </div>
        </div>

        {/* Stats Cards - Premium Set */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-slide-up">
          <div className="card-premium p-6 group hover:translate-y-[-4px]">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                <Package className="h-6 w-6" />
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">Nearby</span>
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Available Now</p>
            <div className="flex items-end space-x-2 mt-1">
              <p className="text-3xl font-black text-slate-900 leading-none">{stats.available}</p>
              <span className="text-xs text-slate-400 font-medium pb-1 uppercase">Pins</span>
            </div>
          </div>

          <div className="card-premium p-6 group hover:translate-y-[-4px]">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <TrendingUp className="h-6 w-6" />
              </div>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">Active</span>
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">My Claims</p>
            <div className="flex items-end space-x-2 mt-1">
              <p className="text-3xl font-black text-slate-900 leading-none">{stats.claimed}</p>
              <span className="text-xs text-slate-400 font-medium pb-1 uppercase">Claims</span>
            </div>
          </div>

          <div className="card-premium p-6 group hover:translate-y-[-4px]">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                <Heart className="h-6 w-6" />
              </div>
              <span className="bg-purple-50 text-purple-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">History</span>
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Fulfilled Donations</p>
            <div className="flex items-end space-x-2 mt-1">
              <p className="text-3xl font-black text-slate-900 leading-none">{stats.completed}</p>
              <span className="text-xs text-slate-400 font-medium pb-1 uppercase">Jobs</span>
            </div>
          </div>

          <div className="card-premium p-6 group hover:translate-y-[-4px]">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                <Navigation className="h-6 w-6" />
              </div>
              <span className="bg-slate-50 text-slate-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">Overall</span>
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Total Impact</p>
            <div className="flex items-end space-x-2 mt-1">
              <p className="text-3xl font-black text-slate-900 leading-none">{stats.total}</p>
              <span className="text-xs text-slate-400 font-medium pb-1 uppercase">Served</span>
            </div>
          </div>
        </div>

        {/* Dynamic Controls Bar */}
        <div className="bg-white/70 backdrop-blur-lg sticky top-24 z-40 p-4 -mx-4 sm:mx-0 sm:p-4 rounded-3xl border border-white/50 shadow-premium mb-8 flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between animate-fade-in group">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleStartMultiPickup}
              disabled={stats.available === 0}
              className="px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex items-center"
            >
              <Route className="h-4 w-4 mr-2" />
              Start Route
            </button>
            
            <button
              onClick={() => setShowQRScanner(true)}
              className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-95"
              title="Verify with QR"
            >
              <QrCode className="h-5 w-5" />
            </button>

            <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden sm:block"></div>

            <button
              onClick={() => setShowEmergencyForm(true)}
              className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-100 transition-all flex items-center"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Emergency
            </button>

            {user?.role === 'ngo' && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowLocationSetup(true)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center ${
                    user.location && user.location.coordinates
                      ? 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      : 'bg-amber-50 text-amber-600 hover:bg-amber-100 animate-subtle-pulse'
                  }`}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {user.location && user.location.coordinates ? 'Update GPS' : 'Set GPS'}
                </button>
                
                {user.location?.coordinates && (
                  <button
                    onClick={() => setShowRadiusUpdate(true)}
                    className="px-4 py-2.5 bg-slate-50 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center"
                  >
                    <Settings className="h-4 w-4 mr-2 text-slate-400" />
                    {currentRadius}km
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4 border-t lg:border-t-0 pt-4 lg:pt-0">
            {/* Auto-refresh indicator */}
            <div className="hidden sm:flex items-center space-x-2 mr-2">
              <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {autoRefresh ? 'Monitoring' : 'Paused'}
              </span>
            </div>

            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm group-hover:rotate-180 duration-500"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 appearance-none shadow-sm cursor-pointer"
            >
              <option value="all">All Available</option>
              <option value="available">Available Now</option>
              <option value="claimed">Claimed</option>
              <option value="mine">My Donations</option>
            </select>
          </div>
        </div>

        {/* Location-based status mini-banner */}
        {user?.role === 'ngo' && (
          <div className={`mb-8 px-5 py-3 rounded-2xl flex items-center justify-between animate-fade-in border ${
            usingLocationFiltering 
              ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
              : 'bg-amber-50/50 border-amber-100 text-amber-800'
          }`}>
            <div className="flex items-center space-x-3">
              {usingLocationFiltering ? (
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                  <Navigation className="h-4 w-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white">
                  <MapPin className="h-4 w-4" />
                </div>
              )}
              <div>
                <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">
                  {usingLocationFiltering ? 'Location Active' : 'Action Required'}
                </p>
                <p className="text-[10px] sm:text-xs font-medium opacity-80">
                  {usingLocationFiltering 
                    ? `Showing results within ${currentRadius}km of your verified location.`
                    : 'Your location is not set. Donors cannot see you and filters are restricted.'
                  }
                </p>
              </div>
            </div>
            {!usingLocationFiltering && (
              <button 
                onClick={getCurrentLocation}
                className="px-4 py-1.5 bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-700 transition-all shadow-sm"
              >
                Set Now
              </button>
            )}
          </div>
        )}

        {/* Main Workspace */}
        <div className="bg-white rounded-[2rem] shadow-premium overflow-hidden border border-slate-100 animate-slide-up">
          {viewMode === 'map' ? (
            <div className="relative group/map">
              <FoodMap
                donations={filteredDonations}
                onMarkerClick={setSelectedDonation}
                selectedDonation={selectedDonation}
              />
              
              {/* Refined selected donation card on map */}
              {selectedDonation && (
                <div className="absolute top-6 left-6 right-6 sm:left-auto sm:right-6 sm:w-80 bg-white/95 backdrop-blur-md p-5 rounded-3xl shadow-premium border border-white animate-scale-in z-30">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-extrabold text-slate-900 leading-tight">{selectedDonation.title}</h3>
                    <button onClick={() => setSelectedDonation(null)} className="text-slate-400 hover:text-slate-600">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">{selectedDonation.description}</p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewRoute(selectedDonation)}
                      className="flex-1 flex items-center justify-center space-x-2 px-3 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                    >
                      <Navigation className="h-3 w-3" />
                      <span>Directions</span>
                    </button>
                    {selectedDonation.status === 'available' && (
                      <button
                        onClick={() => handleClaimDonation(selectedDonation)}
                        className="flex-1 px-3 py-2.5 bg-primary-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all"
                      >
                        Claim Now
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8">
              {filteredDonations.length === 0 ? (
                <div className="text-center py-20 animate-fade-in">
                  <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Package className="h-10 w-10" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">No missions found</h3>
                  <p className="text-slate-500 mb-8 max-w-sm mx-auto font-medium">
                    {usingLocationFiltering 
                      ? `No donations found within your ${currentRadius}km rescue zone.`
                      : 'Adjust your filters or set your location to start rescues.'
                    }
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-4">
                    {usingLocationFiltering && (
                      <button
                        onClick={() => setShowRadiusUpdate(true)}
                        className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm tracking-tight hover:bg-slate-800 transition-all shadow-md"
                      >
                        Expand Search Radius
                      </button>
                    )}
                    {!usingLocationFiltering && user?.role === 'ngo' && (
                      <button
                        onClick={() => setShowLocationSetup(true)}
                        className="px-6 py-3 bg-amber-600 text-white rounded-2xl font-bold text-sm tracking-tight hover:bg-amber-700 transition-all shadow-md"
                      >
                        Set NGO Base Location
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredDonations.map((donation, index) => (
                    <div key={donation._id} className="animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                        <div className="transform transition-all duration-300 group-hover:scale-[1.02]">
                          <DonationListItem
                            donation={donation}
                            onClaim={handleClaimDonation}
                            onViewRoute={handleViewRoute}
                            unreadCount={getUnreadCount(donation._id)}
                            onChat={setChatDonation}
                            onVideoCall={handleVideoCall}
                          />
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modern Modal Overlay System */}
      {/* Location Setup */}
      {showLocationSetup && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in text-center">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-premium-hover animate-scale-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-400 to-emerald-600"></div>
            <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-3xl flex items-center justify-center mb-6 mx-auto">
              <MapPin className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Base Operations</h3>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              Set your NGO base location to see real-time available donations within your rescue zone.
            </p>
            <div className="flex flex-col space-y-3">
              <button
                onClick={getCurrentLocation}
                className="btn-primary py-4 rounded-2xl flex items-center justify-center group"
              >
                <Navigation className="h-5 w-5 mr-3 group-hover:translate-x-1 transition-transform" />
                <span>Sync Current GPS</span>
              </button>
              <button
                onClick={() => setShowLocationSetup(false)}
                className="btn-secondary py-4 rounded-2xl text-slate-500 hover:text-slate-900"
              >
                {user?.location?.coordinates ? 'Cancel' : 'Continue without Location'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Route Selector & Other Modals Wrapped in Premium Overlays */}
      {showMultiSelector && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-10 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-[2rem] shadow-premium overflow-hidden animate-slide-up my-auto">
            <MultiLocationSelector
              donations={filteredDonations.filter(d => d.status === 'available' && new Date(d.expiryTime) > new Date())}
              onStartRoute={handleStartRoute}
              onClose={() => setShowMultiSelector(false)}
            />
          </div>
        </div>
      )}

      {showRouteTracker && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xl animate-fade-in flex flex-col">
          <RouteTracker
            donations={selectedRouteData}
            onComplete={handleRouteComplete}
            onClose={() => setShowRouteTracker(false)}
          />
        </div>
      )}

      {showRadiusUpdate && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-[2rem] shadow-premium-hover animate-scale-in p-2">
            <RadiusUpdateModal
              isOpen={showRadiusUpdate}
              onClose={() => setShowRadiusUpdate(false)}
              currentRadius={currentRadius}
              onUpdate={handleRadiusUpdate}
            />
          </div>
        </div>
      )}

      {chatDonation && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-hidden">
          <div className="w-full max-w-lg h-[90vh] sm:h-[80vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-premium-hover flex flex-col animate-slide-up overflow-hidden">
            <ChatWindow
              donation={chatDonation}
              otherPartyName={chatDonation.donorName || 'Donor'}
              onClose={() => setChatDonation(null)}
            />
          </div>
        </div>
      )}

      {showQRScanner && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-lg flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-premium overflow-hidden animate-scale-in">
            <QRScanner
              onClose={() => setShowQRScanner(false)}
              onVerified={(donation) => {
                setShowQRScanner(false);
                fetchAllDonations(false);
                fetchMyDonations();
              }}
            />
          </div>
        </div>
      )}

      {showEmergencyForm && (
        <div className="fixed inset-0 z-[110] bg-red-900/20 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-premium overflow-hidden animate-scale-in border-t-4 border-red-500">
            <EmergencyAlertForm
              onClose={() => setShowEmergencyForm(false)}
              onSuccess={() => {
                setShowEmergencyForm(false);
              }}
              userLocation={user?.location}
            />
          </div>
        </div>
      )}
    </div>
  );
};



