import { CallRequest } from '../models/CallRequest.js';
import { FoodDonation } from '../models/FoodDonation.js';
import { User } from '../models/User.js';

export const callController = {
  // Request a video call
  async requestCall(req, res) {
    try {
      const { donationId, peerId } = req.body;
      const callerId = req.user._id;

      const donation = await FoodDonation.findById(donationId);
      if (!donation) {
        return res.status(404).json({ success: false, error: 'Donation not found' });
      }

      if (donation.status !== 'claimed') {
        return res.status(400).json({ success: false, error: 'Calls only available for claimed donations' });
      }

      const isDonor = donation.donorId.toString() === callerId.toString();
      const isNGO = donation.claimedBy && donation.claimedBy.toString() === callerId.toString();

      if (!isDonor && !isNGO) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const receiverId = isDonor ? donation.claimedBy : donation.donorId;
      const receiver = await User.findById(receiverId);

      // Check for existing pending call
      const existingCall = await CallRequest.findOne({
        donationId,
        status: 'pending'
      });

      if (existingCall) {
        return res.status(400).json({ success: false, error: 'There is already a pending call request' });
      }

      const callRequest = new CallRequest({
        donationId,
        callerId,
        callerName: req.user.displayName,
        receiverId,
        receiverName: receiver.displayName,
        peerId: peerId || null,
        status: 'pending'
      });

      await callRequest.save();
      console.log(`📞 Call request created: ${req.user.displayName} → ${receiver.displayName}`);

      res.status(201).json({ success: true, callRequest });
    } catch (error) {
      console.error('❌ Request call error:', error);
      res.status(500).json({ success: false, error: 'Failed to request call' });
    }
  },

  // Accept a call
  async acceptCall(req, res) {
    try {
      const { callId } = req.params;
      const { peerId } = req.body;
      const userId = req.user._id;

      const callRequest = await CallRequest.findById(callId);
      if (!callRequest) {
        return res.status(404).json({ success: false, error: 'Call request not found' });
      }

      if (callRequest.receiverId.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, error: 'Only the receiver can accept' });
      }

      if (callRequest.status !== 'pending') {
        return res.status(400).json({ success: false, error: 'Call is no longer pending' });
      }

      callRequest.status = 'accepted';
      callRequest.acceptedAt = new Date();
      await callRequest.save();

      res.json({ success: true, callRequest });
    } catch (error) {
      console.error('❌ Accept call error:', error);
      res.status(500).json({ success: false, error: 'Failed to accept call' });
    }
  },

  // Reject a call
  async rejectCall(req, res) {
    try {
      const { callId } = req.params;
      const userId = req.user._id;

      const callRequest = await CallRequest.findById(callId);
      if (!callRequest) {
        return res.status(404).json({ success: false, error: 'Call request not found' });
      }

      if (callRequest.receiverId.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, error: 'Only the receiver can reject' });
      }

      callRequest.status = 'rejected';
      await callRequest.save();

      res.json({ success: true, callRequest });
    } catch (error) {
      console.error('❌ Reject call error:', error);
      res.status(500).json({ success: false, error: 'Failed to reject call' });
    }
  },

  // End a call
  async endCall(req, res) {
    try {
      const { callId } = req.params;

      const callRequest = await CallRequest.findById(callId);
      if (!callRequest) {
        return res.status(404).json({ success: false, error: 'Call request not found' });
      }

      callRequest.status = 'ended';
      callRequest.endedAt = new Date();
      await callRequest.save();

      res.json({ success: true, callRequest });
    } catch (error) {
      console.error('❌ End call error:', error);
      res.status(500).json({ success: false, error: 'Failed to end call' });
    }
  },

  // Get pending calls for current user
  async getPendingCalls(req, res) {
    try {
      const userId = req.user._id;
      const pendingCalls = await CallRequest.find({
        receiverId: userId,
        status: 'pending'
      }).sort({ createdAt: -1 });

      res.json({ success: true, calls: pendingCalls });
    } catch (error) {
      console.error('❌ Get pending calls error:', error);
      res.status(500).json({ success: false, error: 'Failed to get pending calls' });
    }
  }
};
