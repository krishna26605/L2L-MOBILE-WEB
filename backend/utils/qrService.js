import QRCode from 'qrcode';
import crypto from 'crypto';

// Generate unique verification code
export const generateVerificationCode = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Generate QR code as data URL (base64 image)
export const generateQRCode = async (data) => {
  try {
    const qrDataUrl = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: '#16a34a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    });
    console.log('✅ QR code generated successfully');
    return qrDataUrl;
  } catch (error) {
    console.error('❌ QR code generation failed:', error);
    throw error;
  }
};

export default { generateVerificationCode, generateQRCode };
