import { useState, useEffect } from 'react';
import { Plus, Package, TrendingUp, Clock, RefreshCw, MessageCircle, Phone, Video } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { donationsAPI, callsAPI } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { Navbar } from '../Layout/Navbar';
import { PostFoodForm } from './PostFoodForm';
import { DonationCard } from './DonationCard';
import { ChatWindow } from '../Chat/ChatWindow';
import { AlertBanner } from '../Alert/AlertBanner';
import { useNotifications } from '../../hooks/useNotifications';
import { Badge } from '../Common/Badge';
import toast from 'react-hot-toast';

export const DonorDashboard = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [chatDonation, setChatDonation] = useState(null);
  const { getUnreadCount } = useNotifications();

  useEffect(() => {
    if (!user) return;
    fetchDonations();
  }, [user]);

  const fetchDonations = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      const response = await donationsAPI.getAll({ donorId: user._id });
      setDonations(response.data.donations || []);
    } catch (error) {
      console.error('❌ Error fetching donations:', error);
      setError('Failed to load donations');
      toast.error('Failed to load donations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePostSuccess = (newDonation) => {
    if (newDonation) {
      setDonations(prev => [newDonation, ...prev]);
    } else {
      fetchDonations(false);
    }
    toast.success('🎉 Donation posted successfully!', { duration: 4000 });
    setShowPostForm(false);
  };

  const handleRefresh = () => {
    fetchDonations(false);
    toast.success('Donations list refreshed!');
  };

  const handleCall = (donation) => {
    if (donation.claimedBy && donation.claimedBy.phone) {
      window.open(`tel:${donation.claimedBy.phone}`, '_self');
    } else {
      toast.error('Phone number not available');
    }
  };

  const handleVideoCall = async (donation) => {
    if (!donation.claimedBy) {
      toast.error('No NGO has claimed this donation yet');
      return;
    }
    try {
      const response = await callsAPI.requestCall(donation._id);
      const socket = getSocket();
      if (socket) {
        socket.emit('call-request', {
          receiverId: typeof donation.claimedBy === 'object' ? donation.claimedBy._id : donation.claimedBy,
          callRequest: response.data.callRequest
        });
      }
      toast.success('Video call request sent! Waiting for NGO to accept...');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to request call');
    }
  };

  const stats = {
    total: donations.length,
    available: donations.filter(d => d.status === 'available').length,
    claimed: donations.filter(d => d.status === 'claimed').length,
    completed: donations.filter(d => d.status === 'picked').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar title="Donor Dashboard" />
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <RefreshCw className="h-8 w-8 animate-spin text-green-600 mb-4" />
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar title="Donor Dashboard" />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={fetchDonations} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar title="Donor Dashboard" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Emergency Alerts Banner */}
        <div className="mb-8 transform transition-all hover:scale-[1.01]">
          <AlertBanner />
        </div>

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-6 animate-fade-in">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="h-1 bg-primary-500 w-12 rounded-full"></div>
              <span className="text-primary-600 font-bold uppercase tracking-widest text-xs">Overview</span>
            </div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Welcome, {user?.displayName || 'Donor'}</h1>
            <p className="text-slate-500 mt-2 font-medium max-w-lg">
              Manage your surplus food donations and track their impact in real-time.
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-secondary px-5 py-3 rounded-2xl flex items-center shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="font-bold text-sm">{refreshing ? 'Syncing...' : 'Sync Data'}</span>
            </button>
            <button
              onClick={() => setShowPostForm(true)}
              className="btn-primary px-6 py-3 rounded-2xl flex items-center shadow-premium"
            >
              <Plus className="h-5 w-5 mr-2" />
              <span className="font-bold">Post Surplus Food</span>
            </button>
          </div>
        </div>

        {/* Stats Cards - Premium Redesign */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-slide-up">
          <div className="card-premium p-6 group hover:translate-y-[-4px]">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                <Package className="h-6 w-6" />
              </div>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">Lifetime</span>
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Total Donations</p>
            <div className="flex items-end space-x-2 mt-1">
              <p className="text-3xl font-black text-slate-900 leading-none">{stats.total}</p>
              <span className="text-xs text-slate-400 font-medium pb-1 uppercase">Posts</span>
            </div>
          </div>

          <div className="card-premium p-6 group hover:translate-y-[-4px]">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                <Clock className="h-6 w-6" />
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">Active</span>
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Available Now</p>
            <div className="flex items-end space-x-2 mt-1">
              <p className="text-3xl font-black text-slate-900 leading-none">{stats.available}</p>
              <span className="text-xs text-slate-400 font-medium pb-1 uppercase">Open</span>
            </div>
          </div>

          <div className="card-premium p-6 group hover:translate-y-[-4px]">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
                <TrendingUp className="h-6 w-6" />
              </div>
              <span className="bg-orange-50 text-orange-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">In Progress</span>
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Claimed by NGO</p>
            <div className="flex items-end space-x-2 mt-1">
              <p className="text-3xl font-black text-slate-900 leading-none">{stats.claimed}</p>
              <span className="text-xs text-slate-400 font-medium pb-1 uppercase">Active</span>
            </div>
          </div>

          <div className="card-premium p-6 group hover:translate-y-[-4px]">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                <Package className="h-6 w-6" />
              </div>
              <span className="bg-purple-50 text-purple-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">Completed</span>
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Impact Made</p>
            <div className="flex items-end space-x-2 mt-1">
              <p className="text-3xl font-black text-slate-900 leading-none">{stats.completed}</p>
              <span className="text-xs text-slate-400 font-medium pb-1 uppercase">Picked up</span>
            </div>
          </div>
        </div>

        {/* Donations List Section */}
        <div className="space-y-8">
          <div className="flex justify-between items-center border-b border-slate-200 pb-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-black text-slate-900">Your Food Donations</h2>
              <div className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                {donations.length} RECORDS
              </div>
            </div>
          </div>
          
          {donations.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200 animate-fade-in shadow-premium">
              <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">No donations found</h3>
              <p className="text-slate-500 mb-8 max-w-sm mx-auto font-medium">
                You haven't posted any food donations yet. Start making a difference today!
              </p>
              <button
                onClick={() => setShowPostForm(true)}
                className="btn-primary px-8 py-4 rounded-2xl shadow-premium inline-flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                <span className="font-bold">Post Your First Donation</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {donations.map((donation, index) => (
                <div key={donation._id} className="group animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                    <DonationCard 
                      donation={donation}
                      onUpdate={fetchDonations}
                      unreadCount={getUnreadCount(donation._id)}
                      onChat={setChatDonation}
                      onVideoCall={handleVideoCall}
                    />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Post Food Modal */}
      {showPostForm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-premium-hover animate-scale-in">
            <PostFoodForm
              onClose={() => setShowPostForm(false)}
              onSuccess={handlePostSuccess}
            />
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {chatDonation && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-hidden">
          <div className="w-full max-w-lg h-[90vh] sm:h-[80vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-premium-hover flex flex-col animate-slide-up overflow-hidden">
            <ChatWindow
              donation={chatDonation}
              otherPartyName={chatDonation.claimedByName || 'NGO'}
              onClose={() => setChatDonation(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};