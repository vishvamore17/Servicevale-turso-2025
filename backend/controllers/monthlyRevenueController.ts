import { Request, Response } from 'express';
import { db } from '../db';
import { monthlyRevenueTable, billTable } from '../db/schema'; 
import { eq, and, desc, gte, lte } from 'drizzle-orm'; 
import { format, startOfMonth, endOfMonth } from 'date-fns';

export const monthlyRevenueController = {
  getAll: async (_req: Request, res: Response) => {
    try {
      const revenues = await db.select()
        .from(monthlyRevenueTable)
        .orderBy(desc(monthlyRevenueTable.year), desc(monthlyRevenueTable.month))
        .all();
      
      res.json(revenues);
    } catch (error) {
      console.error('Error fetching monthly revenues:', error);
      res.status(500).json({ error: 'Failed to fetch monthly revenues' });
    }
  },

  getByMonthYear: async (req: Request, res: Response) => {
    try {
      const { month, year } = req.params;
      
      const revenue = await db.select()
        .from(monthlyRevenueTable)
        .where(and(
          eq(monthlyRevenueTable.month, month),
          eq(monthlyRevenueTable.year, year)
        ))
        .get();
      
      if (!revenue) {
        return res.status(404).json({ error: 'Monthly revenue not found' });
      }
      
      res.json(revenue);
    } catch (error) {
      console.error('Error fetching monthly revenue:', error);
      res.status(500).json({ error: 'Failed to fetch monthly revenue' });
    }
  },

  getByYear: async (req: Request, res: Response) => {
    try {
      const { year } = req.params;
      
      const revenues = await db.select()
        .from(monthlyRevenueTable)
        .where(eq(monthlyRevenueTable.year, year))
        .orderBy(desc(monthlyRevenueTable.month))
        .all();
      
      res.json(revenues);
    } catch (error) {
      console.error('Error fetching yearly revenues:', error);
      res.status(500).json({ error: 'Failed to fetch yearly revenues' });
    }
  },

  upsert: async (req: Request, res: Response) => {
    try {
      const { month, year, total } = req.body;
      
      if (!month || !year || total === undefined) {
        return res.status(400).json({ error: 'Month, year, and total are required' });
      }

      const id = `${month}-${year}`;
      
      const existing = await db.select()
        .from(monthlyRevenueTable)
        .where(and(
          eq(monthlyRevenueTable.month, month),
          eq(monthlyRevenueTable.year, year)
        ))
        .get();

      if (existing) {
        const [updated] = await db.update(monthlyRevenueTable)
          .set({ 
            total, 
            updatedAt: new Date().toISOString() 
          })
          .where(eq(monthlyRevenueTable.id, existing.id))
          .returning();
        
        res.json(updated);
      } else {
        const [newRevenue] = await db.insert(monthlyRevenueTable)
          .values({ 
            id, 
            month, 
            year, 
            total 
          })
          .returning();
        
        res.json(newRevenue);
      }
    } catch (error) {
      console.error('Error upserting monthly revenue:', error);
      res.status(500).json({ error: 'Failed to update monthly revenue' });
    }
  },

  calculateCurrentMonth: async (_req: Request, res: Response) => {
    try {
      const currentMonth = format(new Date(), 'MMMM');
      const currentYear = format(new Date(), 'yyyy');
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());

      const bills = await db.select()
        .from(billTable)
        .where(and(
          gte(billTable.createdAt, monthStart.toISOString()),
          lte(billTable.createdAt, monthEnd.toISOString())
        ))
        .all();

      const total = bills.reduce((sum, bill) => {
        return sum + parseFloat(bill.total || '0');
      }, 0);

      const id = `${currentMonth}-${currentYear}`;
      
      const existing = await db.select()
        .from(monthlyRevenueTable)
        .where(and(
          eq(monthlyRevenueTable.month, currentMonth),
          eq(monthlyRevenueTable.year, currentYear)
        ))
        .get();

      if (existing) {
        const [updated] = await db.update(monthlyRevenueTable)
          .set({ 
            total, 
            updatedAt: new Date().toISOString() 
          })
          .where(eq(monthlyRevenueTable.id, existing.id))
          .returning();
        
        res.json(updated);
      } else {
        const [newRevenue] = await db.insert(monthlyRevenueTable)
          .values({ 
            id, 
            month: currentMonth, 
            year: currentYear, 
            total 
          })
          .returning();
        
        res.json(newRevenue);
      }
    } catch (error) {
      console.error('Error calculating monthly revenue:', error);
      res.status(500).json({ error: 'Failed to calculate monthly revenue' });
    }
  },

  calculateForMonth: async (req: Request, res: Response) => {
    try {
      const { month, year } = req.params;
      
      const date = new Date(`${month} 1, ${year}`);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);

      const bills = await db.select()
        .from(billTable)
        .where(and(
          gte(billTable.createdAt, monthStart.toISOString()),
          lte(billTable.createdAt, monthEnd.toISOString())
        ))
        .all();

      const total = bills.reduce((sum, bill) => {
        return sum + parseFloat(bill.total || '0');
      }, 0);

      const id = `${month}-${year}`;
      
      const existing = await db.select()
        .from(monthlyRevenueTable)
        .where(and(
          eq(monthlyRevenueTable.month, month),
          eq(monthlyRevenueTable.year, year)
        ))
        .get();

      if (existing) {
        const [updated] = await db.update(monthlyRevenueTable)
          .set({ 
            total, 
            updatedAt: new Date().toISOString() 
          })
          .where(eq(monthlyRevenueTable.id, existing.id))
          .returning();
        
        res.json(updated);
      } else {
        const [newRevenue] = await db.insert(monthlyRevenueTable)
          .values({ 
            id, 
            month, 
            year, 
            total 
          })
          .returning();
        
        res.json(newRevenue);
      }
    } catch (error) {
      console.error('Error calculating monthly revenue:', error);
      res.status(500).json({ error: 'Failed to calculate monthly revenue' });
    }
  }
};