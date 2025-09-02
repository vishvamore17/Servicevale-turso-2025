import express from 'express';
import {
  createNotification,
  getUserNotifications,
  deleteNotification,
  deleteAllNotifications,
  getNotificationCount
} from '../controllers/notification.controller';

const router = express.Router();

router.post('/', createNotification);
router.get('/:userEmail', getUserNotifications);
router.get('/:userEmail/count', getNotificationCount);
router.delete('/:id', deleteNotification);
router.delete('/:userEmail/all', deleteAllNotifications);

export default router;