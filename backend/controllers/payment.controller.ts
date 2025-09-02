import {Request, Response} from 'express';
import {db} from '../db/index';
import {paymentTable} from '../db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc, and, gte, or, inArray } from 'drizzle-orm';

export const createPayment = async (req: Request, res: Response) => {
    try {
        const data = req.body;
        const id = uuidv4();
        await db.insert(paymentTable).values({id, ...data});
        res.json({success: true, message: 'Payment created successfully', id});
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({success: false, message: 'Failed to create payment'});
    }
};

export const getPayments = async (req: Request, res: Response) => {
    try {
        const { engineerId, engineerName, startDate, endDate } = req.query;
        
        const conditions = [];
        
        if (engineerId) {
            conditions.push(eq(paymentTable.engineerId, engineerId as string));
        }
        
        if (engineerName) {
            conditions.push(eq(paymentTable.engineerName, engineerName as string));
        }
        
        if (startDate && endDate) {
            conditions.push(
                and(
                    gte(paymentTable.date, startDate as string),
                    gte(paymentTable.date, endDate as string)
                )
            );
        }
        
        const result = await db.select()
            .from(paymentTable)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(paymentTable.date));
            
        res.json(result);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({success: false, message: 'Failed to fetch payments'});
    }
};

export const getPaymentsByEngineer = async (req: Request, res: Response) => {
    try {
        const { engineerId, engineerName } = req.params;
        
        const result = await db.select()
            .from(paymentTable)
            .where(
                or(
                    eq(paymentTable.engineerId, engineerId),
                    eq(paymentTable.engineerName, engineerName)
                )
            )
            .orderBy(desc(paymentTable.date));
            
        res.json(result);
    } catch (error) {
        console.error('Error fetching payments by engineer:', error);
        res.status(500).json({success: false, message: 'Failed to fetch payments'});
    }
};

export const getCurrentMonthPayments = async (req: Request, res: Response) => {
    try {
        const { engineerId, engineerName } = req.query;
        
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const conditions = [gte(paymentTable.date, startOfMonth.toISOString())];
        
        if (engineerId) {
            conditions.push(eq(paymentTable.engineerId, engineerId as string));
        }
        
        if (engineerName) {
            conditions.push(eq(paymentTable.engineerName, engineerName as string));
        }
        
        const result = await db.select()
            .from(paymentTable)
            .where(and(...conditions))
            .orderBy(desc(paymentTable.date));
            
        res.json(result);
    } catch (error) {
        console.error('Error fetching current month payments:', error);
        res.status(500).json({success: false, message: 'Failed to fetch payments'});
    }
};

export const deletePayment = async (req: Request, res: Response) => {
    try {
        const {id} = req.params;
        await db.delete(paymentTable).where(eq(paymentTable.id, id));
        res.json({success: true, message: 'Payment deleted successfully'});
    } catch (error) {
        console.error('Error deleting payment:', error);
        res.status(500).json({success: false, message: 'Failed to delete payment'});
    }
};

export const deleteMultiplePayments = async (req: Request, res: Response) => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({success: false, message: 'No payment IDs provided'});
        }
        
        await db.delete(paymentTable).where(inArray(paymentTable.id, ids));
        res.json({success: true, message: 'Payments deleted successfully'});
    } catch (error) {
        console.error('Error deleting multiple payments:', error);
        res.status(500).json({success: false, message: 'Failed to delete payments'});
    }
};