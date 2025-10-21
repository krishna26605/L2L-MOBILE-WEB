import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authAPI, AuthStorage } from '../lib/api';
import { Alert } from 'react-native';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const { user: storedUser, token } = await AuthStorage.getAuthData();
        console.log('Auth init - stored user:', storedUser);
        console.log('Auth init - token exists:', !!token);
        
        if (storedUser && token) {
          setUser(storedUser);
          try {
            console.log('Attempting to get fresh profile...');
            const profile = await authAPI.getProfile();
            console.log('Profile response:', profile);
            
            if (profile?.data?.user) {
              setUser(profile.data.user);
              await AuthStorage.setAuthData(token, profile.data.user);
              console.log('Profile updated successfully');
            }
          } catch (profileError) {
            console.log('Profile fetch failed:', profileError);
          }
        }
      } finally {
        setLoading(false);
        console.log('Auth initialization completed');
      }
    };
    init();
  }, []);

  const signIn = async (email, password) => {
    console.log('=== AUTH CONTEXT SIGNIN START ===');
    console.log('Email received:', email);
    console.log('Password length:', password?.length);
    
    try {
      console.log('Calling authAPI.login...');
      const res = await authAPI.login(email, password);
      console.log('Login API response:', res);
      console.log('Login response data:', res.data);
      
      if (res.data && res.data.user) {
        console.log('Setting user state:', res.data.user);
        setUser(res.data.user);
        console.log('Login successful!');
      } else {
        console.log('No user data in response');
        throw new Error('Invalid response from server');
      }
      
      return res.data;
    } catch (error) {
      console.log('=== AUTH CONTEXT SIGNIN ERROR ===');
      console.log('Error type:', error.constructor.name);
      console.log('Error message:', error.message);
      console.log('Error response:', error.response);
      console.log('Error response data:', error.response?.data);
      console.log('Error response status:', error.response?.status);
      
      // Re-throw the error so AuthScreen can catch it
      throw error;
    }
  };

  const signUp = async (payload) => {
    console.log('SignUp payload:', payload);
    const res = await authAPI.register(payload);
    setUser(res.data.user);
    return res.data;
  };

  const updateUserProfile = async (data) => {
    const res = await authAPI.updateProfile(data);
    const updatedUser = res.data?.user || res.data;
    setUser((prev) => ({ ...(prev || {}), ...(updatedUser || {}) }));
    const { token } = await AuthStorage.getAuthData();
    if (token) await AuthStorage.setAuthData(token, updatedUser);
    return res.data;
  };

  // Updated logout function with confirmation
  const logout = async () => {
    return new Promise((resolve) => {
      Alert.alert(
        'Confirm Logout',
        'Are you sure you want to logout?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Yes, Logout',
            style: 'destructive',
            onPress: async () => {
              try {
                await AuthStorage.clearAuthData();
                setUser(null);
                resolve(true);
              } catch (error) {
                console.error('Logout error:', error);
                resolve(false);
              }
            }
          }
        ]
      );
    });
  };

  const value = useMemo(() => ({ user, loading, signIn, signUp, updateUserProfile, logout }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};