import { Router} from "express";
import { createEngineer, deleteEngineer, getEngineers, updateEngineer } from '../controllers/engineer.controller';

const router = Router();

router.post('/', createEngineer);
router.get('/', getEngineers);
router.put('/:id', updateEngineer);
router.delete('/:id', deleteEngineer);

export default router;