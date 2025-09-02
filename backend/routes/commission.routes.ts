import { Router} from "express";
import { getEngineerCommissions } from '../controllers/commission.controller';
const router = Router();

router.get('/', getEngineerCommissions);

export default router;