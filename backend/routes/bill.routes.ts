import { Router} from "express";
import { createBill, deleteBill, getBills, updateBill } from '../controllers/bill.controller';
const router = Router();

router.post('/', createBill);
router.get('/', getBills);
router.put('/:id', updateBill);
router.delete('/:id', deleteBill);

export default router;