import mongoose from "mongoose";

const tournamentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["league", "knockout", "group-knockout"], required: true },
    teams: { type: [mongoose.Schema.Types.Mixed], default: [] },
    matches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Match" }],
    status: { type: String, enum: ["upcoming", "live", "finished"], default: "upcoming" },
    image: { type: String, default: "" },
    playerPrices: {
      type: [
        new mongoose.Schema(
          {
            player: { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
            price: { type: Number, required: true, min: 0 }
          },
          { _id: false }
        )
      ],
      default: []
    },
    progressionConfig: {
      pointsMode: { type: String, enum: ["score", "goals"], default: "score" },
      scorePoints: {
        win: { type: Number, default: 3 },
        draw: { type: Number, default: 1 },
        loss: { type: Number, default: 0 }
      },
      groupQualifiedCount: { type: Number, default: 2 },
      knockoutStageMode: { type: String, enum: ["auto", "custom"], default: "auto" },
      knockoutRound: { type: String, enum: ["final", "semi", "quarter"], default: "semi" },
      includeThirdPlaceMatch: { type: Boolean, default: false },
      groups: {
        type: [
          new mongoose.Schema(
            {
              name: { type: String, required: true, trim: true },
              teams: { type: [String], default: [] }
            },
            { _id: false }
          )
        ],
        default: []
      }
    }
  },
  { timestamps: true }
);

export const Tournament = mongoose.model("Tournament", tournamentSchema);
