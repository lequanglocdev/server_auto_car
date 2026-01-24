import express from "express"
import isAdmin from "../middlewares/checkAdmin.js"
import { addVehicle, deleteVehicle, updateVehicle } from "../controllers/vehicleController.js"

const router  = express.Router()

router.post("/",[isAdmin],addVehicle)
router.put("/:vehicleId", [isAdmin], updateVehicle);
router.delete("/:vehicleId", [isAdmin], deleteVehicle);

export default router
