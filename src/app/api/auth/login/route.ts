import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { mode, name, contactNumber, password } = body;

    let userRole = 'user';
    let userId = '';

    if (mode === 'admin') {
      if (password !== 'JESUSLOVESYOU') {
        return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
      }
      userRole = 'admin';
      
      // Upsert admin user
      const adminUser = await User.findOneAndUpdate(
        { contactNumber: '0000000000' }, 
        { name: 'Administrator', contactNumber: '0000000000', role: 'admin' },
        { upsert: true, new: true }
      );
      userId = adminUser._id.toString();
      
    } else {
      if (!name || !contactNumber) {
        return NextResponse.json({ error: 'Name and contact number are required' }, { status: 400 });
      }
      
      // Normalize contact number: extract digits and take last 10
      const digitsOnly = String(contactNumber).replace(/\D/g, '');
      const cleanPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

      if (!/^\d{10}$/.test(cleanPhone)) {
        return NextResponse.json({ error: 'Contact number must be exactly 10 digits' }, { status: 400 });
      }

      const trimmedName = name.trim();
      const escapedName = trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const nameRegex = new RegExp(`^${escapedName}$`, 'i');

      // Find user by normalized phone AND name (allows multiple family members on 1 phone number)
      let user = await User.findOne({ 
        $and: [
          {
            $or: [
              { contactNumber: cleanPhone },
              { contactNumber: String(contactNumber).trim() }
            ]
          },
          { name: nameRegex }
        ]
      });
      
      if (!user) {
        // Create a new distinct member profile for this name + contact number
        user = await User.create({ name: trimmedName, contactNumber: cleanPhone, role: 'user' });
      }
      
      userId = user._id.toString();
    }

    // Set HTTP-only cookie for session
    const cookieStore = await cookies();
    cookieStore.set('auth-token', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    return NextResponse.json({ success: true, role: userRole });
    
  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
