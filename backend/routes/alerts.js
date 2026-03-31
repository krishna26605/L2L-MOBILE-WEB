import express from 'express';
import { alertController } from '../controllers/alertController.js';
import { authController } from '../controllers/authController.js';

const router = express.Router();

// Public route - get active alerts for donors
router.get('/active', alertController.getActiveAlerts);

// Protected routes
router.use(authController.verifyToken);

router.post('/', alertController.createAlert);
router.get('/my-alerts', alertController.getMyAlerts);
router.post('/:id/resolve', alertController.resolveAlert);

export default router;
