import express from "express";
import dotenv from "dotenv";
import { connectDB } from "../src/libs/db.js";
import authRoute from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";
import customerRoute from "./routes/customerRoute.js";
import serviceRoute from "./routes/serviceRoute.js";
import vehicleRoute from "./routes/vehicleRoute.js"
import vehicleTypeRoute from "./routes/vehicleType.js"
import priceRoute from "./routes/priceRoute.js"
import cors from "cors";
import { protectedRoute } from "./middlewares/authMiddleware.js";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

//middlewares
app.use(express.json());
app.use(cookieParser())
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

// routes
app.use("/api/auth", authRoute);
app.use(protectedRoute)
app.use("/api/user", protectedRoute, userRoute);
app.use("/api/customers", protectedRoute, customerRoute);
app.use("/api/services", protectedRoute,  serviceRoute);
app.use("/api/vehicles", protectedRoute, vehicleRoute );
app.use("/api/vehicle_type",protectedRoute,vehicleTypeRoute)
app.use("/api/price",protectedRoute,priceRoute)


// start server

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`server on ${PORT}`);
  });
});
