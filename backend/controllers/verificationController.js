import { FoodDonation } from '../models/FoodDonation.js';
import { User } from '../models/User.js';

export const verificationController = {
  // Verify QR code / verification code
  async verifyPickup(req, res) {
    try {
      const { code } = req.params;

      if (!code) {
        return res.status(400).json({ success: false, error: 'Verification code is required' });
      }

      const donation = await FoodDonation.findOne({ verificationCode: code })
        .populate('donorId', 'displayName email phone')
        .populate('claimedBy', 'displayName email phone');

      if (!donation) {
        return res.status(404).json({ success: false, error: 'Invalid verification code' });
      }

      if (donation.status === 'picked') {
        return res.status(400).json({
          success: false,
          error: 'This donation has already been verified and picked up',
          donation: donation.toJSON()
        });
      }

      if (donation.status !== 'claimed') {
        return res.status(400).json({
          success: false,
          error: 'This donation is not in a claimable state'
        });
      }

      // Mark as picked up
      donation.status = 'picked';
      donation.pickedAt = new Date();
      donation.verifiedAt = new Date();
      await donation.save();

      console.log(`✅ Donation ${donation._id} verified and picked up via QR code`);

      res.json({
        success: true,
        message: 'Donation verified and marked as picked up!',
        donation: donation.toJSON()
      });
    } catch (error) {
      console.error('❌ Verify pickup error:', error);
      res.status(500).json({ success: false, error: 'Verification failed' });
    }
  },

  // Get verification status
  async getVerificationStatus(req, res) {
    try {
      const { code } = req.params;

      const donation = await FoodDonation.findOne({ verificationCode: code })
        .populate('donorId', 'displayName email')
        .populate('claimedBy', 'displayName email');

      if (!donation) {
        return res.status(404).json({ success: false, error: 'Invalid verification code' });
      }

      res.json({
        success: true,
        verified: donation.status === 'picked',
        donation: donation.toJSON()
      });
    } catch (error) {
      console.error('❌ Get verification status error:', error);
      res.status(500).json({ success: false, error: 'Failed to get verification status' });
    }
  }
};
