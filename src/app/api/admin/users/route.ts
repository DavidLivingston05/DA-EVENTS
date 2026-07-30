import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// GET all users
export async function GET() {
  try {
    await dbConnect();
    
    // Fetch all users with role 'user', sorted by creation date descending
    const users = await User.find({ role: 'user' }).sort({ createdAt: -1 });
    
    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST create a new user manually by Admin
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { name, contactNumber } = body;

    if (!name || !contactNumber) {
      return NextResponse.json({ error: 'Name and contact number are required' }, { status: 400 });
    }

    if (!/^\d{10}$/.test(contactNumber)) {
      return NextResponse.json({ error: 'Contact number must be exactly 10 digits' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const escapedName = trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    // Check if user with this specific Name + Contact Number already exists
    const existingUser = await User.findOne({ 
      contactNumber, 
      name: new RegExp(`^${escapedName}$`, 'i') 
    });
    if (existingUser) {
      return NextResponse.json({ error: 'A member with this name and contact number already exists' }, { status: 409 });
    }

    // Create the user
    const newUser = await User.create({
      name,
      contactNumber,
      role: 'user',
    });

    return NextResponse.json({ user: newUser });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
