import express from "express";
import  isAdmin  from "../middlewares/checkAdmin.js";
import {
  addSlot,
  getAllSlots,
  getSlotById,
  updateSlot,
  softDeleteSlot,
  getAllSlotsWithAppointments,
} from "../controllers/slotController.js";


const router = express.Router()

router.post("/", [isAdmin], addSlot);
router.get("/", [isAdmin], getAllSlots);
router.get("/with-appointments", [isAdmin], getAllSlotsWithAppointments);
router.get("/:slotId", [isAdmin], getSlotById);
router.put("/:slotId", [isAdmin], updateSlot);
router.delete("/:slotId", [isAdmin], softDeleteSlot);

export default router;
