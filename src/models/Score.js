import mongoose from 'mongoose';

const ScoreSchema = new mongoose.Schema({
  league: { type: mongoose.Schema.Types.ObjectId, ref: 'League', required: true },
  golferId: { type: Number, required: true },
  golferName: String,
  rank: String,
  total: String, 
  thru: String,
  round1: String,
  round2: String,
  round3: String,
  round4: String,
  strokes: Number, 
  status: String,
  capped: { type: Boolean, default: false },
  manualOverride: { type: Boolean, default: false },  // ← add this
  lastUpdated: { type: Date, default: Date.now }
});

export default mongoose.models.Score || mongoose.model('Score', ScoreSchema);