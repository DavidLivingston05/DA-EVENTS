import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Attendance from '@/models/Attendance';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    let token = cookieStore.get('auth-token')?.value;

    if (!token) {
      const authHeader = request.headers.get('Authorization') || request.headers.get('x-auth-token');
      if (authHeader) {
        token = authHeader.replace(/^Bearer\s+/i, '').trim();
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findById(token).select('name contactNumber role category').lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch user's registered events with optimized field selection
    const attendances = await Attendance.find({ userId: user._id })
      .select('eventId additionalCount guestNames specialNotes status')
      .populate('eventId')
      .lean();

    const registeredEvents = attendances
      .map((att: any) => att.eventId)
      .filter((event: any) => event !== null);

    return NextResponse.json({ user, registeredEvents }, {
      headers: { 'Cache-Control': 'private, max-age=3, stale-while-revalidate=5' }
    });
  } catch (error: any) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
