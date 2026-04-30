import mongoose from "mongoose";

const connectDB = async () => {
  try {
    mongoose.set("strictQuery", false);
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`✅  MongoDB → ${conn.connection.host}`);
  } catch (err) {
    console.error("\n❌  MongoDB connection failed:", err.message);
    console.error("   Check your MONGODB_URI in server/.env\n");
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () =>
  console.warn("⚠️  MongoDB disconnected"),
);

export default connectDB;
