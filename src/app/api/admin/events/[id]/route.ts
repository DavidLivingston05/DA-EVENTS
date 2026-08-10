import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Event from '@/models/Event';
import Attendance from '@/models/Attendance';

function calculateStats(attendances: any[]) {
  const registeredUsers = attendances.map(att => att.userId);
  const totalMembers = registeredUsers.length;
  const totalGuests = attendances.reduce((acc, att) => acc + (att.additionalCount || 0), 0);
  const totalHeadcount = totalMembers + totalGuests;

  const presentCount = attendances.filter(att => att.status === 'Present').length;
  const absentCount = attendances.filter(att => att.status === 'Absent').length;
  const registeredCount = attendances.filter(att => !att.status || att.status === 'Registered').length;

  return {
    attendances,
    registeredUsers,
    totalMembers,
    totalGuests,
    totalHeadcount,
    presentCount,
    absentCount,
    registeredCount,
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id: eventId } = await params;

    const event = await Event.findById(eventId).lean();
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const rawAttendances = await Attendance.find({ eventId }).populate('userId').lean();
    const attendances = rawAttendances.filter(att => att.userId !== null);
    const stats = calculateStats(attendances);

    return NextResponse.json({
      event,
      ...stats
    });
  } catch (error: any) {
    console.error('Error fetching event details:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id: eventId } = await params;

    const event = await Event.findByIdAndDelete(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    await Attendance.deleteMany({ eventId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id: eventId } = await params;
    const body = await request.json();
    const { eventName, date, time, locationAddress, travelCost, gmapLink, organizerPhone } = body;

    const event = await Event.findByIdAndUpdate(
      eventId,
      { eventName, date, time, locationAddress, travelCost, gmapLink, organizerPhone },
      { new: true }
    ).lean();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (error: any) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id: eventId } = await params;
    const body = await request.json();
    const { userId, additionalCount, guestNames, specialNotes, status } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const countNum = typeof additionalCount === 'number' ? Math.max(0, additionalCount) : parseInt(additionalCount || '0', 10) || 0;
    const namesStr = typeof guestNames === 'string' ? guestNames.trim() : '';
    const notesStr = typeof specialNotes === 'string' ? specialNotes.trim() : '';

    const updateFields: any = { 
      eventId, 
      userId, 
      additionalCount: countNum, 
      guestNames: namesStr,
      specialNotes: notesStr
    };

    if (status && ['Registered', 'Present', 'Absent'].includes(status)) {
      updateFields.status = status;
    }

    await Attendance.findOneAndUpdate(
      { eventId, userId },
      updateFields,
      { upsert: true, new: true }
    );

    const rawAttendances = await Attendance.find({ eventId }).populate('userId').lean();
    const attendances = rawAttendances.filter(att => att.userId !== null);
    const stats = calculateStats(attendances);

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error registering user to event:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH: Update single attendance status or remove a user
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id: eventId } = await params;
    const body = await request.json();
    const { userId, action, status } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (action === 'delete') {
      await Attendance.deleteOne({ eventId, userId });
    } else if (status && ['Registered', 'Present', 'Absent'].includes(status)) {
      await Attendance.findOneAndUpdate(
        { eventId, userId },
        { status },
        { upsert: true, new: true }
      );
    }

    const rawAttendances = await Attendance.find({ eventId }).populate('userId').lean();
    const attendances = rawAttendances.filter(att => att.userId !== null);
    const stats = calculateStats(attendances);

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error updating attendance record:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
