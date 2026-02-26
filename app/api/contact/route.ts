import { NextRequest, NextResponse } from 'next/server';

const NPOINT_URL = 'https://api.npoint.io/c02d0f460449e1d7f8f3';
const NOTIFY_EMAIL = 'oscar@next-guard.com';

async function sendNotification(entry: Record<string, string>) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NextGuard Website <noreply@next-guard.com>',
        to: [NOTIFY_EMAIL],
        subject: `New Contact Us Submission from ${entry.fullName || 'Unknown'}`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#0f172a;border-bottom:2px solid #06b6d4;padding-bottom:12px;">New Contact Us Submission</h2>
          <table style="width:100%;border-collapse:collapse;margin-top:16px;">
            <tr><td style="padding:8px 12px;font-weight:bold;color:#475569;border-bottom:1px solid #e2e8f0;">Name</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${entry.fullName || '-'}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:bold;color:#475569;border-bottom:1px solid #e2e8f0;">Email</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;"><a href="mailto:${entry.email}">${entry.email || '-'}</a></td></tr>
            <tr><td style="padding:8px 12px;font-weight:bold;color:#475569;border-bottom:1px solid #e2e8f0;">Company</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${entry.company || '-'}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:bold;color:#475569;border-bottom:1px solid #e2e8f0;">Message</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${entry.message || '-'}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:bold;color:#475569;">Time</td><td style="padding:8px 12px;">${entry.timestamp || new Date().toISOString()}</td></tr>
          </table>
          <p style="margin-top:20px;color:#94a3b8;font-size:12px;">This is an automated notification from NextGuard Website.</p>
        </div>`,
      }),
    });
  } catch (e) { console.error('Notification email error:', e); }
}

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

    // Send email notification (await to ensure delivery)
    try {
      await sendNotification(entry);
    } catch (e) {
      console.error('Failed to send contact notification:', e);
    }

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
