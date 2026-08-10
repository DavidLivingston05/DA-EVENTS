import mongoose from 'mongoose';

export interface IEvent extends mongoose.Document {
  eventName: string;
  date: string;
  time: string;
  locationAddress: string;
  gmapLink?: string;
  travelCost: string;
  organizerPhone?: string;
  createdAt: Date;
}

const EventSchema = new mongoose.Schema<IEvent>({
  eventName: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  locationAddress: {
    type: String,
    required: [true, 'Please provide the physical location address for the event'],
  },
  gmapLink: {
    type: String,
    required: false,
  },
  travelCost: { type: String, required: false },
  organizerPhone: { type: String, required: false, default: '' },
  createdAt: { type: Date, default: Date.now },
});

EventSchema.index({ date: 1 });
EventSchema.index({ createdAt: -1 });

export default mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
