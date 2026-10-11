const mongoose = require("mongoose");

// Cache the connection promise so serverless invocations (Vercel) reuse it
// instead of opening a new connection, or running queries before connected.
let connecting = null;

async function connectDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in environment variables");
  }
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!connecting) {
    connecting = mongoose
      .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
      .then((m) => {
        const { host, name } = m.connection;
        console.log(`MongoDB connected -> host: ${host}, database: ${name}`);
        return m.connection;
      })
      .catch((err) => {
        connecting = null; // allow retry on the next request
        throw err;
      });
  }
  return connecting;
}

module.exports = connectDB;
