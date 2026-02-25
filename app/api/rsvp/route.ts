import { NextRequest, NextResponse } from 'next/server';

const NPOINT_URL = 'https://api.npoint.io/20f0b0ac01ead865a619';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const entry = {
      ...data,
      timestamp: new Date().toISOString(),
      id: Date.now().toString(),
    };

    // Get current registrations
    const getRes = await fetch(NPOINT_URL, { cache: 'no-store' });
    const current = await getRes.json();
    const registrations = current.registrations || [];
    registrations.push(entry);

    // Save updated registrations
    await fetch(NPOINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrations }),
    });

    return NextResponse.json({ status: 'success', id: entry.id });
  } catch (error) {
    console.error('RSVP error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to process registration' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const password = searchParams.get('password');
  const format = searchParams.get('format');

  if (password !== 'NextGuard123') {
    return NextResponse.json(
      { status: 'error', message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const res = await fetch(NPOINT_URL, { cache: 'no-store' });
    const data = await res.json();
    const registrations = data.registrations || [];

    if (format === 'csv') {
      const headers = ['ID','Full Name','Email','Company','Job Title','Phone','Country','Attendees','Notes','Timestamp'];
      const csvRows = [headers.join(',')];
      for (const r of registrations) {
        csvRows.push([
          r.id || '',
          `"${(r.fullName || '').replace(/"/g, '""')}"`,
          `"${(r.email || '').replace(/"/g, '""')}"`,
          `"${(r.company || '').replace(/"/g, '""')}"`,
          `"${(r.jobTitle || '').replace(/"/g, '""')}"`,
          `"${(r.phone || '').replace(/"/g, '""')}"`,
          `"${(r.country || '').replace(/"/g, '""')}"`,
          r.attendees || '',
          `"${(r.notes || '').replace(/"/g, '""')}"`,
          r.timestamp || '',
        ].join(','));
      }
      const csv = csvRows.join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="rsvp_registrations.csv"',
        },
      });
    }

    return NextResponse.json({
      status: 'success',
      total: registrations.length,
      registrations,
    });
  } catch (error) {
    console.error('Admin fetch error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch registrations' },
      { status: 500 }
    );
  }
}
