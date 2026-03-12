import mongoose from 'mongoose';

const CacheSchema = new mongoose.Schema({
  key:       { type: String, required: true, unique: true },
  data:      { type: mongoose.Schema.Types.Mixed, required: true },
  fetchedAt: { type: Date, required: true },
});

export default mongoose.models.Cache || mongoose.model('Cache', CacheSchema);