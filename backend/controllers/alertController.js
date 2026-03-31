import { EmergencyAlert } from '../models/EmergencyAlert.js';
import { User } from '../models/User.js';

export const alertController = {
  // Create emergency alert (NGO only)
  async createAlert(req, res) {
    try {
      if (req.user.role !== 'ngo') {
        return res.status(403).json({ success: false, error: 'Only NGOs can create emergency alerts' });
      }

      const { title, description, area, location, severity, peopleAffected } = req.body;

      if (!title || !description || !area || !location) {
        return res.status(400).json({ success: false, error: 'Title, description, area, and location are required' });
      }

      const alert = new EmergencyAlert({
        ngoId: req.user._id,
        ngoName: req.user.displayName,
        title,
        description,
        area,
        location,
        severity: severity || 'high',
        peopleAffected: peopleAffected || 0
      });

      await alert.save();
      console.log(`🚨 Emergency alert created by ${req.user.displayName}: ${title}`);

      res.status(201).json({ success: true, alert });
    } catch (error) {
      console.error('❌ Create alert error:', error);
      res.status(500).json({ success: false, error: 'Failed to create alert' });
    }
  },

  // Get active alerts (for donors)
  async getActiveAlerts(req, res) {
    try {
      const alerts = await EmergencyAlert.find({ status: 'active' })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('ngoId', 'displayName phone');

      res.json({ success: true, alerts });
    } catch (error) {
      console.error('❌ Get active alerts error:', error);
      res.status(500).json({ success: false, error: 'Failed to get alerts' });
    }
  },

  // Get alerts by NGO
  async getMyAlerts(req, res) {
    try {
      const alerts = await EmergencyAlert.find({ ngoId: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50);

      res.json({ success: true, alerts });
    } catch (error) {
      console.error('❌ Get my alerts error:', error);
      res.status(500).json({ success: false, error: 'Failed to get alerts' });
    }
  },

  // Resolve an alert
  async resolveAlert(req, res) {
    try {
      const { id } = req.params;

      const alert = await EmergencyAlert.findById(id);
      if (!alert) {
        return res.status(404).json({ success: false, error: 'Alert not found' });
      }

      if (alert.ngoId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, error: 'Only the creator can resolve this alert' });
      }

      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      await alert.save();

      console.log(`✅ Emergency alert resolved: ${alert.title}`);

      res.json({ success: true, alert });
    } catch (error) {
      console.error('❌ Resolve alert error:', error);
      res.status(500).json({ success: false, error: 'Failed to resolve alert' });
    }
  }
};
