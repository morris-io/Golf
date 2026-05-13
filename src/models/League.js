import mongoose from 'mongoose';

const LeagueSchema = new mongoose.Schema({
  name: { type: String, default: 'My League'},
  tournamentName: { type: String }, 
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  teamCount: { type: Number, default: 4 }, 
  cutHandling: { type: String, enum: ['standard', 'cap'], default: 'standard' },
  code: { type: String, unique: true },
  draftOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  picks: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    golferId: Number,
    golferName: String,
    pickNo: Number
  }],
  draftStarted: { type: Boolean, default: false },
  lastPickAt: { type: Date },
  isActive: { type: Boolean, default: true },
  scheduledDraftTime: { type: Date, default: null },
}, { timestamps: true });

export default mongoose.models.League || mongoose.model('League', LeagueSchema);