import mongoose from 'mongoose';

const emergencyAlertSchema = new mongoose.Schema({
  ngoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ngoName: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  area: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    address: {
      type: String,
      required: true
    },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    }
  },
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium'],
    default: 'high'
  },
  peopleAffected: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'resolved'],
    default: 'active'
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

emergencyAlertSchema.index({ status: 1, createdAt: -1 });
emergencyAlertSchema.index({ ngoId: 1 });

const EmergencyAlert = mongoose.model('EmergencyAlert', emergencyAlertSchema);
export { EmergencyAlert };
