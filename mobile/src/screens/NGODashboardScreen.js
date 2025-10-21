import React, { useEffect, useMemo, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  ScrollView,
  Alert,
  Modal,
  Linking,
  TextInput
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { donationsAPI } from '../lib/api';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Radius Settings Modal
const RadiusSettingsModal = ({ visible, onClose, radius, onRadiusChange }) => {
  const [tempRadius, setTempRadius] = useState(radius.toString());

  const handleSave = () => {
    const newRadius = parseInt(tempRadius);
    if (newRadius >= 1 && newRadius <= 100) {
      onRadiusChange(newRadius);
      onClose();
    } else {
      Alert.alert('Invalid Radius', 'Please enter a radius between 1 and 100 km');
    }
  };

  const quickAdjust = (change) => {
    const current = parseInt(tempRadius);
    const newValue = Math.max(1, Math.min(100, current + change));
    setTempRadius(newValue.toString());
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ backgroundColor: 'white', margin: 20, borderRadius: 12, padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: '700' }}>Search Radius</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 16, color: '#6b7280', marginBottom: 16, textAlign: 'center' }}>
            Set your operational radius (1-100 km)
          </Text>

          {/* Quick Adjust Buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => quickAdjust(-5)}
              style={{ 
                backgroundColor: '#f3f4f6', 
                padding: 12, 
                borderRadius: 8,
                flex: 1,
                marginRight: 8,
                alignItems: 'center'
              }}
            >
              <Text style={{ fontWeight: '600', color: '#374151' }}>-5 km</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => quickAdjust(-1)}
              style={{ 
                backgroundColor: '#f3f4f6', 
                padding: 12, 
                borderRadius: 8,
                flex: 1,
                marginRight: 8,
                alignItems: 'center'
              }}
            >
              <Text style={{ fontWeight: '600', color: '#374151' }}>-1 km</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => quickAdjust(1)}
              style={{ 
                backgroundColor: '#f3f4f6', 
                padding: 12, 
                borderRadius: 8,
                flex: 1,
                marginRight: 8,
                alignItems: 'center'
              }}
            >
              <Text style={{ fontWeight: '600', color: '#374151' }}>+1 km</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => quickAdjust(5)}
              style={{ 
                backgroundColor: '#f3f4f6', 
                padding: 12, 
                borderRadius: 8,
                flex: 1,
                alignItems: 'center'
              }}
            >
              <Text style={{ fontWeight: '600', color: '#374151' }}>+5 km</Text>
            </TouchableOpacity>
          </View>

          {/* Radius Input */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#374151' }}>
              Current Radius: {tempRadius} km
            </Text>
            <TextInput
              value={tempRadius}
              onChangeText={setTempRadius}
              keyboardType="number-pad"
              style={{ 
                borderWidth: 1, 
                borderColor: '#ddd', 
                padding: 12, 
                borderRadius: 8,
                textAlign: 'center',
                fontSize: 16,
                fontWeight: '600'
              }}
              placeholder="Enter radius in km"
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            style={{ 
              backgroundColor: '#16a34a', 
              padding: 16, 
              borderRadius: 10, 
              alignItems: 'center' 
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Save Radius</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Map Modal Component
const DonationMapModal = ({ visible, onClose, donation, onClaim, currentLocation }) => {
  const [mapRegion, setMapRegion] = useState(null);
  const [gettingDirections, setGettingDirections] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (donation?.location?.coordinates) {
      const { lat, lng } = donation.location.coordinates;
      setMapRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }, [donation]);

  const openDirections = async () => {
    if (!donation?.location?.coordinates) return;
    
    setGettingDirections(true);
    try {
      const { lat, lng } = donation.location.coordinates;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
      
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        Alert.alert(
          'Directions Started',
          'Google Maps has been opened with directions to the donation location. Please mark as collected after pickup.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Unable to open Google Maps');
      }
    } catch (error) {
      console.error('Error opening directions:', error);
      Alert.alert('Error', 'Failed to open directions');
    } finally {
      setGettingDirections(false);
    }
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      await donationsAPI.claim(donation._id);
      Alert.alert('Success', 'Donation marked as collected! Thank you for your service.');
      onClaim();
      onClose();
    } catch (error) {
      console.error('Claim error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to mark donation as collected. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  if (!donation) return null;

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 50 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' }}>
          <Text style={{ fontSize: 20, fontWeight: '700' }}>Donation Location</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Map */}
          <View style={{ height: 300 }}>
            {mapRegion && (
              <MapView
                style={{ flex: 1 }}
                region={mapRegion}
              >
                <Marker
                  coordinate={{
                    latitude: donation.location.coordinates.lat,
                    longitude: donation.location.coordinates.lng
                  }}
                  title="Donation Location"
                  description={donation.location.address}
                  pinColor="#16a34a"
                />
                {currentLocation && (
                  <Marker
                    coordinate={{
                      latitude: currentLocation.latitude,
                      longitude: currentLocation.longitude
                    }}
                    title="Your Location"
                    pinColor="#3b82f6"
                  />
                )}
              </MapView>
            )}
          </View>

          {/* Donation Details */}
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>{donation.title || 'Food Donation'}</Text>
            
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Pickup Address:</Text>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>{donation.location.address}</Text>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Food Details:</Text>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>{donation.quantity} • {donation.foodType}</Text>
              {donation.description && (
                <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>{donation.description}</Text>
              )}
            </View>

            {donation.expiryTime && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Expires:</Text>
                <Text style={{ fontSize: 14, color: '#6b7280' }}>
                  {new Date(donation.expiryTime).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#e5e5e5' }}>
          <TouchableOpacity
            onPress={openDirections}
            disabled={gettingDirections}
            style={{ 
              backgroundColor: '#3b82f6', 
              padding: 16, 
              borderRadius: 10, 
              alignItems: 'center',
              marginBottom: 12
            }}
          >
            {gettingDirections ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="navigate" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
                  Get Directions
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleClaim}
            disabled={claiming}
            style={{ 
              backgroundColor: '#16a34a', 
              padding: 16, 
              borderRadius: 10, 
              alignItems: 'center' 
            }}
          >
            {claiming ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
                  Mark as Collected
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={{ textAlign: 'center', color: '#6b7280', fontSize: 12, marginTop: 12, lineHeight: 16 }}>
            Use "Get Directions" to navigate to the donation location. 
            After collecting the food, press "Mark as Collected" to confirm pickup.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

// Donation Card Component for NGO
const NGODonationCard = ({ donation, onViewMap, showClaimed = false }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#10b981';
      case 'claimed': return '#f59e0b';
      case 'picked': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Available';
      case 'claimed': return 'Claimed by You';
      case 'picked': return 'Completed';
      default: return status;
    }
  };

  const foodItems = donation.title || 'Food Donation';
  const description = donation.description || 'No description provided';
  const quantity = donation.quantity || 'Not specified';
  const foodType = donation.foodType || 'Mixed';
  const location = donation.location?.address || 'Location not specified';
  const expiryTime = donation.expiryTime;
  const isExpired = expiryTime ? new Date(expiryTime) < new Date() : false;
  const distance = donation.distance ? `${donation.distance.toFixed(1)}km away` : 'Distance not available';

  return (
    <View style={{ 
      backgroundColor: '#fff', 
      padding: 16, 
      borderRadius: 12, 
      marginBottom: 12, 
      borderWidth: 1, 
      borderColor: '#e5e5e5', 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 2 }, 
      shadowOpacity: 0.1, 
      shadowRadius: 4, 
      elevation: 3 
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <Text style={{ fontWeight: '700', fontSize: 18, flex: 1, color: '#1f2937' }}>{foodItems}</Text>
        
        {showClaimed ? (
          <View style={{ 
            backgroundColor: getStatusColor(donation.status), 
            paddingHorizontal: 8, 
            paddingVertical: 4, 
            borderRadius: 12
          }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
              {getStatusText(donation.status)}
            </Text>
          </View>
        ) : (
          <View style={{ 
            backgroundColor: '#10b981', 
            paddingHorizontal: 8, 
            paddingVertical: 4, 
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <Ionicons name="location" size={12} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>
              {distance}
            </Text>
          </View>
        )}
      </View>
      
      {/* Description */}
      <Text style={{ color: '#6b7280', marginBottom: 12, lineHeight: 20, fontSize: 14 }}>{description}</Text>
      
      {/* Details */}
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Ionicons name="fast-food" size={16} color="#6b7280" />
          <Text style={{ marginLeft: 8, fontSize: 14, color: '#374151' }}>
            {quantity} • {foodType}
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Ionicons name="pin" size={16} color="#6b7280" />
          <Text style={{ marginLeft: 8, fontSize: 14, color: '#374151', flex: 1 }} numberOfLines={2}>
            {location}
          </Text>
        </View>
        
        {expiryTime && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="time" size={16} color="#6b7280" />
            <Text style={{ marginLeft: 8, fontSize: 14, color: isExpired ? '#ef4444' : '#374151' }}>
              Expires: {formatDate(expiryTime)}
            </Text>
          </View>
        )}
      </View>

      {/* Action Button */}
      {!showClaimed && (
        <TouchableOpacity
          onPress={() => onViewMap(donation)}
          disabled={isExpired}
          style={{ 
            backgroundColor: isExpired ? '#9ca3af' : '#3b82f6', 
            padding: 12, 
            borderRadius: 8, 
            alignItems: 'center',
            marginTop: 8,
            flexDirection: 'row',
            justifyContent: 'center'
          }}
        >
          <Ionicons name="navigate" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 8 }}>
            {isExpired ? 'Expired' : 'Get Directions'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function NGODashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [allDonations, setAllDonations] = useState([]);
  const [claimedDonations, setClaimedDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [radiusKm, setRadiusKm] = useState(20);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showRadiusModal, setShowRadiusModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [activeTab, setActiveTab] = useState('available'); // 'available' or 'claimed'

  const fetchAllDonations = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true); 
      else setRefreshing(true);
      
      const res = await donationsAPI.getAll();
      const list = res?.data?.donations || res?.data || [];
      setAllDonations(Array.isArray(list) ? list : []);
      setRadiusKm(user?.ngoDetails?.operationalRadius || 20);
    } catch (error) {
      console.log('Error fetching donations:', error);
    } finally { 
      setLoading(false); 
      setRefreshing(false); 
    }
  };

  // In your fetchMyClaims function, update this part:
const fetchMyClaims = async () => {
  try {
    console.log('🔍 Fetching my claims...');
    const res = await donationsAPI.getMyClaims();
    console.log('📋 My claims response:', res.data);
    
    // Handle both response formats
    let claims = [];
    if (res.data.claimedDonations) {
      // New format: { claimRequests: [], claimedDonations: [] }
      claims = res.data.claimedDonations || [];
    } else if (res.data.claims) {
      // Old format: { claims: [] }
      claims = res.data.claims || [];
    }
    
    setClaimedDonations(Array.isArray(claims) ? claims : []);
    console.log(`✅ Loaded ${claims.length} claimed donations`);
  } catch (error) {
    console.log('❌ Error fetching claims:', error);
    setClaimedDonations([]);
  }
};

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
    } catch (error) {
      console.log('Error getting current location:', error);
    }
  };

  useEffect(() => { 
    if (user) {
      fetchAllDonations(true);
      getCurrentLocation();
    }
  }, [user]);

  // Fetch claims when tab changes to claimed
  useEffect(() => {
    if (user && activeTab === 'claimed') {
      fetchMyClaims();
    }
  }, [user, activeTab]);

  // Add logout handler
  const handleLogout = async () => {
    const shouldLogout = await logout();
    if (shouldLogout) {
      navigation.replace('Auth');
    }
  };

  const handleViewMap = (donation) => {
    setSelectedDonation(donation);
    setShowMapModal(true);
  };

  const handleRadiusChange = (newRadius) => {
    setRadiusKm(newRadius);
    Alert.alert('Success', `Search radius updated to ${newRadius}km`);
  };

  const handleRefresh = async () => {
    await fetchAllDonations(false);
    if (activeTab === 'claimed') {
      await fetchMyClaims();
    }
  };

  const handleClaimSuccess = async () => {
    // Refresh both available and claimed donations
    await fetchAllDonations(false);
    if (activeTab === 'claimed') {
      await fetchMyClaims();
    }
  };

  const filteredAvailable = useMemo(() => {
    let items = (allDonations || []).filter(d => d.status === 'available' && new Date(d.expiryTime) > new Date());
    
    if (user?.location?.coordinates) {
      const { lat, lng } = user.location.coordinates;
      items = items.map(d => {
        const c = d?.location?.coordinates;
        if (!c?.lat || !c?.lng) return { ...d, distance: null };
        
        const distance = haversineKm(lat, lng, c.lat, c.lng);
        return { ...d, distance };
      }).filter(d => d.distance !== null && d.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);
    }
    
    return items;
  }, [allDonations, user, radiusKm]);

  if (!user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Please sign in</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa' }}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={{ marginTop: 12, color: '#6b7280' }}>Loading donations...</Text>
      </View>
    );
  }

  // Header Component
  const Header = () => (
    <View style={{ padding: 16, backgroundColor: '#16a34a', paddingTop: 50 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>NGO Dashboard</Text>
          <Text style={{ color: '#dcfce7', fontSize: 14, marginTop: 4 }}>Find and collect nearby food donations</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Tab Navigation
  const TabNavigation = () => (
    <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e5e5' }}>
      <TouchableOpacity
        onPress={() => setActiveTab('available')}
        style={{ 
          flex: 1, 
          padding: 16, 
          alignItems: 'center',
          borderBottomWidth: 3,
          borderBottomColor: activeTab === 'available' ? '#16a34a' : 'transparent'
        }}
      >
        <Text style={{ 
          color: activeTab === 'available' ? '#16a34a' : '#6b7280', 
          fontWeight: activeTab === 'available' ? '600' : '400' 
        }}>
          Available ({filteredAvailable.length})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        onPress={() => setActiveTab('claimed')}
        style={{ 
          flex: 1, 
          padding: 16, 
          alignItems: 'center',
          borderBottomWidth: 3,
          borderBottomColor: activeTab === 'claimed' ? '#16a34a' : 'transparent'
        }}
      >
        <Text style={{ 
          color: activeTab === 'claimed' ? '#16a34a' : '#6b7280', 
          fontWeight: activeTab === 'claimed' ? '600' : '400' 
        }}>
          My Claims ({claimedDonations.length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Stats Cards Component
  const StatsCards = () => (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
        {activeTab === 'available' ? 'Available Donations' : 'My Claimed Donations'}
      </Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {/* Available Donations */}
          <TouchableOpacity 
            onPress={() => setActiveTab('available')}
            style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, minWidth: 140, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="location" size={24} color="#3b82f6" />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>Available</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#1f2937' }}>{filteredAvailable.length}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Search Radius - Clickable */}
          <TouchableOpacity 
            onPress={() => setShowRadiusModal(true)}
            style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, minWidth: 140, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="navigate" size={24} color="#10b981" />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>Search Radius</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#1f2937' }}>{radiusKm}km</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Claimed Donations */}
          <TouchableOpacity 
            onPress={() => setActiveTab('claimed')}
            style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, minWidth: 140, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="checkmark-done" size={24} color="#f59e0b" />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>My Claims</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#1f2937' }}>{claimedDonations.length}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Location Notice - Only show for available tab */}
      {activeTab === 'available' && !user?.location?.coordinates ? (
        <View style={{ 
          backgroundColor: '#fef3c7', 
          padding: 12, 
          borderRadius: 8, 
          borderWidth: 1, 
          borderColor: '#f59e0b',
          marginBottom: 16
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="warning" size={16} color="#d97706" />
            <Text style={{ marginLeft: 8, color: '#92400e', fontSize: 14, flex: 1 }}>
              Set your NGO location on the web dashboard to enable proximity filtering.
            </Text>
          </View>
        </View>
      ) : activeTab === 'available' && (
        <View style={{ 
          backgroundColor: '#f0fdf4', 
          padding: 12, 
          borderRadius: 8, 
          borderWidth: 1, 
          borderColor: '#bbf7d0',
          marginBottom: 16
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            <Text style={{ marginLeft: 8, color: '#166534', fontSize: 14 }}>
              Showing donations within {radiusKm}km of your location
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  // Empty State Component for Available
  const AvailableEmptyState = () => (
    <View style={{ 
      backgroundColor: '#fff', 
      padding: 32, 
      borderRadius: 12, 
      alignItems: 'center', 
      marginHorizontal: 16, 
      marginBottom: 16, 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 1 }, 
      shadowOpacity: 0.1, 
      shadowRadius: 3, 
      elevation: 2 
    }}>
      <Ionicons name="fast-food" size={48} color="#d1d5db" />
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 12, marginBottom: 8 }}>
        No nearby donations
      </Text>
      <Text style={{ color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
        {user?.location?.coordinates 
          ? `No food donations found within ${radiusKm}km of your location. Check back later for new donations.`
          : 'Set your NGO location on the web dashboard to see nearby food donations.'
        }
      </Text>
      <TouchableOpacity
        onPress={handleRefresh}
        style={{ backgroundColor: '#16a34a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
      >
        <Text style={{ color: '#fff', fontWeight: '600' }}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  // Empty State Component for Claimed
  const ClaimedEmptyState = () => (
    <View style={{ 
      backgroundColor: '#fff', 
      padding: 32, 
      borderRadius: 12, 
      alignItems: 'center', 
      marginHorizontal: 16, 
      marginBottom: 16, 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 1 }, 
      shadowOpacity: 0.1, 
      shadowRadius: 3, 
      elevation: 2 
    }}>
      <Ionicons name="receipt" size={48} color="#d1d5db" />
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 12, marginBottom: 8 }}>
        No claimed donations
      </Text>
      <Text style={{ color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
        You haven't claimed any donations yet. Browse available donations to start collecting food.
      </Text>
      <TouchableOpacity
        onPress={() => setActiveTab('available')}
        style={{ backgroundColor: '#16a34a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
      >
        <Text style={{ color: '#fff', fontWeight: '600' }}>Browse Available</Text>
      </TouchableOpacity>
    </View>
  );

  const currentData = activeTab === 'available' ? filteredAvailable : claimedDonations;
  const isEmpty = currentData.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#fafafa' }}>
      <Header />
      <TabNavigation />
      
      {isEmpty ? (
        // For empty state - use ScrollView
        <ScrollView 
          style={{ flex: 1 }} 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          <StatsCards />
          {activeTab === 'available' ? <AvailableEmptyState /> : <ClaimedEmptyState />}
        </ScrollView>
      ) : (
        // For non-empty state - use FlatList with header
        <FlatList
          data={currentData}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListHeaderComponent={<StatsCards />}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 16 }}>
              <NGODonationCard 
                donation={item}
                onViewMap={handleViewMap}
                showClaimed={activeTab === 'claimed'}
              />
            </View>
          )}
          ListFooterComponent={<View style={{ height: 20 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Map Modal */}
      <DonationMapModal
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        donation={selectedDonation}
        onClaim={handleClaimSuccess}
        currentLocation={currentLocation}
      />

      {/* Radius Settings Modal */}
      <RadiusSettingsModal
        visible={showRadiusModal}
        onClose={() => setShowRadiusModal(false)}
        radius={radiusKm}
        onRadiusChange={handleRadiusChange}
      />
    </View>
  );
}