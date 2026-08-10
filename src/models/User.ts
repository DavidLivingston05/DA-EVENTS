import mongoose from 'mongoose';

export type UserCategory = string;

export interface IUser extends mongoose.Document {
  name: string;
  contactNumber: string;
  role: 'admin' | 'user';
  category: string;
  createdAt: Date;
}

const UserSchema = new mongoose.Schema<IUser>({
  name: { type: String, required: true },
  contactNumber: { type: String, default: 'no number' },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  category: { 
    type: String, 
    default: 'General' 
  },
  createdAt: { type: Date, default: Date.now },
});

UserSchema.index({ role: 1, createdAt: -1 });
UserSchema.index({ contactNumber: 1, name: 1 });
UserSchema.index({ category: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
