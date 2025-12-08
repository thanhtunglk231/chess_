import mongoose from "mongoose";

// Define the room schema
const roomSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,  // Ensure room codes are always uppercase
    },
    status: {
      type: String,
      enum: ["available", "full", "in-progress"],
      default: "available", // Default status is "available"
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    // You can add more fields if necessary, like creator information or max player count.
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",  // Reference to the User model
    },
    players: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",  // Reference to the User model for players
      default: [],
    },
  },
  { timestamps: true }
);

// Model for Room
const Room = mongoose.models.Room || mongoose.model("Room", roomSchema);

export default Room;
