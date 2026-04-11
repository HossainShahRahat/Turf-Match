import mongoose from "mongoose";

const playerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    playerId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    stats: {
      goals: { type: Number, default: 0 },
      matches: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
      value: { type: Number, default: 0 },
      tournamentsPlayed: { type: Number, default: 0 },
      totalValue: { type: Number, default: 0 },
      ratingCount: { type: Number, default: 0 },
      ratingTotal: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

export const Player = mongoose.model("Player", playerSchema);
