import express from "express";
import isAdmin from "../middlewares/checkAdmin.js";
import {
  addVehicle,
  deleteVehicle,
  updateVehicle,
} from "../controllers/vehicleController.js";

const router = express.Router();

router.post("/:customerId", [isAdmin], addVehicle);

router.put("/:customerId/:vehicleId", [isAdmin], updateVehicle);

router.delete("/:customerId/:vehicleId", [isAdmin], deleteVehicle);

export default router;
