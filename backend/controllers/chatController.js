import { Message } from '../models/Message.js';
import { FoodDonation } from '../models/FoodDonation.js';

export const chatController = {
  // Get messages for a donation
  async getMessages(req, res) {
    try {
      const { donationId } = req.params;
      const userId = req.user._id;

      // Check if user has access to this chat (donor or claiming NGO)
      const donation = await FoodDonation.findById(donationId);
      if (!donation) {
        return res.status(404).json({ success: false, error: 'Donation not found' });
      }

      const isDonor = donation.donorId.toString() === userId.toString();
      const isClaimingNGO = donation.claimedBy && donation.claimedBy.toString() === userId.toString();

      if (!isDonor && !isClaimingNGO) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const messages = await Message.find({ donationId })
        .sort({ createdAt: 1 })
        .limit(200);

      // Mark unread messages as read
      await Message.updateMany(
        { donationId, receiverId: userId, readAt: null },
        { readAt: new Date() }
      );

      res.json({ success: true, messages });
    } catch (error) {
      console.error('❌ Get messages error:', error);
      res.status(500).json({ success: false, error: 'Failed to get messages' });
    }
  },

  // Send a message
  async sendMessage(req, res) {
    try {
      const { donationId } = req.params;
      const { content } = req.body;
      const senderId = req.user._id;

      if (!content || !content.trim()) {
        return res.status(400).json({ success: false, error: 'Message content is required' });
      }

      const donation = await FoodDonation.findById(donationId);
      if (!donation) {
        return res.status(404).json({ success: false, error: 'Donation not found' });
      }

      if (donation.status !== 'claimed') {
        return res.status(400).json({ success: false, error: 'Chat is only available for claimed donations' });
      }

      const isDonor = donation.donorId.toString() === senderId.toString();
      const isClaimingNGO = donation.claimedBy && donation.claimedBy.toString() === senderId.toString();

      if (!isDonor && !isClaimingNGO) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const receiverId = isDonor ? donation.claimedBy : donation.donorId;

      const message = new Message({
        donationId,
        senderId,
        senderName: req.user.displayName,
        senderRole: req.user.role,
        receiverId,
        content: content.trim()
      });

      await message.save();

      res.status(201).json({ success: true, message });
    } catch (error) {
      console.error('❌ Send message error:', error);
      res.status(500).json({ success: false, error: 'Failed to send message' });
    }
  },

  // Get unread message counts grouped by donation
  async getUnreadCount(req, res) {
    try {
      const userId = req.user._id;
      
      const unreadMessages = await Message.aggregate([
        {
          $match: {
            receiverId: userId,
            readAt: null
          }
        },
        {
          $group: {
            _id: '$donationId',
            count: { $sum: 1 }
          }
        }
      ]);

      // Convert array result to object { donationId: count }
      const unreadCounts = unreadMessages.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {});

      res.json({ success: true, unreadCounts });
    } catch (error) {
      console.error('❌ Get unread count error:', error);
      res.status(500).json({ success: false, error: 'Failed to get unread counts' });
    }
  }
};
