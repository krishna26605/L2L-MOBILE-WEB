import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function testEmail() {
  console.log('🔗 Testing SMTP connection with:');
  console.log('   User:', process.env.SMTP_USER);
  console.log('   Host:', process.env.SMTP_HOST);
  console.log('   Port:', process.env.SMTP_PORT);

  try {
    // Verify connection configuration
    await transporter.verify();
    console.log('\n✅ SMTP Connection Successful! Your credentials are correct.');
    
    /* 
    // Optional: Send a test email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.SMTP_USER, // Send to yourself
      subject: 'ZeroWaste DineMap - SMTP Test',
      text: 'If you are reading this, your email system is working perfectly!',
      html: '<b>If you are reading this, your email system is working perfectly!</b>',
    });
    console.log('📧 Test email sent: %s', info.messageId);
    */
  } catch (error) {
    console.error('\n❌ SMTP Connection Failed:', error.message);
    if (error.message.includes('Invalid login')) {
      console.log('💡 Tip: Double-check your App Password. Make sure 2-Step Verification is enabled on your Google Account.');
    }
  }
}

testEmail();
