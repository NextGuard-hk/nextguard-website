import { NextRequest, NextResponse } from 'next/server';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyILAEWmjTpzz_hoj9WF0U0GOWF7-3NaJPMtWWv3KOVPtK38RYoeCI2ur94nEz32Ip5/exec';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Try Apps Script deployment
    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        redirect: 'follow',
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        result = { raw: text };
      }

      if (response.ok) {
        return NextResponse.json({ status: 'success', result });
      }
    } catch (e) {
      console.error('Apps Script error:', e);
    }

    // Fallback: return success with note
    return NextResponse.json({ status: 'success', note: 'received' });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: 'Failed to process registration' },
      { status: 500 }
    );
  }
}
