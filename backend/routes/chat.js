import express from 'express';
import { chatController } from '../controllers/chatController.js';
import { authController } from '../controllers/authController.js';

const router = express.Router();

// All routes require authentication
router.use(authController.verifyToken);

router.get('/unread', chatController.getUnreadCount);
router.get('/:donationId', chatController.getMessages);
router.post('/:donationId', chatController.sendMessage);

export default router;
