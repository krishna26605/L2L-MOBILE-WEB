import { Clock, MapPin, Package, Navigation, CheckCircle, AlertCircle, Camera, MessageCircle, Video } from 'lucide-react';
import { useState, useEffect } from 'react';

export const DonationListItem = ({ donation, onClaim, onViewRoute, unreadCount = 0, onChat, onVideoCall }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  // ✅ useEffect mein image URL process karo
  useEffect(() => {
    // In the useEffect of DonationListItem.js, update the processImageUrl function:
    const processImageUrl = (url) => {
      if (!url) return '';

      console.log('🖼️ NGO Dashboard - Original image URL:', url);

      // ✅ Case 1: If it's already a full backend URL, use it directly
      if (url.includes('localhost:5000/uploads')) {
        console.log('✅ Already correct backend URL');
        return url;
      }

      // ✅ Case 2: If it contains frontend URL, replace with backend URL
      if (url.includes('localhost:3000/api/uploads')) {
        const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        const correctedUrl = url.replace('http://localhost:3000/api/uploads', `${backendUrl}/uploads`);
        console.log('🔄 Fixed frontend URL to backend:', correctedUrl);
        return correctedUrl;
      }

      // ✅ Case 3: If it's just a filename or relative path
      if (url.startsWith('/uploads/') || !url.includes('://')) {
        const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
        // Remove any leading slash to avoid double slashes
        const cleanPath = url.startsWith('/') ? url.substring(1) : url;
        const fullUrl = `${backendUrl}/${cleanPath}`;
        console.log('✅ Built full backend URL:', fullUrl);
        return fullUrl;
      }

      // ✅ Case 4: Return as-is (might be external URL)
      console.log('⚠️ Unknown URL format, using as-is:', url);
      return url;
    };

    setImageUrl(processImageUrl(donation.imageUrl));
  }, [donation.imageUrl]);

  // Rest of the component...
  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'claimed': return 'bg-orange-100 text-orange-800';
      case 'picked': return 'bg-purple-100 text-purple-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return <Package className="h-4 w-4" />;
      case 'claimed': return <Clock className="h-4 w-4" />;
      case 'picked': return <CheckCircle className="h-4 w-4" />;
      case 'expired': return <AlertCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const handleImageError = () => {
    console.error('❌ Image failed to load:', imageUrl);
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log('✅ Image loaded successfully:', imageUrl);
    setImageLoaded(true);
  };

  const isExpired = new Date(donation.expiryTime) < new Date();
  const timeUntilExpiry = donation.timeUntilExpiry || 'Expired';

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image Section */}
      {imageUrl && !imageError ? (
        <div className="relative h-48 bg-gray-200 overflow-hidden">
          <img
            src={imageUrl}
            alt={donation.title}
            className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            onError={handleImageError}
            onLoad={handleImageLoad}
            loading="lazy"
          />

          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          )}

          {imageLoaded && (
            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              📸
            </div>
          )}

          <div className={`absolute top-2 left-2 flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(donation.status)}`}>
            {getStatusIcon(donation.status)}
            <span className="capitalize">{donation.status}</span>
          </div>
        </div>
      ) : (
        <div className="h-48 bg-gray-200 flex flex-col items-center justify-center text-gray-500 p-4">
          <Camera className="h-12 w-12 mb-2 opacity-50" />
          <p className="text-sm text-center">
            {imageError ? 'Photo not available' : 'No photo available'}
          </p>
          {imageUrl && imageError && (
            <p className="text-xs text-center mt-1 text-red-500">
              Failed to load image
            </p>
          )}

          <div className={`absolute top-2 left-2 flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(donation.status)}`}>
            {getStatusIcon(donation.status)}
            <span className="capitalize">{donation.status}</span>
          </div>
        </div>
      )}

      {/* Rest of the component */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {donation.title}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2">
              {donation.description}
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <Package className="h-4 w-4 mr-2" />
            <span>{donation.quantity} • {donation.foodType}</span>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2" />
            <span className="truncate">{donation.location?.address || 'Address not specified'}</span>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-2" />
            <span>Expires: {formatDate(donation.expiryTime)}</span>
          </div>
        </div>

        {donation.status === 'available' && (
          <div className="mb-4">
            <div className={`text-sm font-medium ${isExpired ? 'text-red-600' : 'text-orange-600'
              }`}>
              {isExpired ? 'Expired' : `Expires in ${timeUntilExpiry}`}
            </div>
          </div>
        )}

        <div className="flex flex-col space-y-3 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Posted {formatDate(donation.createdAt)}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => onViewRoute(donation)}
                className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors shadow-sm active:scale-95"
              >
                <Navigation className="h-4 w-4" />
                <span>Directions</span>
              </button>

              {donation.status === 'available' && (
                <button
                  onClick={() => onClaim(donation)}
                  className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors shadow-premium active:scale-95"
                >
                  Claim Donation
                </button>
              )}
            </div>
          </div>

          {/* Communication Sector - Built-in */}
          {donation.status === 'claimed' && (
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => onChat && onChat(donation)}
                className="flex-1 flex items-center justify-center space-x-2 bg-slate-50 text-slate-700 py-3 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 transition-all text-[10px] font-black uppercase tracking-tighter relative group shadow-sm active:scale-95 border border-slate-100"
              >
                <MessageCircle className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span>Quick Chat</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white shadow-md animate-subtle-pulse ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => onVideoCall && onVideoCall(donation)}
                className="flex-1 flex items-center justify-center space-x-2 bg-slate-50 text-slate-700 py-3 rounded-xl hover:bg-purple-50 hover:text-purple-700 transition-all text-[10px] font-black uppercase tracking-tighter group shadow-sm active:scale-95 border border-slate-100"
              >
                <Video className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span>Video Call</span>
              </button>
            </div>
          )}
        </div>

        {/* Debug info */}
        {process.env.NODE_ENV === 'development' && donation.imageUrl && (
          <div>
            {/* <p><strong>Debug Image Info:</strong></p>
            <p><strong>DB URL:</strong> {donation.imageUrl}</p>
            <p><strong>Processed:</strong> {imageUrl}</p>
            <p><strong>Status:</strong> {imageLoaded ? '✅ Loaded' : imageError ? '❌ Error' : '⏳ Loading'}</p>
            <button 
              onClick={() => window.open(imageUrl, '_blank')}
              className="mt-1 text-blue-600 underline text-xs"
            >
              Test URL in new tab
            </button> */}
          </div>
        )}
      </div>
    </div>
  );
};
