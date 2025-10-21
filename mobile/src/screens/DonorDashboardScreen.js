// C:\Users\Krishna\OneDrive\Desktop\L2L-Mobile-app\mobile\src\screens\DonorDashboardScreen.js

import React, { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  ScrollView,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { donationsAPI } from '../lib/api';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

// Custom DateTime Picker Component
const CustomDateTimePicker = ({ visible, onClose, onConfirm, minDate }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('date'); // 'date' or 'time'

  // Generate days for the current month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getMonthData = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = new Date(year, month, 1).getDay();
    
    const days = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const changeMonth = (increment) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(selectedDate.getMonth() + increment);
    setSelectedDate(newDate);
  };

  const changeYear = (increment) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(selectedDate.getFullYear() + increment);
    setSelectedDate(newDate);
  };

  const selectDate = (date) => {
    if (!date) return;
    
    const newDate = new Date(selectedDate);
    newDate.setFullYear(date.getFullYear());
    newDate.setMonth(date.getMonth());
    newDate.setDate(date.getDate());
    setSelectedDate(newDate);
    setCurrentView('time');
  };

  const selectTime = (hour, minute) => {
    const newDate = new Date(selectedDate);
    newDate.setHours(hour);
    newDate.setMinutes(minute);
    setSelectedDate(newDate);
  };

  const handleConfirm = () => {
    onConfirm(selectedDate);
    onClose();
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date) => {
    if (!date) return false;
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };

  // Date Picker View
  const DatePickerView = () => (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <TouchableOpacity onPress={() => changeYear(-1)}>
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </TouchableOpacity>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '600' }}>
            {months[selectedDate.getMonth()]}
          </Text>
          <Text style={{ fontSize: 18, fontWeight: '600' }}>
            {selectedDate.getFullYear()}
          </Text>
        </View>
        
        <TouchableOpacity onPress={() => changeYear(1)}>
          <Ionicons name="chevron-forward" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Text key={day} style={{ fontWeight: '600', color: '#6b7280', width: 40, textAlign: 'center' }}>
            {day}
          </Text>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {getMonthData().map((date, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => date && selectDate(date)}
            style={{
              width: 40,
              height: 40,
              justifyContent: 'center',
              alignItems: 'center',
              margin: 2,
              borderRadius: 20,
              backgroundColor: isSelected(date) ? '#16a34a' : 
                             isToday(date) ? '#f3f4f6' : 'transparent',
            }}
            disabled={!date}
          >
            <Text style={{
              color: isSelected(date) ? '#fff' : 
                     !date ? 'transparent' : 
                     isToday(date) ? '#16a34a' : '#374151',
              fontWeight: isSelected(date) ? '600' : '400',
            }}>
              {date ? date.getDate() : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Time Picker View
  const TimePickerView = () => (
    <View>
      <Text style={{ fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 20 }}>
        Select Time
      </Text>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        {/* Hours */}
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontWeight: '600', marginBottom: 8 }}>Hour</Text>
          <ScrollView style={{ height: 200 }} showsVerticalScrollIndicator={false}>
            {hours.map(hour => (
              <TouchableOpacity
                key={hour}
                onPress={() => selectTime(hour, selectedDate.getMinutes())}
                style={{
                  padding: 12,
                  backgroundColor: selectedDate.getHours() === hour ? '#16a34a' : 'transparent',
                  borderRadius: 8,
                  marginVertical: 2,
                  minWidth: 60,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  color: selectedDate.getHours() === hour ? '#fff' : '#374151',
                  fontWeight: selectedDate.getHours() === hour ? '600' : '400',
                }}>
                  {hour.toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Minutes */}
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontWeight: '600', marginBottom: 8 }}>Minute</Text>
          <ScrollView style={{ height: 200 }} showsVerticalScrollIndicator={false}>
            {minutes.map(minute => (
              <TouchableOpacity
                key={minute}
                onPress={() => selectTime(selectedDate.getHours(), minute)}
                style={{
                  padding: 12,
                  backgroundColor: selectedDate.getMinutes() === minute ? '#16a34a' : 'transparent',
                  borderRadius: 8,
                  marginVertical: 2,
                  minWidth: 60,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  color: selectedDate.getMinutes() === minute ? '#fff' : '#374151',
                  fontWeight: selectedDate.getMinutes() === minute ? '600' : '400',
                }}>
                  {minute.toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <View style={{ marginTop: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>
          Selected: {selectedDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })}
        </Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ backgroundColor: 'white', margin: 20, borderRadius: 12, padding: 20, maxHeight: '80%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: '700' }}>
              {currentView === 'date' ? 'Select Date' : 'Select Time'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {currentView === 'date' ? <DatePickerView /> : <TimePickerView />}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
            {currentView === 'time' && (
              <TouchableOpacity
                onPress={() => setCurrentView('date')}
                style={{ padding: 12, backgroundColor: '#f3f4f6', borderRadius: 8, flex: 1, marginRight: 8 }}
              >
                <Text style={{ textAlign: 'center', fontWeight: '600' }}>Back to Date</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              onPress={handleConfirm}
              style={{ 
                padding: 12, 
                backgroundColor: '#16a34a', 
                borderRadius: 8, 
                flex: currentView === 'time' ? 1 : 2,
                marginLeft: currentView === 'time' ? 8 : 0
              }}
            >
              <Text style={{ textAlign: 'center', color: '#fff', fontWeight: '600' }}>
                {currentView === 'date' ? 'Next: Select Time' : 'Confirm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Post Food Form Component with Custom DateTime Picker
const PostFoodForm = ({ visible, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    quantity: '',
    foodType: 'prepared',
    expiryTime: '',
    pickupWindow: { start: '', end: '' },
    location: { address: '', lat: 0, lng: 0 }
  });
  const [submitting, setSubmitting] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  
  // Custom DateTime Picker States
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [currentField, setCurrentField] = useState('');

  // Food type options
  const foodTypeOptions = [
    { value: 'prepared', label: 'Prepared Meal' },
    { value: 'fresh', label: 'Fresh Produce' },
    { value: 'packaged', label: 'Packaged Food' },
    { value: 'beverages', label: 'Beverages' },
    { value: 'bakery', label: 'Bakery' },
    { value: 'dairy', label: 'Dairy' }
  ];

  // Google Places Autocomplete
 const searchLocations = async (query) => {
  if (query.length < 3) {
    setSuggestions([]);
    setShowSuggestions(false);
    return;
  }

  try {
    const API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || Constants.manifest?.extra?.googleMapsApiKey;
    
    if (!API_KEY) {
      console.error('Google Maps API key not found');
      Alert.alert('Error', 'Google Maps API key is not configured');
      return;
    }

    console.log('🔍 Searching locations for:', query);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${API_KEY}&components=country:in`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📍 Location suggestions:', data.predictions?.length);
    
    if (data.predictions) {
      setSuggestions(data.predictions);
      setShowSuggestions(true);
    }
  } catch (error) {
    console.error('Location search error:', error);
    setSuggestions([]);
    Alert.alert('Error', 'Failed to search locations. Please check your internet connection.');
  }
};

// Get place details
const getPlaceDetails = async (placeId) => {
  try {
    const API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || Constants.manifest?.extra?.googleMapsApiKey;
    
    if (!API_KEY) {
      console.error('Google Maps API key not found');
      Alert.alert('Error', 'Google Maps API key is not configured');
      return;
    }

    console.log('🔍 Getting place details for:', placeId);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📍 Place details received:', data.result?.name);
    
    if (data.result && data.result.geometry) {
      const place = data.result;
      setFormData(prev => ({
        ...prev,
        location: {
          address: place.formatted_address,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        }
      }));
      
      setMapRegion({
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      
      setShowSuggestions(false);
    }
  } catch (error) {
    console.error('Place details error:', error);
    Alert.alert('Error', 'Failed to get location details. Please try again.');
  }
};

// Get current location
const getCurrentLocation = async () => {
  setLocationLoading(true);
  try {
    let { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
      return;
    }

    console.log('📍 Getting current location...');
    let location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || Constants.manifest?.extra?.googleMapsApiKey;
    
    if (!API_KEY) {
      console.error('Google Maps API key not found');
      Alert.alert('Error', 'Google Maps API key is not configured');
      return;
    }

    console.log('📍 Reverse geocoding location...');
    const geocodeResponse = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.coords.latitude},${location.coords.longitude}&key=${API_KEY}`
    );
    
    if (!geocodeResponse.ok) {
      throw new Error(`HTTP error! status: ${geocodeResponse.status}`);
    }
    
    const geocodeData = await geocodeResponse.json();
    console.log('📍 Geocode results:', geocodeData.results?.length);
    
    if (geocodeData.results && geocodeData.results.length > 0) {
      const address = geocodeData.results[0].formatted_address;
      setFormData(prev => ({
        ...prev,
        location: {
          address: address,
          lat: location.coords.latitude,
          lng: location.coords.longitude
        }
      }));
      
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      
      Alert.alert('Success', 'Current location detected!');
    } else {
      Alert.alert('Error', 'No address found for your current location.');
    }
  } catch (error) {
    console.error('Location error:', error);
    Alert.alert('Error', 'Failed to get current location. Please enter address manually.');
  } finally {
    setLocationLoading(false);
  }
};

  // Custom DateTime Picker Functions
  const showCustomDateTimePicker = (field) => {
    setCurrentField(field);
    setShowDateTimePicker(true);
  };

  const handleDateTimeConfirm = (selectedDate) => {
    const isoString = selectedDate.toISOString();
    
    if (currentField === 'expiry') {
      setFormData(prev => ({ ...prev, expiryTime: isoString }));
    } else if (currentField === 'start') {
      setFormData(prev => ({ 
        ...prev, 
        pickupWindow: { ...prev.pickupWindow, start: isoString } 
      }));
    } else if (currentField === 'end') {
      setFormData(prev => ({ 
        ...prev, 
        pickupWindow: { ...prev.pickupWindow, end: isoString } 
      }));
    }
  };

  // Format date for display
  const formatDateTime = (isoString) => {
    if (!isoString) return 'Select date & time';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Food Type Selector Component
  const FoodTypeSelector = () => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Food Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {foodTypeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => setFormData({...formData, foodType: option.value})}
              style={{
                backgroundColor: formData.foodType === option.value ? '#16a34a' : '#f3f4f6',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: formData.foodType === option.value ? '#16a34a' : '#d1d5db',
              }}
            >
              <Text style={{ 
                color: formData.foodType === option.value ? '#fff' : '#374151', 
                fontSize: 14,
                fontWeight: formData.foodType === option.value ? '600' : '400'
              }}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
        <Ionicons name="fast-food" size={16} color="#6b7280" />
        <Text style={{ marginLeft: 8, fontSize: 14, color: '#374151', fontWeight: '500' }}>
          Selected: {foodTypeOptions.find(opt => opt.value === formData.foodType)?.label}
        </Text>
      </View>
    </View>
  );

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.quantity || !formData.expiryTime) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!formData.location.address) {
      Alert.alert('Error', 'Please provide a pickup location');
      return;
    }

    setSubmitting(true);
    try {
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

      const response = await donationsAPI.create(donationData);
      
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
      setSuggestions([]);
      setShowSuggestions(false);
      
      onSuccess(response.data.donation);
      Alert.alert('Success', '🎉 Donation posted successfully! NGOs near you will be notified.');
      
    } catch (error) {
      console.error('Post donation error:', error);
      Alert.alert('Error', 'Failed to post donation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 50 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' }}>
          <Text style={{ fontSize: 20, fontWeight: '700' }}>Post Surplus Food</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
          {/* Food Details */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>Food Details</Text>
            
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Food Title *</Text>
            <TextInput
              placeholder="e.g., Fresh sandwiches, Pizza, Fruits"
              value={formData.title}
              onChangeText={(text) => setFormData({...formData, title: text})}
              style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 16 }}
            />

            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Description *</Text>
            <TextInput
              placeholder="Describe the food items, ingredients, packaging, etc."
              value={formData.description}
              onChangeText={(text) => setFormData({...formData, description: text})}
              multiline
              numberOfLines={3}
              style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 16, height: 80 }}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Quantity *</Text>
                <TextInput
                  placeholder="e.g., 5 meals, 2 kg, 10 pieces"
                  value={formData.quantity}
                  onChangeText={(text) => setFormData({...formData, quantity: text})}
                  style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8 }}
                />
              </View>
            </View>

            <FoodTypeSelector />
          </View>

          {/* Timing Section */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>Timing</Text>
            
            {/* Expiry Time */}
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Expiry Time *</Text>
            <TouchableOpacity
              onPress={() => showCustomDateTimePicker('expiry')}
              style={{ 
                borderWidth: 1, 
                borderColor: formData.expiryTime ? '#16a34a' : '#ddd', 
                padding: 12, 
                borderRadius: 8, 
                marginBottom: 16,
                backgroundColor: formData.expiryTime ? '#f0fdf4' : '#fff'
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: formData.expiryTime ? '#16a34a' : '#666', fontWeight: formData.expiryTime ? '600' : '400' }}>
                  {formatDateTime(formData.expiryTime)}
                </Text>
                <Ionicons name="calendar" size={20} color={formData.expiryTime ? '#16a34a' : '#666'} />
              </View>
            </TouchableOpacity>

            {/* Pickup Window */}
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Pickup Window</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Start Time</Text>
                <TouchableOpacity
                  onPress={() => showCustomDateTimePicker('start')}
                  style={{ 
                    borderWidth: 1, 
                    borderColor: formData.pickupWindow.start ? '#16a34a' : '#ddd', 
                    padding: 12, 
                    borderRadius: 8,
                    backgroundColor: formData.pickupWindow.start ? '#f0fdf4' : '#fff'
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: formData.pickupWindow.start ? '#16a34a' : '#666', fontWeight: formData.pickupWindow.start ? '600' : '400' }}>
                      {formatDateTime(formData.pickupWindow.start)}
                    </Text>
                    <Ionicons name="calendar" size={20} color={formData.pickupWindow.start ? '#16a34a' : '#666'} />
                  </View>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>End Time</Text>
                <TouchableOpacity
                  onPress={() => showCustomDateTimePicker('end')}
                  style={{ 
                    borderWidth: 1, 
                    borderColor: formData.pickupWindow.end ? '#16a34a' : '#ddd', 
                    padding: 12, 
                    borderRadius: 8,
                    backgroundColor: formData.pickupWindow.end ? '#f0fdf4' : '#fff'
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: formData.pickupWindow.end ? '#16a34a' : '#666', fontWeight: formData.pickupWindow.end ? '600' : '400' }}>
                      {formatDateTime(formData.pickupWindow.end)}
                    </Text>
                    <Ionicons name="calendar" size={20} color={formData.pickupWindow.end ? '#16a34a' : '#666'} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Location Section with Autocomplete */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>Location</Text>
            
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Pickup Address *</Text>
            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    placeholder="Enter address for pickup"
                    value={formData.location.address}
                    onChangeText={(text) => {
                      setFormData(prev => ({...prev, location: {...prev.location, address: text}}));
                      searchLocations(text);
                    }}
                    style={{ borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8 }}
                  />
                  
                  {/* Location Suggestions */}
                  {showSuggestions && suggestions.length > 0 && (
                    <View style={{ position: 'absolute', top: 50, left: 0, right: 0, backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, zIndex: 1000, maxHeight: 150 }}>
                      <ScrollView>
                        {suggestions.map((suggestion, index) => (
                          <TouchableOpacity
                            key={suggestion.place_id}
                            onPress={() => getPlaceDetails(suggestion.place_id)}
                            style={{ padding: 12, borderBottomWidth: index < suggestions.length - 1 ? 1 : 0, borderBottomColor: '#f3f4f6' }}
                          >
                            <Text style={{ fontSize: 14 }}>{suggestion.description}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
                
                <TouchableOpacity
                  onPress={getCurrentLocation}
                  disabled={locationLoading}
                  style={{ backgroundColor: '#3b82f6', padding: 12, borderRadius: 8, justifyContent: 'center' }}
                >
                  {locationLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="navigate" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {formData.location.lat !== 0 && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Selected Location:</Text>
                <Text style={{ fontSize: 14, color: '#374151' }}>{formData.location.address}</Text>
              </View>
            )}

            {formData.location.lat !== 0 && (
              <TouchableOpacity
                onPress={() => setShowMap(true)}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f8f9fa', borderRadius: 8 }}
              >
                <Ionicons name="map" size={16} color="#666" />
                <Text style={{ marginLeft: 8, color: '#666' }}>View on Map</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            style={{ backgroundColor: '#16a34a', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 20 }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Post Donation</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Custom DateTime Picker */}
      <CustomDateTimePicker
        visible={showDateTimePicker}
        onClose={() => setShowDateTimePicker(false)}
        onConfirm={handleDateTimeConfirm}
        minDate={new Date()}
      />

      {/* Map Modal */}
      <Modal visible={showMap} animationType="slide">
        <View style={{ flex: 1, paddingTop: 50 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e5e5' }}>
            <Text style={{ fontSize: 18, fontWeight: '600' }}>Pickup Location</Text>
            <TouchableOpacity onPress={() => setShowMap(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          {mapRegion && (
            <MapView
              style={{ flex: 1 }}
              region={mapRegion}
            >
              <Marker
                coordinate={{
                  latitude: formData.location.lat,
                  longitude: formData.location.lng
                }}
                title="Pickup Location"
                description={formData.location.address}
              />
            </MapView>
          )}
        </View>
      </Modal>
    </Modal>
  );
};

// Donation Card Component
const DonationCard = ({ donation, onUpdate }) => {
  const [loading, setLoading] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#10b981';
      case 'claimed': return '#f59e0b';
      case 'picked': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  // Food type mapping for display
  const getFoodTypeLabel = (type) => {
    const foodTypes = {
      'prepared': 'Prepared Meal',
      'fresh': 'Fresh Produce',
      'packaged': 'Packaged Food',
      'beverages': 'Beverages',
      'bakery': 'Bakery',
      'dairy': 'Dairy'
    };
    return foodTypes[type] || type;
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Available';
      case 'claimed': return 'Claimed';
      case 'picked': return 'Completed';
      default: return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return 'fast-food';
      case 'claimed': return 'time';
      case 'picked': return 'checkmark-done';
      default: return 'fast-food';
    }
  };

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

  
  const handleDelete = async () => {
    Alert.alert(
      'Delete Donation',
      'Are you sure you want to delete this donation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await donationsAPI.delete(donation._id);
              Alert.alert('Success', 'Donation deleted successfully');
              onUpdate();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete donation');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const foodItems = donation.title || 'Food Donation';
  const description = donation.description || 'No description provided';
  const quantity = donation.quantity || 'Not specified';
  const foodType = donation.foodType || 'Mixed';
  const location = donation.location?.address || 'Location not specified';
  const expiryTime = donation.expiryTime;
  const isExpired = expiryTime ? new Date(expiryTime) < new Date() : false;

  return (
    <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e5e5', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}>
      {/* Header with Status */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <Text style={{ fontWeight: '700', fontSize: 18, flex: 1, color: '#1f2937' }}>{foodItems}</Text>
        <View style={{ backgroundColor: getStatusColor(donation.status), paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name={getStatusIcon(donation.status)} size={12} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>{getStatusText(donation.status)}</Text>
        </View>
      </View>
      
      {/* Description */}
      <Text style={{ color: '#6b7280', marginBottom: 12, lineHeight: 20, fontSize: 14 }}>{description}</Text>
      
      {/* Details */}
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Ionicons name="fast-food" size={16} color="#6b7280" />
          <Text style={{ marginLeft: 8, fontSize: 14, color: '#374151' }}>
            {quantity} • {getFoodTypeLabel(foodType)}
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Ionicons name="location" size={16} color="#6b7280" />
          <Text style={{ marginLeft: 8, fontSize: 14, color: '#374151', flex: 1 }} numberOfLines={1}>
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

      {/* Footer */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
        <Text style={{ fontSize: 12, color: '#9ca3af' }}>
          Posted {formatDate(donation.createdAt)}
        </Text>
        
        {(donation.status === 'available' || isExpired) && (
          <TouchableOpacity onPress={handleDelete} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Ionicons name="trash" size={18} color="#ef4444" />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Main Dashboard Component
export default function DonorDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);

  const fetchDonations = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true); 
      else setRefreshing(true);
      
      const res = await donationsAPI.getAll({ donorId: user?._id });
      const list = res?.data?.donations || res?.data || [];
      setDonations(Array.isArray(list) ? list : []);
    } catch (e) {
      console.log('Error fetching donations:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { 
    if (user) fetchDonations(true); 
  }, [user]);

  const handlePostSuccess = (newDonation) => {
    if (newDonation) {
      setDonations(prev => [newDonation, ...prev]);
    } else {
      fetchDonations(false);
    }
  };

  const handleRefresh = () => {
    fetchDonations(false);
  };

  // Add the logout handler function
  const handleLogout = async () => {
    const shouldLogout = await logout();
    if (shouldLogout) {
      navigation.replace('Auth');
    }
  };

  // Calculate stats
  const stats = {
    total: donations.length,
    available: donations.filter(d => d.status === 'available').length,
    claimed: donations.filter(d => d.status === 'claimed').length,
    completed: donations.filter(d => d.status === 'picked').length,
  };

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
        <Text style={{ marginTop: 12, color: '#6b7280' }}>Loading dashboard...</Text>
      </View>
    );
  }

  // Header Component - Updated to use handleLogout
  const Header = () => (
    <View style={{ padding: 16, backgroundColor: '#16a34a', paddingTop: 50 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Donor Dashboard</Text>
          <Text style={{ color: '#dcfce7', fontSize: 14, marginTop: 4 }}>Manage your food donations</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Stats Cards Component
  const StatsCards = () => (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Donation Overview</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {/* Total Donations */}
          <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, minWidth: 140, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="fast-food" size={24} color="#3b82f6" />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>Total Donations</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#1f2937' }}>{stats.total}</Text>
              </View>
            </View>
          </View>

          {/* Available */}
          <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, minWidth: 140, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="time" size={24} color="#10b981" />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>Available</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#1f2937' }}>{stats.available}</Text>
              </View>
            </View>
          </View>

          {/* Claimed */}
          <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, minWidth: 140, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="trending-up" size={24} color="#f59e0b" />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>Claimed</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#1f2937' }}>{stats.claimed}</Text>
              </View>
            </View>
          </View>

          {/* Completed */}
          <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, minWidth: 140, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="checkmark-done" size={24} color="#8b5cf6" />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>Completed</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#1f2937' }}>{stats.completed}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Post Food Button */}
      <TouchableOpacity
        onPress={() => setShowPostForm(true)}
        style={{ backgroundColor: '#16a34a', padding: 16, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16, marginLeft: 8 }}>Post Surplus Food</Text>
      </TouchableOpacity>

      {/* Donations List Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>Your Food Donations</Text>
        <Text style={{ color: '#6b7280', fontSize: 14 }}>
          {donations.length} donation{donations.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );

  // Empty State Component
  const EmptyState = () => (
    <View style={{ backgroundColor: '#fff', padding: 32, borderRadius: 12, alignItems: 'center', marginHorizontal: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}>
      <Ionicons name="fast-food" size={48} color="#d1d5db" />
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 12, marginBottom: 8 }}>No donations yet</Text>
      <Text style={{ color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
        Start making a difference by posting your first food donation. Help reduce food waste and feed those in need.
      </Text>
      <TouchableOpacity
        onPress={() => setShowPostForm(true)}
        style={{ backgroundColor: '#16a34a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
      >
        <Text style={{ color: '#fff', fontWeight: '600' }}>Post Your First Donation</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fafafa' }}>
      <Header />
      
      {donations.length === 0 ? (
        // For empty state - use ScrollView
        <ScrollView 
          style={{ flex: 1 }} 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          <StatsCards />
          <EmptyState />
        </ScrollView>
      ) : (
        // For non-empty state - use FlatList with header
        <FlatList
          data={donations}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListHeaderComponent={<StatsCards />}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 16 }}>
              <DonationCard 
                donation={item}
                onUpdate={fetchDonations}
              />
            </View>
          )}
          ListFooterComponent={<View style={{ height: 20 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Post Food Modal */}
      <PostFoodForm
        visible={showPostForm}
        onClose={() => setShowPostForm(false)}
        onSuccess={handlePostSuccess}
      />
    </View>
  );
}
