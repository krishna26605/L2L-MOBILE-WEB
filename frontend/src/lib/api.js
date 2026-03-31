import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ✅ AuthStorage ko properly export karo
export const AuthStorage = {
  // Save auth data
  setAuthData: (token, user) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    console.log('💾 Auth data saved to localStorage');
  },

  // Get auth data
  getAuthData: () => {
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user');
    return { 
      token, 
      user: user ? JSON.parse(user) : null 
    };
  },

  // Clear auth data
  clearAuthData: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    console.log('🗑️ Auth data cleared from localStorage');
  }
};

// ✅ FIRST: Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // Add this for cookies if needed
});

// Add this to see actual network requests
if (typeof window !== 'undefined') {
  // Log all fetch requests (for debugging)
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    console.log('🌐 Fetch called:', args[0], args[1]);
    return originalFetch.apply(this, args);
  };
}

// ✅ THEN: Add interceptors
api.interceptors.request.use(
  (config) => {
    // ✅ localStorage se token lo
    const { token } = AuthStorage.getAuthData();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 API Request: Added auth token from localStorage');
    }
    console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for debugging and error handling
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.config?.url, error.response?.status, error.response?.data);
    if (error.response?.status === 401) {
      console.log('🚫 Unauthorized - clearing auth data');
      AuthStorage.clearAuthData();
      if (typeof window !== 'undefined') {
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API - Simple localStorage solution
export const authAPI = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    const { token, user } = response.data;
    
    console.log('🔐 authAPI.register - Full response:', response.data);
    
    // ✅ localStorage mein save karo
    AuthStorage.setAuthData(token, user);
    
    return response;
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data;
    
    console.log('🔐 authAPI.login - Full response:', response.data);
    
    // ✅ localStorage mein save karo
    AuthStorage.setAuthData(token, user);
    
    return response;
  },

  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (currentPassword, newPassword) => 
    api.put('/auth/change-password', { currentPassword, newPassword }),
  deleteAccount: () => api.delete('/auth/account'),
  getStats: () => api.get('/auth/stats'),
  
  // ✅ NEW: Get NGOs near location
  getNGOsNearLocation: (lat, lng, radius = 20) => 
    api.get('/auth/ngos/nearby', { params: { lat, lng, radius } }),
};

// Donations API
export const donationsAPI = {
  getAll: (params) => api.get('/donations', { params }),
  getById: (id) => api.get(`/donations/${id}`),
  create: (data) => api.post('/donations', data),
  update: (id, data) => api.put(`/donations/${id}`, data),
  delete: (id) => api.delete(`/donations/${id}`),
  claim: (id) => api.post(`/donations/${id}/claim`),
  markAsPicked: (id) => api.post(`/donations/${id}/pickup`),
  getByLocation: (params) => api.get('/donations/location', { params }),
  getStats: () => api.get('/donations/stats'),
  
  // ✅ NEW: Get donations specifically for NGO with location filtering
  getForMyNGO: (params = {}) => 
    api.get('/donations/ngo/my-donations', { params }),
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  getProfile: (id) => api.get(`/users/${id}/profile`),
  getDonations: (id, params) => api.get(`/users/${id}/donations`, { params }),
  getDashboardStats: (id) => api.get(`/users/${id}/dashboard-stats`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  search: (params) => api.get('/users/search', { params }),
};

// Upload API
export const uploadAPI = {
  uploadImage: (formData) => api.post('/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getUserImages: () => api.get('/upload/images'),
  getImageInfo: (fileName) => api.get(`/upload/image/${fileName}`),
  deleteImage: (fileName) => api.delete(`/upload/image/${fileName}`),
};

// Chat API
export const chatAPI = {
  getMessages: (donationId) => api.get(`/chat/${donationId}`),
  sendMessage: (donationId, content) => api.post(`/chat/${donationId}`, { content }),
  getUnreadCount: () => api.get('/chat/unread'),
};

// Verification API
export const verificationAPI = {
  getStatus: (code) => api.get(`/verify/${code}`),
  verify: (code) => api.post(`/verify/${code}`),
};

// Calls API
export const callsAPI = {
  requestCall: (donationId, peerId) => api.post('/calls/request', { donationId, peerId }),
  getPendingCalls: () => api.get('/calls/pending'),
  acceptCall: (callId, peerId) => api.post(`/calls/${callId}/accept`, { peerId }),
  rejectCall: (callId) => api.post(`/calls/${callId}/reject`),
  endCall: (callId) => api.post(`/calls/${callId}/end`),
};

// Alerts API
export const alertsAPI = {
  getActive: () => api.get('/alerts/active'),
  create: (data) => api.post('/alerts', data),
  getMyAlerts: () => api.get('/alerts/my-alerts'),
  resolve: (id) => api.post(`/alerts/${id}/resolve`),
};

export default api;