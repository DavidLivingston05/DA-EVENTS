import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Event from '@/models/Event';
import Attendance from '@/models/Attendance';

export async function POST() {
  try {
    await dbConnect();

    // 1. Delete all member users (keep admin)
    const userResult = await User.deleteMany({ role: { $ne: 'admin' } });

    // 2. Delete all events
    const eventResult = await Event.deleteMany({});

    // 3. Delete all attendance registrations
    const attendanceResult = await Attendance.deleteMany({});

    return NextResponse.json({
      success: true,
      message: 'Database cleaned up successfully for project handover!',
      deletedUsersCount: userResult.deletedCount,
      deletedEventsCount: eventResult.deletedCount,
      deletedAttendanceCount: attendanceResult.deletedCount,
    });
  } catch (error: any) {
    console.error('Clean DB Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
