import {Request, Response} from 'express';
import {db} from '../db/index';
import {engineerTable} from '../db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';

export const createEngineer = async (req: Request, res: Response) => {
    try {
        const data = req.body
        
        const id = uuidv4();
        await db.insert(engineerTable).values({id,...data}).onConflictDoNothing();  
        res.json({sucess: true, message: 'Engineer created successfully', id});
    } catch (error) {
        console.error('Error creating engineer:', error);
        res.status(500).json({success: false, message: 'Failed to create engineer'});
    }
};

export const getEngineers = async (req: Request, res: Response) => {
        const result = await db.select().from(engineerTable).orderBy(desc(engineerTable.createdAt));
        res.json({result});
    };

export const updateEngineer = async (req: Request, res: Response) => {
    const {id} =req.params;
    const data = req.body;
    await db.update(engineerTable).set(data).where(eq(engineerTable.id,id)).execute();
    res.json({success: true, message: 'Engineer updated successfully'});
};

export const deleteEngineer = async (req: Request, res: Response) => {
    const {id} = req.params;
    await db.delete(engineerTable).where(eq(engineerTable.id, id)).execute();
    res.json({success: true, message: 'Engineer deleted successfully'});
}