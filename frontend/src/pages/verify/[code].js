import { useEffect, useState } from 'react';
import { verificationAPI } from '../../lib/api';
import { useRouter } from 'next/router';
import { CheckCircle, AlertCircle, Package } from 'lucide-react';

export default function VerifyPage() {
  const router = useRouter();
  const { code } = router.query;
  const [status, setStatus] = useState('loading'); // loading, verified, already, error
  const [donation, setDonation] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (code) {
      checkVerification();
    }
  }, [code]);

  const checkVerification = async () => {
    try {
      const response = await verificationAPI.getStatus(code);
      if (response.data.verified) {
        setStatus('already');
        setDonation(response.data.donation);
      } else {
        setStatus('pending');
        setDonation(response.data.donation);
      }
    } catch (error) {
      setStatus('error');
      setError(error.response?.data?.error || 'Invalid verification code');
    }
  };

  const handleVerify = async () => {
    try {
      setStatus('verifying');
      const response = await verificationAPI.verify(code);
      setStatus('verified');
      setDonation(response.data.donation);
    } catch (error) {
      setStatus('error');
      setError(error.response?.data?.error || 'Verification failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        {status === 'loading' && (
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking verification status...</p>
          </div>
        )}

        {status === 'pending' && (
          <div>
            <Package className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm Pickup</h2>
            {donation && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                <p className="text-sm text-gray-600"><strong>Donation:</strong> {donation.title}</p>
                <p className="text-sm text-gray-600"><strong>Donor:</strong> {donation.donorName}</p>
              </div>
            )}
            <p className="text-gray-600 mb-6">Tap the button below to confirm this donation has been picked up.</p>
            <button
              onClick={handleVerify}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              ✅ Confirm Pickup
            </button>
          </div>
        )}

        {status === 'verifying' && (
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying pickup...</p>
          </div>
        )}

        {status === 'verified' && (
          <div>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-800 mb-2">Pickup Verified! 🎉</h2>
            <p className="text-green-600 mb-4">The donation has been successfully picked up.</p>
            {donation && (
              <div className="bg-green-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-green-700"><strong>{donation.title}</strong></p>
              </div>
            )}
            <button
              onClick={() => router.push('/')}
              className="bg-green-600 text-white py-2 px-6 rounded-xl hover:bg-green-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {status === 'already' && (
          <div>
            <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Already Verified</h2>
            <p className="text-gray-600 mb-4">This donation was already picked up.</p>
            <button
              onClick={() => router.push('/')}
              className="bg-gray-600 text-white py-2 px-6 rounded-xl hover:bg-gray-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-800 mb-2">Verification Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-gray-600 text-white py-2 px-6 rounded-xl hover:bg-gray-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
