import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { NotificationProvider, useNotifications } from '../hooks/useNotifications';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';
import { CallNotification } from '../components/Call/CallNotification';
import { VideoCall } from '../components/Call/VideoCall';
import { callsAPI } from '../lib/api';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import '../styles/globals.css';

function SocketManager({ children }) {
  const { user } = useAuth();
  const { incrementUnreadCount } = useNotifications();
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);

  useEffect(() => {
    if (user?._id) {
      const socket = connectSocket(user._id);

      socket.on('incoming-call', (callRequest) => {
        console.log('📞 Incoming call:', callRequest);
        setIncomingCall(callRequest);
        toast('📞 Incoming video call!', { duration: 10000 });
      });

      socket.on('call-accepted', (callRequest) => {
        console.log('✅ Call accepted');
        setActiveCall(callRequest);
        setIncomingCall(null);
      });

      socket.on('call-rejected', ({ callId }) => {
        console.log('❌ Call rejected');
        toast.error('Call was declined');
        setActiveCall(null);
        setIncomingCall(null);
      });

      socket.on('call-ended', ({ callId }) => {
        console.log('📞 Call ended');
        setActiveCall(null);
        toast('Call ended');
      });

      socket.on('donation-claimed', ({ donationTitle, ngoName }) => {
        toast.success(`🎉 "${donationTitle}" was claimed by ${ngoName}!`, { duration: 6000 });
      });

      socket.on('new-emergency-alert', (alert) => {
        toast(`🚨 EMERGENCY: ${alert.title}\n${alert.area}`, {
          duration: 10000,
          icon: '🚨',
          style: { background: '#fef2f2', color: '#991b1b', fontWeight: 'bold' }
        });
      });

      // Listen for new messages to update unread counts
      socket.on('new-message', (message) => {
        // Only increment if we are not the sender
        if (message.senderId !== user._id) {
          console.log('💬 New message received for donation:', message.donationId);
          incrementUnreadCount(message.donationId);
        }
      });

      return () => {
        socket.off('incoming-call');
        socket.off('call-accepted');
        socket.off('call-rejected');
        socket.off('call-ended');
        socket.off('donation-claimed');
        socket.off('new-emergency-alert');
        socket.off('new-message');
        disconnectSocket();
      };
    }
  }, [user?._id]);

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    try {
      await callsAPI.acceptCall(incomingCall._id);
      const socket = getSocket();
      if (socket) {
        socket.emit('call-accepted', {
          callerId: incomingCall.callerId,
          callRequest: incomingCall
        });
      }
      setActiveCall(incomingCall);
      setIncomingCall(null);
    } catch (error) {
      toast.error('Failed to accept call');
    }
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;
    try {
      await callsAPI.rejectCall(incomingCall._id);
      const socket = getSocket();
      if (socket) {
        socket.emit('call-rejected', {
          callerId: incomingCall.callerId,
          callId: incomingCall._id
        });
      }
      setIncomingCall(null);
    } catch (error) {
      toast.error('Failed to reject call');
    }
  };

  const handleEndCall = async () => {
    if (!activeCall) return;
    try {
      await callsAPI.endCall(activeCall._id);
      const socket = getSocket();
      if (socket) {
        const otherUserId = activeCall.callerId === user?._id ? activeCall.receiverId : activeCall.callerId;
        socket.emit('call-ended', {
          otherUserId,
          callId: activeCall._id
        });
      }
      setActiveCall(null);
    } catch (error) {
      setActiveCall(null);
    }
  };

  return (
    <>
      {children}
      
      {incomingCall && (
        <CallNotification
          callData={incomingCall}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {activeCall && (
        <VideoCall
          callData={activeCall}
          onEnd={handleEndCall}
          isInitiator={activeCall.callerId === user?._id}
        />
      )}
    </>
  );
}

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <SocketManager>
          <Component {...pageProps} />
          <Toaster position="top-right" />
        </SocketManager>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default MyApp;