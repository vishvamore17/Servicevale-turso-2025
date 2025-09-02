import express from 'express';
import {
  createPhoto,
  getPhotos,
  getPhotoById,
  getPhotosByUser,
  updatePhoto,
  deletePhoto,
  uploadPhotos
} from '../controllers/photo.controller';

const router = express.Router();

router.post('/', uploadPhotos, createPhoto);
router.put('/:id', uploadPhotos, updatePhoto);
router.get('/', getPhotos);
router.get('/user/:userEmail', getPhotosByUser);
router.get('/:id', getPhotoById);
router.delete('/:id', deletePhoto);

export default router;