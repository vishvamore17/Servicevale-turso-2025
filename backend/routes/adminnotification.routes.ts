import express from 'express';
import {
  createNotification,
  getAllNotifications,
  deleteNotification,
  deleteAllNotifications,
  getNotificationCount 
} from '../controllers/adminnotification.controller';

const router = express.Router();

router.post('/', createNotification);
router.get('/', getAllNotifications);
router.get('/count', getNotificationCount); 
router.delete('/all', deleteAllNotifications);
router.delete('/:id', deleteNotification);


export default router;