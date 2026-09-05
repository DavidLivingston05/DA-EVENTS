import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import Event from '@/models/Event';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id: userId } = await params;

    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const attendances = await Attendance.find({ userId }).populate({ path: 'eventId', model: Event }).lean();
    
    const registeredEvents = attendances
      .map(att => att.eventId)
      .filter(event => event !== null);

    return NextResponse.json({ 
      user, 
      registeredEvents 
    });
    
  } catch (error: any) {
    console.error('Error fetching user details:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id: userId } = await params;
    const body = await request.json();
    const { name, contactNumber, category, role } = body;

    if (!name || !contactNumber) {
      return NextResponse.json({ error: 'Name and contact number are required' }, { status: 400 });
    }

    if (!/^\d{10}$/.test(contactNumber)) {
      return NextResponse.json({ error: 'Contact number must be exactly 10 digits' }, { status: 400 });
    }

    const updateFields: any = { 
      name: name.trim(), 
      contactNumber, 
      category: category && typeof category === 'string' ? category.trim() : 'General' 
    };

    if (role && ['admin', 'user'].includes(role)) {
      updateFields.role = role;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true }
    ).lean();

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id: userId } = await params;

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await Attendance.deleteMany({ userId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
