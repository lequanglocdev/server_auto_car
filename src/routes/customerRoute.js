import express from "express";
import { addCustomer, deleteCustomer, getAllCustomers, getCustomerById, updateCustomer, getCustomerByIdWithVehicles, findCustomerByContact } from "../controllers/customerController.js";
import isAdmin from "../middlewares/checkAdmin.js";

const router = express.Router();

router.get('/find', [isAdmin], findCustomerByContact);
router.get('/',[isAdmin], getAllCustomers);
router.post('/',[isAdmin], addCustomer);
router.put('/:id', [isAdmin], updateCustomer);
router.get("/:id", [isAdmin], getCustomerByIdWithVehicles);
router.get('/:id', [isAdmin], getCustomerById);
router.delete('/:id', [isAdmin], deleteCustomer);
// GET /api/customers/find?phone_number=0909...
// GET /api/customers/find?email=abc@...
export default router;
