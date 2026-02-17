import express from "express";
import { addCustomer, deleteCustomer, getAllCustomers, getCustomerById, updateCustomer, getCustomerByIdWithVehicles } from "../controllers/customerController.js";
import isAdmin from "../middlewares/checkAdmin.js";

const router = express.Router();

router.get('/',[isAdmin], getAllCustomers);
router.post('/',[isAdmin], addCustomer);
router.put('/:id', [isAdmin], updateCustomer);
router.delete('/:id', [isAdmin], deleteCustomer);
router.get('/:id', [isAdmin], getCustomerById);
router.get("/:id", [isAdmin], getCustomerByIdWithVehicles);
export default router;
