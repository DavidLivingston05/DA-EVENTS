import mongoose from 'mongoose';

export interface IAttendance extends mongoose.Document {
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const AttendanceSchema = new mongoose.Schema<IAttendance>({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

// Ensure a user can only register once per event
AttendanceSchema.index({ eventId: 1, userId: 1 }, { unique: true });
// Optimize queries that find all attendances for a specific user
AttendanceSchema.index({ userId: 1 });

export default mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);
