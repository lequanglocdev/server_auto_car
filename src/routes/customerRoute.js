import express from "express";
import { addCustomer, deleteCustomer, getAllCustomers, updateCustomer } from "../controllers/customerController.js";
import isAdmin from "../middlewares/checkAdmin.js";

const router = express.Router();

router.get('/',[isAdmin], getAllCustomers);
router.post('/',[isAdmin], addCustomer);
router.put('/:id', [isAdmin], updateCustomer);
router.delete('/:id', [isAdmin], deleteCustomer);

export default router;
