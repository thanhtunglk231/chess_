import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },

    status: {
      type: String,
      enum: ["available", "full", "in-progress"],
      default: "available",
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    players: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },

    // 🔐 Mật khẩu phòng (null nếu phòng public)
    password: {
      type: String,
      default: null,
    },

    // 🟦 Có phải phòng private không?
    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Room = mongoose.models.Room || mongoose.model("Room", roomSchema);

export default Room;
