import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// GET all users (with optional ?search= & ?category= filter)
export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    const filter: any = { role: 'user' };

    if (search.trim()) {
      const escaped = search.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const reg = new RegExp(escaped, 'i');
      filter.$or = [{ name: reg }, { contactNumber: reg }];
    }

    if (category && category !== 'All') {
      filter.category = category;
    }

    const users = await User.find(filter)
      .select('name contactNumber role category createdAt')
      .sort({ createdAt: -1 })
      .lean();
    
    return NextResponse.json({ users }, {
      headers: { 'Cache-Control': 'private, max-age=2, stale-while-revalidate=5' }
    });
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
    const { name, contactNumber, category } = body;

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
    }).lean();

    if (existingUser) {
      return NextResponse.json({ error: 'A member with this name and contact number already exists' }, { status: 409 });
    }

    const validCategory = ['General', 'Youth', 'Choir', 'Leader', 'Family'].includes(category) ? category : 'General';

    // Create the user
    const newUser = await User.create({
      name: trimmedName,
      contactNumber,
      category: validCategory,
      role: 'user',
    });

    return NextResponse.json({ user: newUser });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
