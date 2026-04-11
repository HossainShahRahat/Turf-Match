import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true
    },
    minute: {
      type: Number,
      default: 0
    },
    teamIndex: {
      type: Number,
      enum: [0, 1],
      required: true
    }
  },
  { _id: false }
);

const cardSchema = new mongoose.Schema(
  {
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      required: true
    },
    minute: {
      type: Number,
      default: 0
    },
    teamIndex: {
      type: Number,
      enum: [0, 1],
      required: true
    },
    type: {
      type: String,
      enum: ["yellow", "red"],
      required: true
    }
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
    captain: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null }
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    teams: {
      type: [teamSchema],
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 2,
        message: "Match must contain exactly 2 teams"
      },
      required: true
    },
    goals: { type: [goalSchema], default: [] },
    cards: { type: [cardSchema], default: [] },
    ratings: {
      type: [
        new mongoose.Schema(
          {
            rater: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
            target: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
            score: { type: Number, min: 1, max: 10, required: true }
          },
          { _id: false }
        )
      ],
      default: []
    },
    statsProcessed: { type: Boolean, default: false },
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", default: null },
    phase: { type: String, trim: true, default: "regular" },
    scheduledAt: { type: Date, default: null },
    status: { type: String, enum: ["upcoming", "live", "finished"], default: "upcoming" }
  },
  { timestamps: true }
);

export const Match = mongoose.model("Match", matchSchema);
