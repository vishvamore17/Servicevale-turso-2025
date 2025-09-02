import express from "express";
import {createOrder, getOrders, updateOrder, deleteOrder, getOrdersByStatus, countOrdersByStatus} from '../controllers/order.controller';

const router = express.Router();

router.post("/", createOrder);
router.get("/", getOrders);
router.put("/:id", updateOrder);
router.delete("/:id", deleteOrder);
router.get('/status', getOrdersByStatus);
router.get('/count', countOrdersByStatus);

export default router;