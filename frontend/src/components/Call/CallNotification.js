import { Phone, Video, X, Check } from 'lucide-react';

export const CallNotification = ({ callData, onAccept, onReject }) => {
  return (
    <div className="fixed top-4 right-4 z-[100] animate-bounce">
      <div className="bg-white rounded-2xl shadow-2xl border border-green-200 p-6 w-80">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
            <Video className="h-7 w-7 text-green-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">Incoming Video Call</p>
            <p className="text-gray-600 text-sm">{callData?.callerName}</p>
            <p className="text-gray-400 text-xs mt-1">wants to check the food donation</p>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onReject}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-colors"
          >
            <X className="h-5 w-5" />
            <span className="font-medium">Decline</span>
          </button>
          <button
            onClick={onAccept}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-colors"
          >
            <Check className="h-5 w-5" />
            <span className="font-medium">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};
