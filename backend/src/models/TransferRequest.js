import mongoose from "mongoose";

const transferRequestSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
    match: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true },
    fromTeamIndex: { type: Number, enum: [0, 1], required: true },
    toTeamIndex: { type: Number, enum: [0, 1], required: true },
    reason: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
  },
  { timestamps: true }
);

export const TransferRequest = mongoose.model("TransferRequest", transferRequestSchema);
