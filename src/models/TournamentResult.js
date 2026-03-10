import mongoose from 'mongoose';

const TournamentResultSchema = new mongoose.Schema({
  tournamentId:   { type: String, required: true },  // ESPN event id
  tournamentName: { type: String, required: true },

  golferId:    { type: Number, required: true },
  golferName:  { type: String, required: true },

  position:    { type: String, default: null },
  scoreToPar:  { type: Number, default: null },
  cut:         { type: Boolean, default: false },

  savedAt: { type: Date, default: Date.now },
}, { timestamps: true });

TournamentResultSchema.index({ tournamentId: 1, golferId: 1 }, { unique: true });

export default mongoose.models.TournamentResult
  || mongoose.model('TournamentResult', TournamentResultSchema);
