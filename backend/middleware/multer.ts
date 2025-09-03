import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    // Go two levels up from current file location to reach project root
    const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');
    console.log('Multer destination path:', uploadsDir);
    
    try {
      if (!fs.existsSync(uploadsDir)) {
        console.log('Creating uploads directory from multer...');
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('Uploads directory created by multer');
      }
      
      cb(null, uploadsDir);
    } catch (error) {
      console.error('Error creating uploads directory in multer:', error);
      cb(error as Error, '');
    }
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    console.log('Saving file as:', uniqueName);
    cb(null, uniqueName);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, 
  }
});