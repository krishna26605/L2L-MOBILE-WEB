import { useState, useEffect, useRef } from 'react';
import { X, Video, VideoOff, Mic, MicOff, PhoneOff } from 'lucide-react';
import toast from 'react-hot-toast';

export const VideoCall = ({ callData, onEnd, isInitiator }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);

  useEffect(() => {
    startCall();
    return () => {
      cleanup();
    };
  }, []);

  const startCall = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Dynamic import PeerJS (client-side only)
      const { default: Peer } = await import('peerjs');
      
      const peer = new Peer(undefined, {
        debug: 1 
      });

      peerRef.current = peer;

      peer.on('open', (id) => {
        console.log('📞 My peer ID:', id);
        setConnecting(false);
        
        if (isInitiator && callData?.peerId) {
          // Call the other peer
          const call = peer.call(callData.peerId, stream);
          call.on('stream', (remoteStream) => {
            setRemoteStream(remoteStream);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
            setConnected(true);
          });
          call.on('close', () => {
            handleEndCall();
          });
        }
      });

      // Answer incoming calls
      peer.on('call', (call) => {
        call.answer(stream);
        call.on('stream', (remoteStream) => {
          setRemoteStream(remoteStream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          setConnected(true);
        });
        call.on('close', () => {
          handleEndCall();
        });
      });

      peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        toast.error('Connection error. Please try again.');
        setConnecting(false);
      });

    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Could not access camera/microphone. Please check permissions.');
      setConnecting(false);
    }
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
  };

  const handleEndCall = () => {
    cleanup();
    if (onEnd) onEnd();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Remote video (full screen) */}
      <div className="flex-1 relative bg-gray-900">
        {connecting && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-lg">Connecting...</p>
              <p className="text-sm text-gray-400">{callData?.callerName || callData?.receiverName || 'Other party'}</p>
            </div>
          </div>
        )}
        
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : !connecting && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">{(callData?.callerName || callData?.receiverName || '?')[0].toUpperCase()}</span>
              </div>
              <p className="text-lg">Waiting for connection...</p>
            </div>
          </div>
        )}

        {/* Local video (picture-in-picture) */}
        <div className="absolute top-4 right-4 w-32 h-44 sm:w-40 sm:h-56 bg-gray-800 rounded-xl overflow-hidden shadow-lg border-2 border-gray-700">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          {isVideoOff && (
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              <VideoOff className="h-8 w-8 text-gray-500" />
            </div>
          )}
        </div>

        {/* Caller info */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg">
          <p className="font-semibold">{callData?.callerName || callData?.receiverName}</p>
          <p className="text-xs text-gray-300">
            {connected ? '🟢 Connected' : connecting ? '🟡 Connecting...' : '🟡 Waiting...'}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-900 px-6 py-6 flex items-center justify-center space-x-6">
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isMuted ? <MicOff className="h-6 w-6 text-white" /> : <Mic className="h-6 w-6 text-white" />}
        </button>

        <button
          onClick={handleEndCall}
          className="w-16 h-16 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors"
        >
          <PhoneOff className="h-7 w-7 text-white" />
        </button>

        <button
          onClick={toggleVideo}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          {isVideoOff ? <VideoOff className="h-6 w-6 text-white" /> : <Video className="h-6 w-6 text-white" />}
        </button>
      </div>
    </div>
  );
};
