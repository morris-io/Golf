import mongoose from 'mongoose';

// Static golfer info — saved once and never overwritten.
// countryAbbreviation and stateAbbreviation come from athlete.birthPlace in the ESPN API.
const GolferSchema = new mongoose.Schema({
  golferId: { type: Number, required: true, unique: true }, // ESPN athlete id
  displayName: { type: String, required: true },
  countryAbbreviation: { type: String, default: null },
  stateAbbreviation:   { type: String, default: null },
}, { timestamps: true });

export default mongoose.models.Golfer || mongoose.model('Golfer', GolferSchema);
