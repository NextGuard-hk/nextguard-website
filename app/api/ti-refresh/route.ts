import { NextResponse } from 'next/server';
import { refreshFeeds, getFeedStatus } from '@/lib/threat-intel';

// Vercel Cron: refresh OSINT threat intel feeds every 15 minutes
// Add to vercel.json: { "crons": [{ "path": "/api/ti-refresh", "schedule": "*/15 * * * *" }] }

export async function GET(request: Request) {
  // Verify cron secret (optional but recommended)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  try {
    await refreshFeeds();
    const status = getFeedStatus();
    return NextResponse.json({
      success: true,
      message: 'Threat intel feeds refreshed successfully',
      feeds: status,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
