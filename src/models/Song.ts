import mongoose from 'mongoose';

export interface ISong extends mongoose.Document {
  title: string;
  tamilTitle?: string;
  originalKey: string;
  tempo: number; // in BPM
  timeSignature: string; // e.g. "4/4", "3/4", "6/8"
  category: 'Praise' | 'Worship' | 'Special Number' | 'Tamil Hymn' | 'Offertory' | 'Communion';
  lyrics: string;
  tamilLyrics?: string;
  chords?: string;
  youtubeUrl?: string;
  assignedDate?: string; // e.g. "2026-10-18" if featured on Sunday setlist
  createdAt: Date;
}

const SongSchema = new mongoose.Schema<ISong>({
  title: { type: String, required: true },
  tamilTitle: { type: String, default: '' },
  originalKey: { type: String, default: 'D' },
  tempo: { type: Number, default: 72 },
  timeSignature: { type: String, default: '4/4' },
  category: {
    type: String,
    enum: ['Praise', 'Worship', 'Special Number', 'Tamil Hymn', 'Offertory', 'Communion'],
    default: 'Worship'
  },
  lyrics: { type: String, default: '' },
  tamilLyrics: { type: String, default: '' },
  chords: { type: String, default: '' },
  youtubeUrl: { type: String, default: '' },
  assignedDate: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

SongSchema.index({ category: 1 });
SongSchema.index({ assignedDate: 1 });
SongSchema.index({ title: 1 });

export default mongoose.models.Song || mongoose.model<ISong>('Song', SongSchema);
