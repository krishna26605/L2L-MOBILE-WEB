import mongoose from 'mongoose';

const callRequestSchema = new mongoose.Schema({
  donationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodDonation',
    required: true
  },
  callerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  callerName: {
    type: String,
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['video'],
    default: 'video'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'ended', 'missed'],
    default: 'pending'
  },
  peerId: {
    type: String,
    default: null
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  endedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

callRequestSchema.index({ donationId: 1 });
callRequestSchema.index({ callerId: 1 });
callRequestSchema.index({ receiverId: 1, status: 1 });

const CallRequest = mongoose.model('CallRequest', callRequestSchema);
export { CallRequest };
