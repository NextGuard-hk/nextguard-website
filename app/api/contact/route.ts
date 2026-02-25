import { NextRequest, NextResponse } from 'next/server';

const NPOINT_URL = 'https://api.npoint.io/c02d0f460449e1d7f8f3';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const entry = {
      ...data,
      timestamp: new Date().toISOString(),
      id: Date.now().toString(),
    };

    const getRes = await fetch(NPOINT_URL, { cache: 'no-store' });
    const current = await getRes.json();
    const contacts = current.contacts || [];
    contacts.push(entry);

    await fetch(NPOINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts }),
    });

    return NextResponse.json({ status: 'success', id: entry.id });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to save contact' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const format = searchParams.get('format');

  // Verify session token from cookie or query
  const cookieToken = request.cookies.get('contact_admin_token')?.value;
  const authToken = token || cookieToken;

  if (!authToken || authToken !== process.env.CONTACT_SESSION_SECRET) {
    return NextResponse.json(
      { status: 'error', message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const res = await fetch(NPOINT_URL, { cache: 'no-store' });
    const data = await res.json();
    const contacts = data.contacts || [];

    if (format === 'csv') {
      const headers = ['ID','Full Name','Email','Company','Message','Timestamp'];
      const csvRows = [headers.join(',')];
      for (const c of contacts) {
        csvRows.push([
          c.id || '',
          `"${(c.fullName || '').replace(/"/g, '""')}"`,
          `"${(c.email || '').replace(/"/g, '""')}"`,
          `"${(c.company || '').replace(/"/g, '""')}"`,
          `"${(c.message || '').replace(/"/g, '""')}"`,
          c.timestamp || '',
        ].join(','));
      }
      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="contact-submissions-${new Date().toISOString().slice(0,10)}.csv"`,
        },
      });
    }

    return NextResponse.json({ status: 'success', contacts });
  } catch (error) {
    console.error('Contact fetch error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}
