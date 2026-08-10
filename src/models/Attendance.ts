import mongoose from 'mongoose';

export type AttendanceStatus = 'Registered' | 'Present' | 'Absent';

export interface IAttendance extends mongoose.Document {
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  additionalCount: number;
  guestNames?: string;
  specialNotes?: string;
  status: AttendanceStatus;
  createdAt: Date;
}

const AttendanceSchema = new mongoose.Schema<IAttendance>({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  additionalCount: { type: Number, default: 0, min: 0 },
  guestNames: { type: String, default: '' },
  specialNotes: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['Registered', 'Present', 'Absent'], 
    default: 'Registered' 
  },
  createdAt: { type: Date, default: Date.now },
});

// Ensure a user can only register once per event
AttendanceSchema.index({ eventId: 1, userId: 1 }, { unique: true });
// Optimize queries that find all attendances for a specific user
AttendanceSchema.index({ userId: 1 });
AttendanceSchema.index({ eventId: 1, status: 1 });

export default mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);
