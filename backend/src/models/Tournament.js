import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
    captain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player",
      default: null,
    },
  },
  { _id: false },
);

const tournamentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["league", "knockout", "group-knockout"],
      required: true,
    },
    teams: [teamSchema],

    matches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Match" }],
    status: {
      type: String,
      enum: ["upcoming", "live", "finished"],
      default: "upcoming",
    },
    image: { type: String, default: "" },
    hasBidding: { type: Boolean, default: false },
    totalMoneyPerTeam: { type: Number, default: 0, min: 0 },
    playerPrices: {
      type: [
        new mongoose.Schema(
          {
            player: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Player",
              required: true,
            },
            price: { type: Number, required: true, min: 0 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    progressionConfig: {
      pointsMode: { type: String, enum: ["score", "goals"], default: "score" },
      scorePoints: {
        win: { type: Number, default: 3 },
        draw: { type: Number, default: 1 },
        loss: { type: Number, default: 0 },
      },
      groupQualifiedCount: { type: Number, default: 2 },
      knockoutStageMode: {
        type: String,
        enum: ["auto", "custom"],
        default: "auto",
      },
      knockoutRound: {
        type: String,
        enum: ["final", "semi", "quarter"],
        default: "semi",
      },
      includeThirdPlaceMatch: { type: Boolean, default: false },
      groups: {
        type: [
          new mongoose.Schema(
            {
              name: { type: String, required: true, trim: true },
              teams: { type: [String], default: [] },
            },
            { _id: false },
          ),
        ],
        default: [],
      },
    },
    transferMarketEnabled: { type: Boolean, default: false },
    squadRules: {
      livePlayersPerTeam: { type: Number, default: 7, min: 1 },
      subPlayersPerTeam: { type: Number, default: 4, min: 0 },
      allowSwapPlayers: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

export const Tournament = mongoose.model("Tournament", tournamentSchema);
