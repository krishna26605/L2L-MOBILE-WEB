// C:\Users\Krishna\OneDrive\Desktop\L2L-Mobile-app\backend\controllers\donationController.js

import { FoodDonation } from '../models/FoodDonation.js';
import { User } from '../models/User.js';
import { ClaimRequest } from '../models/ClaimRequest.js';
import { generateVerificationCode, generateQRCode } from '../utils/qrService.js';
import { sendClaimNotificationEmail } from '../utils/emailService.js';


export const donationController = {
  
  // ✅ Get all donations with filtering
  async getAllDonations(req, res) {
    try {
      console.log('🔍 AUTH USER:', req.user?.role);
      console.log('📊 Query params:', req.query);

      const { limit = 100, status, donorId, claimedBy } = req.query;
      
      let donations;

      // ✅ FIXED: Simple query - always return available donations
      if (status === 'available') {
        console.log('🔍 Fetching available donations...');
        donations = await FoodDonation.find({
          status: 'available',
          expiryTime: { $gt: new Date() } // Not expired
        })
        .populate('donorId', 'displayName email phone')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));
      } 
      else if (donorId) {
        donations = await FoodDonation.find({ donorId })
          .populate('donorId', 'displayName email phone')
          .sort({ createdAt: -1 })
          .limit(parseInt(limit));
      }
      else if (claimedBy) {
        donations = await FoodDonation.find({ claimedBy })
          .populate('donorId', 'displayName email phone')
          .sort({ createdAt: -1 })
          .limit(parseInt(limit));
      }
      else {
        // ✅ DEFAULT: Show all available donations (even without status filter)
        console.log('🔍 Fetching ALL available donations (default)...');
        donations = await FoodDonation.find({
          status: 'available',
          expiryTime: { $gt: new Date() }
        })
        .populate('donorId', 'displayName email phone')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));
      }

      console.log(`🎯 Final result: ${donations.length} donations`);
      
      // ✅ DEBUG: Check what's being returned
      if (donations.length > 0) {
        console.log('📍 First donation in response:', {
          id: donations[0]._id,
          title: donations[0].title,
          status: donations[0].status,
          location: donations[0].location,
          expiryTime: donations[0].expiryTime
        });
      }

      res.json({
        success: true,
        donations: donations.map(donation => donation.toJSON()),
        metadata: {
          totalCount: donations.length,
          userRole: req.user?.role
        }
      });
    } catch (error) {
      console.error('❌ Get donations error:', error);
      res.status(500).json({ error: 'Failed to get donations' });
    }
  },

  // Claim donation method
  async claimDonation(req, res) {
    try {
      const donationId = req.params.id;
      const ngoId = req.user._id;
      const ngoName = req.user.displayName || req.user.organizationName;

      console.log(`🏢 NGO ${ngoName} (${ngoId}) claiming donation ${donationId}`);

      // Check if donation exists and is available
      const donation = await FoodDonation.findById(donationId);
      if (!donation) {
        return res.status(404).json({
          success: false,
          error: 'Donation not found'
        });
      }

      if (donation.status !== 'available') {
        return res.status(400).json({
          success: false,
          error: 'Donation is no longer available'
        });
      }

      // Check if donation has expired
      if (new Date() > new Date(donation.expiryTime)) {
        return res.status(400).json({
          success: false,
          error: 'Donation has expired'
        });
      }

      // Check if NGO has already claimed this donation
      const existingClaim = await ClaimRequest.findOne({
        donationId,
        ngoId,
        status: { $in: ['pending', 'approved'] }
      });

      if (existingClaim) {
        return res.status(400).json({
          success: false,
          error: 'You have already claimed this donation'
        });
      }

      // Create claim request with approved status (direct claiming)
      const claimRequest = new ClaimRequest({
        donationId,
        ngoId,
        ngoName,
        status: 'approved',
        approvedAt: new Date()
      });

      await claimRequest.save();

      // Generate verification code and QR
      const verificationCode = generateVerificationCode();
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const verificationUrl = `${frontendUrl}/verify/${verificationCode}`;
      const qrCodeDataUrl = await generateQRCode(verificationUrl);

      // Update donation status with verification code
      donation.status = 'claimed';
      donation.claimedBy = ngoId;
      donation.claimedByName = ngoName;
      donation.claimedAt = new Date();
      donation.verificationCode = verificationCode;
      await donation.save();

      // Get donor info for email
      const donor = await User.findById(donation.donorId);
      if (donor && donor.email) {
        // Send email with QR code (non-blocking)
        sendClaimNotificationEmail(
          donor.email,
          donor.displayName,
          ngoName,
          donation.title,
          qrCodeDataUrl,
          verificationCode
        ).then(result => {
          if (result.success) {
            console.log(`📧 Email sent to donor ${donor.email}`);
          } else {
            console.warn(`⚠️ Email failed for ${donor.email}:`, result.error);
          }
        });
      }

      // Emit socket event for real-time notification
      const io = req.app.get('io');
      const onlineUsers = req.app.get('onlineUsers');
      if (io && onlineUsers) {
        const donorSocketId = onlineUsers.get(donation.donorId.toString());
        if (donorSocketId) {
          io.to(donorSocketId).emit('donation-claimed', {
            donationId: donation._id,
            ngoName,
            donationTitle: donation.title
          });
        }
      }

      console.log(`✅ Donation ${donationId} claimed successfully by NGO ${ngoName}`);

      res.status(200).json({
        success: true,
        message: 'Donation claimed successfully',
        donation: donation.toJSON(),
        claimRequest: claimRequest
      });

    } catch (error) {
      console.error('❌ Claim donation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to claim donation'
      });
    }
  },

  // Get NGO's claimed donations
  async getMyClaimedDonations(req, res) {
    try {
      const ngoId = req.user._id;
      const { status, limit = 50 } = req.query;

      console.log(`📋 Fetching claims for NGO: ${ngoId}`);

      let query = { ngoId };
      
      // Filter by status if provided
      if (status && ['pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
        query.status = status;
      }

      // Find claim requests for this NGO
      const claimRequests = await ClaimRequest.find(query)
        .populate('donationId')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

      // Also get donations claimed by this NGO
      const claimedDonations = await FoodDonation.find({
        claimedBy: ngoId,
        status: { $in: ['claimed', 'picked'] }
      })
      .populate('donorId', 'displayName email phone')
      .sort({ claimedAt: -1 })
      .limit(parseInt(limit));

      console.log(`📦 Found ${claimRequests.length} claim requests and ${claimedDonations.length} claimed donations`);

      res.status(200).json({
        success: true,
        claimRequests: claimRequests,
        claimedDonations: claimedDonations.map(donation => donation.toJSON()),
        counts: {
          claims: claimRequests.length,
          donations: claimedDonations.length
        }
      });

    } catch (error) {
      console.error('❌ Get my claims error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch claimed donations'
      });
    }
  },

  // Cancel claim request
  async cancelClaim(req, res) {
    try {
      const { claimId } = req.params;
      const ngoId = req.user._id;

      console.log(`❌ Canceling claim ${claimId} for NGO ${ngoId}`);

      const claimRequest = await ClaimRequest.findOne({
        _id: claimId,
        ngoId
      });

      if (!claimRequest) {
        return res.status(404).json({
          success: false,
          error: 'Claim request not found'
        });
      }

      if (claimRequest.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Only pending claims can be cancelled'
        });
      }

      // Update claim status
      claimRequest.status = 'cancelled';
      claimRequest.cancelledAt = new Date();
      await claimRequest.save();

      // If donation was claimed, make it available again
      const donation = await FoodDonation.findById(claimRequest.donationId);
      if (donation && donation.status === 'claimed' && donation.claimedBy.toString() === ngoId.toString()) {
        donation.status = 'available';
        donation.claimedBy = null;
        donation.claimedByName = null;
        donation.claimedAt = null;
        await donation.save();
      }

      console.log(`✅ Claim ${claimId} cancelled successfully`);

      res.status(200).json({
        success: true,
        message: 'Claim cancelled successfully',
        claimRequest: claimRequest
      });

    } catch (error) {
      console.error('❌ Cancel claim error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel claim'
      });
    }
  },

  // Get donation by ID
  async getDonationById(req, res) {
    try {
      const { id } = req.params;
      const donation = await FoodDonation.findById(id)
        .populate('donorId', 'displayName email phone');
      
      if (!donation) {
        return res.status(404).json({ error: 'Donation not found' });
      }

      // Get claim requests for this donation
      const claimRequests = await ClaimRequest.find({ donationId: id })
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        donation: donation.toJSON(),
        claimRequests: claimRequests,
        claimCount: claimRequests.length
      });
    } catch (error) {
      console.error('❌ Get donation by ID error:', error);
      res.status(500).json({ error: 'Failed to get donation' });
    }
  },

  // Create new donation
  async createDonation(req, res) {
    try {
      console.log('📥 Received donation data:', JSON.stringify(req.body, null, 2));
      
      const {
        title,
        description,
        quantity,
        foodType,
        expiryTime,
        pickupWindow,
        location,
        imageUrl
      } = req.body;

      // Validate required fields
      if (!title || !description || !quantity || !foodType || !expiryTime || !pickupWindow || !location) {
        return res.status(400).json({
          error: 'Missing required fields: title, description, quantity, foodType, expiryTime, pickupWindow, location'
        });
      }

      // Validate location has address
      if (!location.address) {
        return res.status(400).json({
          error: 'Location address is required'
        });
      }

      // Get donor info
      const donor = await User.findById(req.user._id);
      if (!donor) {
        return res.status(404).json({ error: 'Donor not found' });
      }

      // Build location data
      const locationData = {
        address: location.address
      };
      
      // Add coordinates if provided
      if (location.coordinates && location.coordinates.lat !== undefined && location.coordinates.lng !== undefined) {
        locationData.coordinates = {
          lat: parseFloat(location.coordinates.lat),
          lng: parseFloat(location.coordinates.lng)
        };
        console.log('📍 Location with coordinates:', locationData.coordinates);
      } else {
        console.log('📍 Location without coordinates');
      }

      const donationData = {
        donorId: req.user._id,
        donorName: donor.displayName,
        title,
        description,
        quantity,
        foodType,
        expiryTime: new Date(expiryTime),
        pickupWindow: {
          start: new Date(pickupWindow.start),
          end: new Date(pickupWindow.end)
        },
        location: locationData,
        imageUrl: imageUrl || null
      };

      console.log('💾 Final donation data:', JSON.stringify(donationData, null, 2));

      const donation = new FoodDonation(donationData);
      await donation.save();

      console.log('✅ Donation saved successfully');

      res.status(201).json({
        success: true,
        donation: donation.toJSON(),
        message: 'Donation created successfully'
      });
    } catch (error) {
      console.error('❌ Create donation error:', error);
      console.error('❌ Error details:', error.message);
      
      res.status(500).json({ 
        error: 'Failed to create donation',
        details: error.message 
      });
    }
  },

  // Update donation
  async updateDonation(req, res) {
    try {
      const { id } = req.params;
      const donation = await FoodDonation.findById(id);
      
      if (!donation) {
        return res.status(404).json({ error: 'Donation not found' });
      }

      // Check if user owns this donation
      if (donation.donorId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not authorized to update this donation' });
      }

      const updateData = req.body;
      // Handle date fields
      if (updateData.expiryTime) {
        updateData.expiryTime = new Date(updateData.expiryTime);
      }
      if (updateData.pickupWindow) {
        if (updateData.pickupWindow.start) {
          updateData.pickupWindow.start = new Date(updateData.pickupWindow.start);
        }
        if (updateData.pickupWindow.end) {
          updateData.pickupWindow.end = new Date(updateData.pickupWindow.end);
        }
      }
      
      const updatedDonation = await FoodDonation.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        donation: updatedDonation.toJSON()
      });
    } catch (error) {
      console.error('❌ Update donation error:', error);
      res.status(500).json({ error: 'Failed to update donation' });
    }
  },

  // Mark donation as picked up
  async markAsPicked(req, res) {
    try {
      const { id } = req.params;
      const donation = await FoodDonation.findById(id);
      
      if (!donation) {
        return res.status(404).json({ error: 'Donation not found' });
      }

      // Check if user claimed this donation
      if (donation.claimedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not authorized to mark this donation as picked' });
      }

      const pickedDonation = await donation.markAsPicked();

      res.json({
        success: true,
        donation: pickedDonation.toJSON()
      });
    } catch (error) {
      console.error('❌ Mark as picked error:', error);
      res.status(500).json({ error: 'Failed to mark donation as picked' });
    }
  },

  // Delete donation
  async deleteDonation(req, res) {
    try {
      const { id } = req.params;
      const donation = await FoodDonation.findById(id);
      
      if (!donation) {
        return res.status(404).json({ error: 'Donation not found' });
      }

      // Check if user owns this donation
      if (donation.donorId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Not authorized to delete this donation' });
      }

      // Delete associated claim requests
      await ClaimRequest.deleteMany({ donationId: id });

      await FoodDonation.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'Donation deleted successfully'
      });
    } catch (error) {
      console.error('❌ Delete donation error:', error);
      res.status(500).json({ error: 'Failed to delete donation' });
    }
  },

  // Get donations by location (for map view)
  async getDonationsByLocation(req, res) {
    try {
      const { lat, lng, radius = 10 } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
      }

      const donations = await FoodDonation.find({
        status: 'available',
        expiryTime: { $gt: new Date() }
      });
      
      // Filter donations by distance
      const filteredDonations = donations.filter(donation => {
        if (!donation.location?.coordinates) return false;
        
        const distance = calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          donation.location.coordinates.lat,
          donation.location.coordinates.lng
        );
        return distance <= parseFloat(radius);
      });

      res.json({
        success: true,
        donations: filteredDonations.map(donation => donation.toJSON()),
        metadata: {
          totalCount: filteredDonations.length,
          searchRadius: radius
        }
      });
    } catch (error) {
      console.error('❌ Get donations by location error:', error);
      res.status(500).json({ error: 'Failed to get donations by location' });
    }
  },

  // Get donation statistics
  async getDonationStats(req, res) {
    try {
      const allDonations = await FoodDonation.find().limit(1000);
      const allClaims = await ClaimRequest.find().limit(1000);
      
      const stats = {
        total: allDonations.length,
        available: allDonations.filter(d => d.status === 'available' && new Date() < new Date(d.expiryTime)).length,
        claimed: allDonations.filter(d => d.status === 'claimed').length,
        picked: allDonations.filter(d => d.status === 'picked').length,
        expired: allDonations.filter(d => new Date() > new Date(d.expiryTime)).length,
        byFoodType: {},
        claimStats: {
          total: allClaims.length,
          pending: allClaims.filter(c => c.status === 'pending').length,
          approved: allClaims.filter(c => c.status === 'approved').length,
          rejected: allClaims.filter(c => c.status === 'rejected').length,
          cancelled: allClaims.filter(c => c.status === 'cancelled').length
        }
      };

      // Group by food type
      allDonations.forEach(donation => {
        stats.byFoodType[donation.foodType] = (stats.byFoodType[donation.foodType] || 0) + 1;
      });

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('❌ Get donation stats error:', error);
      res.status(500).json({ error: 'Failed to get donation statistics' });
    }
  },

  // Get donations specifically for an NGO
  async getDonationsForMyNGO(req, res) {
    try {
      if (req.user.role !== 'ngo') {
        return res.status(403).json({ error: 'Only NGOs can access this endpoint' });
      }

      const { limit = 50 } = req.query;
      
      // Return donations claimed by this NGO
      const donations = await FoodDonation.find({
        claimedBy: req.user._id,
        status: { $in: ['claimed', 'picked'] }
      })
      .populate('donorId', 'displayName email phone')
      .sort({ claimedAt: -1 })
      .limit(parseInt(limit));

      res.json({
        success: true,
        donations: donations.map(donation => donation.toJSON()),
        count: donations.length
      });
    } catch (error) {
      console.error('❌ Get donations for my NGO error:', error);
      res.status(500).json({ error: 'Failed to get donations for NGO' });
    }
  }
};

// Helper function to calculate distance between two points
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}