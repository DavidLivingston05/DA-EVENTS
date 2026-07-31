import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import Event from '@/models/Event';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findById(token).select('name contactNumber role');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch user's registered events to avoid extra client-side requests
    const attendances = await Attendance.find({ userId: user._id }).populate('eventId');
    const registeredEvents = attendances
      .map((att: any) => att.eventId)
      .filter((event: any) => event !== null);

    return NextResponse.json({ user, registeredEvents });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
