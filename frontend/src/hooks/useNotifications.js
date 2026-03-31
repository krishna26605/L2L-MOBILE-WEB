import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { chatAPI } from '../lib/api';
import { useAuth } from './useAuth';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState({});
  const [activeChatId, setActiveChatId] = useState(null);

  const fetchUnreadCounts = useCallback(async () => {
    if (!user) return;
    try {
      const response = await chatAPI.getUnreadCount();
      if (response.data.success) {
        setUnreadCounts(response.data.unreadCounts || {});
      }
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  const incrementUnreadCount = (donationId) => {
    // Don't increment if user is currently looking at this chat
    if (activeChatId === donationId) return;
    
    setUnreadCounts(prev => ({
      ...prev,
      [donationId]: (prev[donationId] || 0) + 1
    }));
  };

  const markAsRead = (donationId) => {
    setUnreadCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[donationId];
      return newCounts;
    });
  };

  const getUnreadCount = (donationId) => unreadCounts[donationId] || 0;

  return (
    <NotificationContext.Provider value={{ 
      unreadCounts, 
      fetchUnreadCounts, 
      incrementUnreadCount, 
      markAsRead, 
      getUnreadCount,
      setActiveChatId 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
