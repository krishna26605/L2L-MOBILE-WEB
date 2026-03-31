import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'your_email@gmail.com',
      pass: process.env.SMTP_PASS || 'your_app_password'
    }
  });
};

export const sendClaimNotificationEmail = async (donorEmail, donorName, ngoName, donationTitle, qrCodeDataUrl, verificationCode) => {
  try {
    const transporter = createTransporter();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/verify/${verificationCode}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || '"ZeroWaste DineMap" <noreply@zerowaste.com>',
      to: donorEmail,
      subject: `🎉 Your donation "${donationTitle}" has been claimed by ${ngoName}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f0fdf4; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
            .header { background: linear-gradient(135deg, #16a34a, #15803d); color: white; padding: 32px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
            .content { padding: 32px; }
            .info-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dcfce7; }
            .info-row:last-child { border-bottom: none; }
            .info-label { color: #166534; font-weight: 600; font-size: 14px; }
            .info-value { color: #15803d; font-size: 14px; }
            .qr-section { text-align: center; margin: 30px 0; padding: 24px; background: #fefce8; border: 2px dashed #facc15; border-radius: 16px; }
            .qr-section h2 { color: #854d0e; margin: 0 0 8px; font-size: 18px; }
            .qr-section p { color: #a16207; font-size: 13px; margin: 0 0 16px; }
            .qr-section img { width: 200px; height: 200px; border: 4px solid white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .instructions { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin: 20px 0; }
            .instructions h3 { color: #1e40af; margin: 0 0 12px; font-size: 16px; }
            .instructions ol { color: #1e3a5f; margin: 0; padding-left: 20px; }
            .instructions li { margin: 8px 0; font-size: 14px; }
            .footer { text-align: center; padding: 20px; background: #f9fafb; color: #6b7280; font-size: 12px; }
            .code-display { font-family: monospace; font-size: 20px; font-weight: bold; color: #b45309; background: #fff; padding: 8px 16px; border-radius: 8px; display: inline-block; margin: 8px 0; letter-spacing: 3px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Donation Claimed!</h1>
              <p>Your generosity is making a difference</p>
            </div>
            
            <div class="content">
              <p style="color: #374151; font-size: 16px;">Hello <strong>${donorName}</strong>,</p>
              <p style="color: #4b5563; font-size: 15px;">
                Great news! <strong>${ngoName}</strong> has claimed your food donation. 
                They will be arriving soon to pick it up.
              </p>
              
              <div class="info-box">
                <div class="info-row">
                  <span class="info-label">📦 Donation:</span>
                  <span class="info-value">${donationTitle}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">🏢 Claimed by:</span>
                  <span class="info-value">${ngoName}</span>
                </div>
              </div>
              
              <div class="qr-section">
                <h2>📱 Verification QR Code</h2>
                <p>Show this QR code to the NGO representative when they arrive for pickup</p>
                <img src="${qrCodeDataUrl}" alt="QR Code" />
                <br/>
                <p style="margin-top: 12px;">Or use this verification code:</p>
                <div class="code-display">${verificationCode}</div>
              </div>
              
              <div class="instructions">
                <h3>📋 How it works:</h3>
                <ol>
                  <li>Keep this QR code ready on your phone or print it</li>
                  <li>When the NGO arrives, show the QR code</li>
                  <li>The NGO will scan it to confirm the pickup</li>
                  <li>Both parties get confirmation once verified ✅</li>
                </ol>
              </div>
              
              <p style="color: #6b7280; font-size: 13px; text-align: center; margin-top: 24px;">
                You can also chat with ${ngoName} through your dashboard to coordinate pickup details.
              </p>
            </div>
            
            <div class="footer">
              <p>Made with ❤️ by ZeroWaste DineMap</p>
              <p>Fighting food waste, one donation at a time.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Claim notification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    // Don't throw - email failure shouldn't block the claim process
    return { success: false, error: error.message };
  }
};

export default { sendClaimNotificationEmail };
