import { Request, Response } from 'express';
import { db } from '../db/index';
import { billTable, paymentTable, engineerTable } from '../db/schema';
import { and, gte } from 'drizzle-orm';

export const getEngineerCommissions = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        
        const billConditions = [];
        if (startDate && endDate) {
            billConditions.push(
                and(
                    gte(billTable.date, startDate as string),
                    gte(billTable.date, endDate as string)
                )
            );
        }
        
        const bills = await db.select()
            .from(billTable)
            .where(billConditions.length > 0 ? and(...billConditions) : undefined);
        
        const paymentConditions = [];
        if (startDate && endDate) {
            paymentConditions.push(
                and(
                    gte(paymentTable.date, startDate as string),
                    gte(paymentTable.date, endDate as string)
                )
            );
        }
        
        const payments = await db.select()
            .from(paymentTable)
            .where(paymentConditions.length > 0 ? and(...paymentConditions) : undefined);
        
        const engineers = await db.select().from(engineerTable);
        
        const result = engineers.map((engineer: any) => {
            const engineerName = engineer.engineerName || engineer.name;
            
            const engineerBills = bills.filter((bill: any) => 
                bill.serviceboyName === engineerName
            );
            
            const engineerPayments = payments.filter((payment: any) => 
                payment.engineerName === engineerName
            );
            
            const totalCommission = engineerBills.reduce(
                (sum: number, bill: any) => sum + (parseFloat(bill.engineerCommission) || 0),
                0
            );
            
            const totalPayments = engineerPayments.reduce(
                (sum: number, payment: any) => sum + (parseFloat(payment.amount) || 0),
                0
            );
            
            return {
                id: engineer.id,
                name: engineerName,
                totalCommission,
                totalPayments,
                pendingAmount: totalCommission - totalPayments
            };
        });
        
        res.json(result);
    } catch (error) {
        console.error('Error fetching engineer commissions:', error);
        res.status(500).json({success: false, message: 'Failed to fetch engineer commissions'});
    }
};