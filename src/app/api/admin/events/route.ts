import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Event from '@/models/Event';

let cachedEventsData: any = null;
let cacheTime = 0;
const CACHE_TTL = 3000; // 3 seconds memory cache for sub-millisecond API response

export function invalidateEventsCache() {
  cachedEventsData = null;
  cacheTime = 0;
}

// GET all events
export async function GET() {
  try {
    const now = Date.now();
    if (cachedEventsData && now - cacheTime < CACHE_TTL) {
      return NextResponse.json({ events: cachedEventsData }, {
        headers: { 'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=5' }
      });
    }

    await dbConnect();
    
    // Fetch all events, sort by date with .lean()
    const events = await Event.find({}).sort({ createdAt: -1 }).lean();
    
    cachedEventsData = events;
    cacheTime = now;

    return NextResponse.json({ events }, {
      headers: { 'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=5' }
    });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST create a new event
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { eventName, date, time, locationAddress, travelCost, gmapLink, organizerPhone } = body;

    if (!eventName || !date || !time || !locationAddress) {
      return NextResponse.json({ error: 'Name, date, time, and location are required' }, { status: 400 });
    }

    const newEvent = await Event.create({
      eventName: eventName.trim(),
      date,
      time,
      locationAddress: locationAddress.trim(),
      gmapLink: gmapLink ? gmapLink.trim() : '',
      travelCost: travelCost ? travelCost.trim() : '0',
      organizerPhone: organizerPhone ? organizerPhone.trim() : ''
    });

    invalidateEventsCache();

    return NextResponse.json({ event: newEvent });
  } catch (error: any) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
