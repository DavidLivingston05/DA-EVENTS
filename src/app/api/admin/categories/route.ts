import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';
import User from '@/models/User';

export async function GET() {
  try {
    await dbConnect();
    let categories = await Category.find({}).sort({ name: 1 }).lean();
    
    // Also discover any unique categories used in existing user documents that might not be in Category collection yet
    const usedCategories: string[] = await User.distinct('category');
    const existingNames = new Set(categories.map((c: any) => c.name));

    for (const name of usedCategories) {
      if (name && !existingNames.has(name)) {
        try {
          const newCat = await Category.create({ name });
          categories.push(newCat.toObject());
        } catch {
          // ignore potential duplicate race condition
        }
      }
    }

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { name, color } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } });
    if (existing) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
    }

    const category = await Category.create({
      name: trimmedName,
      color: color || '#dc143c'
    });

    const categories = await Category.find({}).sort({ name: 1 }).lean();
    return NextResponse.json({ category, categories });
  } catch (error: any) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
