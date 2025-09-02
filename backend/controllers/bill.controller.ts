import {Request, Response} from 'express';
import {db} from '../db/index';
import {billTable} from '../db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';

export const createBill = async (req: Request, res: Response) => {
    try {
        const data = req.body;
        const id = uuidv4();
        
        if (!data.engineerCommission && data.serviceCharge) {
            data.engineerCommission = Math.round(parseFloat(data.serviceCharge) * 0.25);
        }
        
        await db.insert(billTable).values({id, ...data});
        res.json({success: true, message: 'Bill created successfully', id});
    } catch (error) {
        console.error('Error creating Bill:', error);
        res.status(500).json({success: false, message: 'Failed to create Bill'});
    }
};

export const getBills = async (_req: Request, res: Response) => {
        const result = await db.select().from(billTable).orderBy(desc(billTable.createdAt));
        res.json(result);
    };

export const updateBill = async (req: Request, res: Response) => {
    const {id} =req.params;
    const data = req.body;
    await db.update(billTable).set(data).where(eq(billTable.id,id)).execute();
    res.json({success: true, message: 'Bill updated successfully'});
};

export const deleteBill = async (req: Request, res: Response) => {
    const {id} = req.params;
    await db.delete(billTable).where(eq(billTable.id, id)).execute();
    res.json({success: true, message: 'Bill deleted successfully'});
}