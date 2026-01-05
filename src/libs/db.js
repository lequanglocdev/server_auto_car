import mongoose from "mongoose";

export const connectDB = async () =>{
  try {
    await mongoose.connect(process.env.MONGODB_CONECTION);
    console.log('connect succes')
  } catch (error) {
    console.log('connect error',error)
  }

}
