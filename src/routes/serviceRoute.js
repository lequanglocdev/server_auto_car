import express from 'express';
import isAdmin from '../middlewares/checkAdmin.js';
import { addService, deleteService, getAllServices, getServiceById, updateService } from '../controllers/serviceController.js';

const router = express.Router();

router.post('/', [isAdmin], addService);
router.get('/', [isAdmin], getAllServices);
router.get('/:serviceId',[isAdmin], getServiceById);
router.put('/:serviceId', [isAdmin], updateService);
router.delete('/:serviceId', [isAdmin], deleteService);

export default router;
