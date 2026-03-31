import express from 'express';
import { callController } from '../controllers/callController.js';
import { authController } from '../controllers/authController.js';

const router = express.Router();

// All routes require authentication
router.use(authController.verifyToken);

router.post('/request', callController.requestCall);
router.get('/pending', callController.getPendingCalls);
router.post('/:callId/accept', callController.acceptCall);
router.post('/:callId/reject', callController.rejectCall);
router.post('/:callId/end', callController.endCall);

export default router;
