import { useState, useEffect, useRef } from 'react';
import { Camera, X, CheckCircle, AlertCircle, QrCode } from 'lucide-react';
import { verificationAPI } from '../../lib/api';
import toast from 'react-hot-toast';

export const QRScanner = ({ onClose, onVerified }) => {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState('camera'); // 'camera' or 'manual'
  const scannerRef = useRef(null);
  const html5QrcodeRef = useRef(null);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      
      if (!scannerRef.current) return;

      const html5Qrcode = new Html5Qrcode('qr-reader');
      html5QrcodeRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        async (decodedText) => {
          console.log('📱 QR scanned:', decodedText);
          await stopScanner();
          
          // Extract verification code from URL
          const code = extractCode(decodedText);
          if (code) {
            await verifyCode(code);
          } else {
            toast.error('Invalid QR code');
          }
        },
        (errorMessage) => {
          // Ignore scan errors (they happen constantly while scanning)
        }
      );

      setScanning(true);
    } catch (error) {
      console.error('Scanner error:', error);
      toast.error('Could not access camera. Try manual code entry.');
      setMode('manual');
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        await html5QrcodeRef.current.stop();
      }
    } catch (error) {
      // Ignore stop errors
    }
    setScanning(false);
  };

  const extractCode = (text) => {
    // Try to extract code from URL like /verify/abc123
    const urlMatch = text.match(/\/verify\/([a-f0-9]+)/i);
    if (urlMatch) return urlMatch[1];
    // If it's just a plain code
    if (/^[a-f0-9]{32}$/i.test(text)) return text;
    return null;
  };

  const verifyCode = async (code) => {
    setVerifying(true);
    try {
      const response = await verificationAPI.verify(code);
      setResult({ success: true, donation: response.data.donation });
      toast.success('✅ Donation verified and marked as picked up!');
      if (onVerified) onVerified(response.data.donation);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Verification failed';
      setResult({ success: false, error: errorMsg });
      toast.error(errorMsg);
    } finally {
      setVerifying(false);
    }
  };

  const handleManualVerify = async (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await verifyCode(manualCode.trim());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <QrCode className="h-6 w-6" />
            <h3 className="font-semibold text-lg">Scan QR Code</h3>
          </div>
          <button onClick={() => { stopScanner(); onClose(); }} className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Mode toggle */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => { setMode('camera'); if (!scanning) startScanner(); }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                mode === 'camera' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              📷 Camera Scan
            </button>
            <button
              onClick={() => { stopScanner(); setMode('manual'); }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                mode === 'manual' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ⌨️ Manual Code
            </button>
          </div>

          {result ? (
            // Result display
            <div className={`text-center py-8 px-4 rounded-xl ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
              {result.success ? (
                <>
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h4 className="text-xl font-bold text-green-800 mb-2">Verified!</h4>
                  <p className="text-green-600">Donation has been marked as picked up.</p>
                  {result.donation && (
                    <p className="text-green-700 font-medium mt-2">{result.donation.title}</p>
                  )}
                </>
              ) : (
                <>
                  <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h4 className="text-xl font-bold text-red-800 mb-2">Verification Failed</h4>
                  <p className="text-red-600">{result.error}</p>
                </>
              )}
              <button
                onClick={() => { setResult(null); setManualCode(''); }}
                className="mt-6 bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Scan Another
              </button>
            </div>
          ) : mode === 'camera' ? (
            // Camera scanner
            <div>
              <div id="qr-reader" ref={scannerRef} className="rounded-xl overflow-hidden mb-4" style={{ width: '100%' }}></div>
              {!scanning && (
                <button
                  onClick={startScanner}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 flex items-center justify-center space-x-2 transition-colors"
                >
                  <Camera className="h-5 w-5" />
                  <span>Start Camera</span>
                </button>
              )}
              {scanning && (
                <p className="text-center text-gray-500 text-sm">Point camera at the donor&apos;s QR code</p>
              )}
            </div>
          ) : (
            // Manual code entry
            <form onSubmit={handleManualVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Verification Code
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter the code from donor's email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  disabled={verifying}
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim() || verifying}
                className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center"
              >
                {verifying ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  'Verify Code'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
