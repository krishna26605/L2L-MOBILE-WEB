import express from 'express';
import { verificationController } from '../controllers/verificationController.js';

const router = express.Router();

// Public routes (QR scan doesn't require auth for simplicity)
router.get('/:code', verificationController.getVerificationStatus);
router.post('/:code', verificationController.verifyPickup);

export default router;
