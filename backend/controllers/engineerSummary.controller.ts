import { Request, Response } from 'express';
import { db } from '../db/index';
import { engineerSummaryTable } from '../db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { format, startOfMonth } from 'date-fns';

export const createOrUpdateEngineerSummary = async (req: Request, res: Response) => {
  try {
    const { engineerId, engineerName, monthlyCommission, monthlyPaid, pendingAmount } = req.body;
    
    const currentDate = new Date();
    const month = format(currentDate, 'yyyy-MM');
    const year = format(currentDate, 'yyyy');

    const existingSummary = await db.select()
      .from(engineerSummaryTable)
      .where(
        and(
          eq(engineerSummaryTable.engineerId, engineerId),
          eq(engineerSummaryTable.month, month),
          eq(engineerSummaryTable.year, year)
        )
      )
      .limit(1);

    if (existingSummary.length > 0) {
      await db.update(engineerSummaryTable)
        .set({
          monthlyCommission,
          monthlyPaid,
          pendingAmount,
          updatedAt: new Date().toISOString()
        })
        .where(eq(engineerSummaryTable.id, existingSummary[0].id));
      
      res.json({ success: true, message: 'Engineer summary updated successfully' });
    } else {
      const id = `es_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.insert(engineerSummaryTable).values({
        id,
        engineerId,
        engineerName,
        month,
        year,
        monthlyCommission,
        monthlyPaid,
        pendingAmount
      });
      
      res.json({ success: true, message: 'Engineer summary created successfully', id });
    }
  } catch (error) {
    console.error('Error creating/updating engineer summary:', error);
    res.status(500).json({ success: false, message: 'Failed to save engineer summary' });
  }
};

export const getEngineerSummary = async (req: Request, res: Response) => {
  try {
    const { engineerId, month, year } = req.query;
    
    const conditions = [];
    
    if (engineerId) {
      conditions.push(eq(engineerSummaryTable.engineerId, engineerId as string));
    }
    
    if (month) {
      conditions.push(eq(engineerSummaryTable.month, month as string));
    }
    
    if (year) {
      conditions.push(eq(engineerSummaryTable.year, year as string));
    }
    
    const result = await db.select()
      .from(engineerSummaryTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(engineerSummaryTable.createdAt));
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching engineer summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch engineer summary' });
  }
};

export const getCurrentMonthSummary = async (req: Request, res: Response) => {
  try {
    const { engineerId } = req.query;
    
    const currentDate = new Date();
    const month = format(currentDate, 'yyyy-MM');
    const year = format(currentDate, 'yyyy');
    
    const conditions = [
      eq(engineerSummaryTable.month, month),
      eq(engineerSummaryTable.year, year)
    ];
    
    if (engineerId) {
      conditions.push(eq(engineerSummaryTable.engineerId, engineerId as string));
    }
    
    const result = await db.select()
      .from(engineerSummaryTable)
      .where(and(...conditions));
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching current month summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch current month summary' });
  }
};