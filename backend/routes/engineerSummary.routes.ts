import { Router } from "express";
import { 
  createOrUpdateEngineerSummary, 
  getEngineerSummary, 
  getCurrentMonthSummary 
} from '../controllers/engineerSummary.controller';

const router = Router();

router.post('/', createOrUpdateEngineerSummary);
router.get('/', getEngineerSummary);
router.get('/current-month', getCurrentMonthSummary);

export default router;