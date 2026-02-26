import { NextRequest, NextResponse } from 'next/server';

const NPOINT_URL = 'https://api.npoint.io/20f0b0ac01ead865a619';
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
        subject: `New RSVP Registration from ${entry.fullName || 'Unknown'}`,
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#0f172a;border-bottom:2px solid #06b6d4;padding-bottom:12px;">New RSVP Registration</h2>
          <table style="width:100%;border-collapse:collapse;margin-top:16px;">
            <tr><td style="padding:8px 12px;font-weight:bold;color:#475569;border-bottom:1px solid #e2e8f0;">Name</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${entry.fullName || '-'}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:bold;color:#475569;border-bottom:1px solid #e2e8f0;">Email</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;"><a href="mailto:${entry.email}">${entry.email || '-'}</a></td></tr>
            <tr><td style="padding:8px 12px;font-weight:bold;color:#475569;border-bottom:1px solid #e2e8f0;">Company</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${entry.company || '-'}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:bold;color:#475569;border-bottom:1px solid #e2e8f0;">Job Title</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${entry.jobTitle || '-'}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:bold;color:#475569;border-bottom:1px solid #e2e8f0;">Phone</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${entry.phone || '-'}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:bold;color:#475569;border-bottom:1px solid #e2e8f0;">Country</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${entry.country || '-'}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:bold;color:#475569;border-bottom:1px solid #e2e8f0;">Attendees</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${entry.attendees || '-'}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:bold;color:#475569;border-bottom:1px solid #e2e8f0;">Notes</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${entry.notes || '-'}</td></tr>
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

    // Send email notification (await to ensure delivery)
    try {
      await sendNotification(entry);
    } catch (e) {
      console.error('Failed to send RSVP notification:', e);
    }

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
