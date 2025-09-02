import { Request, Response } from 'express';
import { db } from '../db/index';
import { photoTable } from '../db/schema';
import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

export const uploadPhotos = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
}).fields([
    { name: 'beforeImage', maxCount: 1 },
    { name: 'afterImage', maxCount: 1 }
]);

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, 
  }
});

export const uploadPhotosCreate = upload.fields([
  { name: 'beforeImage', maxCount: 1 },
  { name: 'afterImage', maxCount: 1 }
]);

export const uploadPhotosUpdate = upload.fields([
  { name: 'afterImage', maxCount: 1 }
]);

export const createPhoto = async (req: Request, res: Response) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const data = req.body;
    
    const id = uuidv4();
    
    if ((!files || !files.beforeImage) && !data.beforeImageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: beforeImage or beforeImageUrl is required'
      });
    }
    
    if (!data.date || !data.userEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: date and userEmail are required'
      });
    }
    
    const beforeImageUrl = files.beforeImage 
      ? `/uploads/${files.beforeImage[0].filename}` 
      : data.beforeImageUrl;
    
    const afterImageUrl = files.afterImage 
      ? `/uploads/${files.afterImage[0].filename}` 
      : data.afterImageUrl;
    
    await db.insert(photoTable).values({ 
      id, 
      beforeImageUrl,
      afterImageUrl,
      notes: data.notes,
      date: data.date,
      userEmail: data.userEmail
    });
    
    res.json({ success: true, message: 'Photo created successfully', id });
  } catch (error) {
    console.error('Create photo error:', error);
    res.status(500).json({ success: false, message: 'Failed to create Photo' });
  }
};

export const getPhotos = async (_req: Request, res: Response) => {
    try {
        const result = await db.select().from(photoTable).orderBy(desc(photoTable.createdAt));
        res.json(result);
    } catch (error) {
        console.error('Get photos error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch photos' });
    }
};

export const getPhotosByUser = async (req: Request, res: Response) => {
    try {
        const { userEmail } = req.params;
        const result = await db.select()
            .from(photoTable)
            .where(eq(photoTable.userEmail, userEmail))
            .orderBy(desc(photoTable.createdAt));
        res.json(result);
    } catch (error) {
        console.error('Get user photos error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user photos' });
    }
};

export const getPhotoById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await db.select()
            .from(photoTable)
            .where(eq(photoTable.id, id));
        
        if (result.length === 0) {
            return res.status(404).json({ success: false, message: 'Photo not found' });
        }
        
        res.json(result[0]);
    } catch (error) {
        console.error('Get photo by ID error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch photo' });
    }
};

export const updatePhoto = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const data = req.body;
        
        const existingPhoto = await db.select()
            .from(photoTable)
            .where(eq(photoTable.id, id));
        
        if (existingPhoto.length === 0) {
            return res.status(404).json({ success: false, message: 'Photo not found' });
        }
        
        const updateData: any = {
            notes: data.notes,
            updatedAt: new Date().toISOString()
        };
        
        if (data.beforeImageUrl) {
            updateData.beforeImageUrl = data.beforeImageUrl;
        }
        
        if (files && files.afterImage && files.afterImage[0]) {
            updateData.afterImageUrl = `/uploads/${files.afterImage[0].filename}`;
            
            if (existingPhoto[0].afterImageUrl) {
                const oldFilePath = path.join(process.cwd(), 'uploads', existingPhoto[0].afterImageUrl.split('/').pop() || '');
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            }
        } else if (data.afterImageUrl) {
            updateData.afterImageUrl = data.afterImageUrl;
        }
        
        await db.update(photoTable)
            .set(updateData)
            .where(eq(photoTable.id, id));
        
        res.json({ success: true, message: 'Photo updated successfully' });
    } catch (error) {
        console.error('Update photo error:', error);
        res.status(500).json({ success: false, message: 'Failed to update photo' });
    }
};

export const deletePhoto = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        const photo = await db.select()
            .from(photoTable)
            .where(eq(photoTable.id, id));
        
        if (photo.length > 0) {
            if (photo[0].beforeImageUrl) {
                const beforeFilePath = photo[0].beforeImageUrl.replace('/uploads/', 'uploads/');
                if (fs.existsSync(beforeFilePath)) {
                    fs.unlinkSync(beforeFilePath);
                }
            }
            
            if (photo[0].afterImageUrl) {
                const afterFilePath = photo[0].afterImageUrl.replace('/uploads/', 'uploads/');
                if (fs.existsSync(afterFilePath)) {
                    fs.unlinkSync(afterFilePath);
                }
            }
        }
        
        await db.delete(photoTable).where(eq(photoTable.id, id)).execute();
        res.json({ success: true, message: 'Photo deleted successfully' });
    } catch (error) {
        console.error('Delete photo error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete photo' });
    }
};