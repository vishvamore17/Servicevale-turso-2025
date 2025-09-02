import { Router } from "express";
import { 
    createPayment, 
    getPayments, 
    getPaymentsByEngineer, 
    getCurrentMonthPayments, 
    deletePayment,
    deleteMultiplePayments 
} from '../controllers/payment.controller';

const router = Router();

router.post('/', createPayment);
router.get('/', getPayments);
router.get('/engineer/:engineerId/:engineerName', getPaymentsByEngineer);
router.get('/current-month', getCurrentMonthPayments);
router.delete('/:id', deletePayment);
router.delete('/', deleteMultiplePayments);

export default router;