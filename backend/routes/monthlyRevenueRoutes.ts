import express from 'express';
import { monthlyRevenueController } from '../controllers/monthlyRevenueController';

const router = express.Router();

router.get('/', monthlyRevenueController.getAll);
router.get('/:month/:year', monthlyRevenueController.getByMonthYear);
router.get('/year/:year', monthlyRevenueController.getByYear);
router.post('/upsert', monthlyRevenueController.upsert);
router.post('/calculate/current', monthlyRevenueController.calculateCurrentMonth);
router.post('/calculate/:month/:year', monthlyRevenueController.calculateForMonth);

export default router;