import { Request, Response } from 'express';
import { db } from '../db';
import { notificationTable } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const createNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { description, userEmail } = req.body;
    
    if (!description || !userEmail) {
      res.status(400).json({ error: 'Description and userEmail are required' });
      return;
    }

    const id = uuidv4();
    
    const [notification] = await db.insert(notificationTable).values({
      id,
      description,
      userEmail,
      createdAt: new Date().toISOString(),
    }).returning();
    
    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userEmail } = req.params;
    
    if (!userEmail) {
      res.status(400).json({ error: 'userEmail is required' });
      return;
    }

    const notifications = await db.select()
      .from(notificationTable)
      .where(eq(notificationTable.userEmail, userEmail))
      .orderBy(desc(notificationTable.createdAt));
      
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({ error: 'Notification ID is required' });
      return;
    }

    const [notification] = await db.delete(notificationTable)
      .where(eq(notificationTable.id, id))
      .returning();
    
    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAllNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userEmail } = req.params;
    
    if (!userEmail) {
      res.status(400).json({ error: 'userEmail is required' });
      return;
    }

    await db.delete(notificationTable)
      .where(eq(notificationTable.userEmail, userEmail));
      
    res.status(200).json({ message: 'All notifications deleted successfully' });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getNotificationCount = async (req: Request, res: Response): Promise<void> => {
  try {
        const { userEmail } = req.params;
    
    if (!userEmail) {
      res.status(400).json({ error: 'userEmail is required' });
      return;
    }

    const notifications = await db.select()
      .from(notificationTable)
      .where(eq(notificationTable.userEmail, userEmail))
    
    res.status(200).json({ count: notifications.length });
  } catch (error) {
    console.error('Error fetching notification count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};