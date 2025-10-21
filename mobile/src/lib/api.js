// C:\Users\Krishna\OneDrive\Desktop\L2L-Mobile-app\mobile\src\lib\api.js

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Enhanced URL handling with debugging
const getApiBaseUrl = () => {
  // Try from app config first
  const fromExtra = Constants?.expoConfig?.extra?.apiUrl || Constants?.manifest?.extra?.apiUrl;
  if (fromExtra) {
    console.log('📱 Using API URL from app config:', fromExtra);
    return fromExtra;
  }

  // Development defaults
  if (__DEV__) {
    // Use your computer's local IP - CHANGE THIS TO YOUR ACTUAL IP
    const localIP = '192.168.1.9'; // ⚠️ REPLACE THIS WITH YOUR IP
    const devUrl = `http://${localIP}:5000/api`;
    console.log('🔧 Using development API URL:', devUrl);
    return devUrl;
  }

  // Production URL
  const prodUrl = 'https://your-production-api.com/api';
  console.log('🚀 Using production API URL:', prodUrl);
  return prodUrl;
};

const API_BASE_URL = getApiBaseUrl();
console.log('🎯 Final API Base URL:', API_BASE_URL);

export const AuthStorage = {
  setAuthData: async (token, user) => {
    console.log('💾 Storing auth data - Token exists:', !!token);
    await AsyncStorage.setItem('auth_token', token || '');
    await AsyncStorage.setItem('user', JSON.stringify(user || null));
  },
  getAuthData: async () => {
    const token = await AsyncStorage.getItem('auth_token');
    const userString = await AsyncStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    console.log('📖 Retrieved auth data - Token:', !!token, 'User:', !!user);
    return { token: token || null, user };
  },
  clearAuthData: async () => {
    console.log('🗑️ Clearing auth data');
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user');
  }
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor with detailed logging
api.interceptors.request.use(async (config) => {
  console.log('📤 API Request:', {
    method: config.method?.toUpperCase(),
    url: config.url,
    baseURL: config.baseURL,
    fullURL: config.baseURL + config.url,
    data: config.data
  });

  const { token } = await AuthStorage.getAuthData();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
    console.log('🔑 Adding auth token to request');
  }

  return config;
});

// Response interceptor with detailed logging
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response Success:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  async (error) => {
    console.log('❌ API Response Error:', {
      message: error.message,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code
    });

    if (error?.response?.status === 401) {
      console.log('🔒 Unauthorized - clearing auth data');
      await AuthStorage.clearAuthData();
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (userData) => {
    console.log('👤 Register API called with:', { email: userData.email });
    const response = await api.post('/auth/register', userData);
    const { token, user } = response.data;
    await AuthStorage.setAuthData(token, user);
    return response;
  },
  login: async (email, password) => {
    console.log('🔐 Login API called with:', { email, passwordLength: password?.length });
    const response = await api.post('/auth/login', { email, password });
    console.log('🎉 Login API response received:', response.data);
    const { token, user } = response.data;
    await AuthStorage.setAuthData(token, user);
    return response;
  },
  getProfile: () => {
    console.log('👤 Get Profile API called');
    return api.get('/auth/profile');
  },
  updateProfile: (data) => {
    console.log('✏️ Update Profile API called');
    return api.put('/auth/profile', data);
  },
};

export const donationsAPI = {
  getAll: (params) => api.get('/donations', { params }),
  getById: (id) => api.get(`/donations/${id}`),
  create: (data) => api.post('/donations', data),
  update: (id, data) => api.put(`/donations/${id}`, data),
  delete: (id) => api.delete(`/donations/${id}`),
  claim: (id) => api.post(`/donations/${id}/claim`),
  markAsPicked: (id) => api.post(`/donations/${id}/pickup`),
  getMyClaims: () => api.get('/donations/ngo/my-claims'), // ADD THIS LINE
}

// Test function to check backend connectivity
export const testBackendConnection = async () => {
  try {
    console.log('🔍 Testing backend connection...');
    const response = await api.get('/auth/test'); // or any test endpoint
    console.log('✅ Backend connection test passed');
    return true;
  } catch (error) {
    console.log('❌ Backend connection test failed:', error.message);
    return false;
  }
};

export default api;

