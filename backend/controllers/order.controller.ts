import {Request, Response} from 'express';
import { db } from '../db/index';
import { orderTable } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc, count, and } from 'drizzle-orm';

export const createOrder = async (req: Request, res: Response) => {
    try {
        const data = req.body;
        const id = uuidv4();
        await db.insert(orderTable).values({id, ...data}).onConflictDoNothing();  
        res.json({success: true, message: 'Order created successfully', id});
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({success: false, message: 'Failed to create order'});
    }
}

export const getOrders = async (req: Request, res: Response) => {
    const result = await db.select().from(orderTable).orderBy(desc(orderTable.createdAt));
    res.json({result}); 
}

export const updateOrder = async (req: Request, res: Response) => {
    const {id} = req.params;
    const data = req.body;
    await db.update(orderTable).set(data).where(eq(orderTable.id, id)).execute();
    res.json({success: true, message: 'Order updated successfully'});
}

export const deleteOrder = async (req: Request, res: Response) => {
    const {id} = req.params;
    await db.delete(orderTable).where(eq(orderTable.id, id)).execute();
    res.json({success: true, message: 'Order deleted successfully'});
}

export const getOrdersByStatus = async (req: Request, res: Response) => {
    try {
        const { status, page = 1, limit = 10, countOnly, all } = req.query;

        if (countOnly === 'true') {
            const totalQuery = await db
                .select({ count: count() })
                .from(orderTable)
                .where(status ? eq(orderTable.status, status as string) : undefined);
            
            return res.json({ count: totalQuery[0]?.count || 0 });
        }

        if (all === 'true') {
            let query;
            if (status) {
                query = db.select()
                    .from(orderTable)
                    .where(eq(orderTable.status, status as string))
                    .orderBy(desc(orderTable.createdAt));
            } else {
                query = db.select()
                    .from(orderTable)
                    .orderBy(desc(orderTable.createdAt));
            }

            const result = await query;
            return res.json({ result });
        }
        
        const offset = (Number(page) - 1) * Number(limit);
        
        let query;
        if (status) {
            query = db.select()
                .from(orderTable)
                .where(eq(orderTable.status, status as string))
                .orderBy(desc(orderTable.createdAt));
        } else {
            query = db.select()
                .from(orderTable)
                .orderBy(desc(orderTable.createdAt));
        }

        const totalQuery = await db
            .select({ count: count() })
            .from(orderTable)
            .where(status ? eq(orderTable.status, status as string) : undefined);

        const total = totalQuery[0]?.count || 0;
        
        const result = await query
            .limit(Number(limit))
            .offset(offset);

        res.json({ 
            result,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit))
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch orders' });
    }
}

export const countOrdersByStatus = async (req: Request, res: Response) => {
    try {
        const { status, engineerId } = req.query;
        const conditions = [];
        
        if (status) {
            conditions.push(eq(orderTable.status, status as string));
        }
        
        if (engineerId) {
            conditions.push(eq(orderTable.serviceboyName, engineerId as string));
        }
        
        const result = await db
            .select({ count: count() })
            .from(orderTable)
            .where(conditions.length ? and(...conditions) : undefined);
            
        res.json({ count: result[0]?.count ?? 0 });
    } catch (error) {
        console.error('Error counting orders:', error);
        res.status(500).json({ success: false, message: 'Failed to count orders' });
    }
}