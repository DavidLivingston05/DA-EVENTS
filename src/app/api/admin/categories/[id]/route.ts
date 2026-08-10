import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Category from '@/models/Category';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await params;

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const categories = await Category.find({}).sort({ name: 1 }).lean();
    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
