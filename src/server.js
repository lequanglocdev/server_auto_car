import express from "express";
import dotenv from "dotenv";
import { connectDB } from "../src/libs/db.js";
import authRoute from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";
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
app.use("/api/user", userRoute);

// start server

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`server on ${PORT}`);
  });
});
