import mongoose from 'mongoose';

export interface ICategory extends mongoose.Document {
  name: string;
  color?: string;
  createdAt: Date;
}

const CategorySchema = new mongoose.Schema<ICategory>({
  name: { type: String, required: true, unique: true, trim: true },
  color: { type: String, default: '#dc143c' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
