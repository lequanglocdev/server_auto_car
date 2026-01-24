import express from "express"
import isAdmin from "../middlewares/checkAdmin.js"
import { addVehicleType, deleteVehicleType, getAllVehicleTypes, updateVehicleType } from "../controllers/vehicleTypeController.js"

const router = express.Router()

router.get("/",[isAdmin],getAllVehicleTypes)
router.post("/",[isAdmin],addVehicleType)
router.put("/:vehicleTypeId",[isAdmin],updateVehicleType)
router.delete("/:vehicleTypeId",[isAdmin],deleteVehicleType)

export default router
