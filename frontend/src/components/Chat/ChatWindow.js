import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { chatAPI } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import toast from 'react-hot-toast';

export const ChatWindow = ({ donation, otherPartyName, onClose }) => {
  const { user } = useAuth();
  const { markAsRead, setActiveChatId } = useNotifications();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setActiveChatId(donation._id);
    fetchMessages();
    
    const socket = getSocket();
    if (socket) {
      socket.emit('join-chat', donation._id);
      
      socket.on('new-message', (message) => {
        setMessages(prev => [...prev, message]);
      });
    }

    return () => {
      setActiveChatId(null);
      if (socket) {
        socket.emit('leave-chat', donation._id);
        socket.off('new-message');
      }
    };
  }, [donation._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getMessages(donation._id);
      if (response.data.success) {
        setMessages(response.data.messages || []);
        markAsRead(donation._id);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await chatAPI.sendMessage(donation._id, newMessage.trim());
      const sentMessage = response.data.message;
      
      setMessages(prev => [...prev, sentMessage]);
      
      // Emit via socket for real-time delivery
      const socket = getSocket();
      if (socket) {
        socket.emit('send-message', {
          donationId: donation._id,
          message: sentMessage
        });
      }

      setNewMessage('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString();
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = formatDate(msg.createdAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ height: '600px', maxHeight: '85vh' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">{otherPartyName}</h3>
              <p className="text-green-100 text-xs truncate max-w-[200px]">
                Re: {donation.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No messages yet</p>
                <p className="text-sm">Start a conversation about this donation</p>
              </div>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                <div className="flex justify-center mb-3">
                  <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                    {date}
                  </span>
                </div>
                {msgs.map((msg) => {
                  const isMe = msg.senderId === user?._id;
                  return (
                    <div key={msg._id} className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                        isMe 
                          ? 'bg-green-600 text-white rounded-br-md' 
                          : 'bg-white text-gray-800 rounded-bl-md shadow-sm border'
                      }`}>
                        {!isMe && (
                          <p className={`text-xs font-semibold mb-1 ${isMe ? 'text-green-100' : 'text-green-600'}`}>
                            {msg.senderName}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-green-200' : 'text-gray-400'} text-right`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 border-t bg-white rounded-b-2xl">
          <div className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              disabled={sending}
              autoFocus
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
