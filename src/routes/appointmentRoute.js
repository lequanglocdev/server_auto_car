import express from "express";
import isAdmin from "../middlewares/checkAdmin.js";
import {
  registerAppointment,
  processAppointmentArrival,
  updateServiceStatus,
  completeAppointment,
  cancelAppointment,
  getAppointmentDetails,
  searchAppointments,
  getAppointmentsByCustomer,
} from "../controllers/appointmentController.js";

const router = express.Router();

// ✅ Route cụ thể để TRÊN route có :param
router.get("/search", [isAdmin], searchAppointments);
router.get(
  "/mobile/customer/:customerId",
  [isAdmin],
  getAppointmentsByCustomer
);

// CRUD
router.post("/", [isAdmin], registerAppointment);
router.get("/:appointmentId", [isAdmin], getAppointmentDetails);
router.delete("/:appointmentId", [isAdmin], cancelAppointment);

// Xử lý flow
router.post("/:appointmentId/arrive", [isAdmin], processAppointmentArrival);
router.post("/:appointmentId/complete", [isAdmin], completeAppointment);
router.put("/service/:appointmentServiceId", [isAdmin], updateServiceStatus);

export default router;
