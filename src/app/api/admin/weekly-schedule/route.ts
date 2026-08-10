import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import WeeklySchedule from '@/models/WeeklySchedule';

let cachedSchedule: any = null;
let cacheTime = 0;
const CACHE_TTL = 10000; // 10 seconds memory cache

// GET all weekly schedules with fast response caching
export async function GET() {
  try {
    const now = Date.now();
    if (cachedSchedule && now - cacheTime < CACHE_TTL) {
      return NextResponse.json({ schedule: cachedSchedule }, {
        headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' }
      });
    }

    await dbConnect();
    const schedule = await WeeklySchedule.find({}).lean();
    cachedSchedule = schedule;
    cacheTime = now;

    return NextResponse.json({ schedule }, {
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' }
    });
  } catch (error: any) {
    console.error('Error fetching weekly schedule:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT - upsert a single day's services and invalidate cache
export async function PUT(request: Request) {
  try {
    await dbConnect();
    const { day, services } = await request.json();
    if (!day || !services) {
      return NextResponse.json({ error: 'Day and services are required' }, { status: 400 });
    }
    const updated = await WeeklySchedule.findOneAndUpdate(
      { day },
      { services },
      { upsert: true, new: true }
    );

    cachedSchedule = null;
    cacheTime = 0;

    return NextResponse.json({ schedule: updated });
  } catch (error: any) {
    console.error('Error updating weekly schedule:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
