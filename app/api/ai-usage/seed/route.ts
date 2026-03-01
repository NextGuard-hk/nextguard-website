import { NextResponse } from 'next/server'

const NPOINT_URL = 'https://api.npoint.io/970d8e85c18f2a3aa984'

export async function GET() {
  const scans = [
    {id:'s1',timestamp:'2026-02-23T09:15:00.000Z',engine:'traditional',detected:true,latencyMs:45,contentLength:2048,source:'compare'},
    {id:'s2',timestamp:'2026-02-23T09:15:02.000Z',engine:'perplexity',detected:true,latencyMs:1850,contentLength:2048,source:'compare'},
    {id:'s3',timestamp:'2026-02-23T14:30:00.000Z',engine:'cloudflare',detected:true,latencyMs:620,contentLength:2048,source:'compare'},
    {id:'s4',timestamp:'2026-02-23T14:30:03.000Z',engine:'traditional',detected:false,latencyMs:38,contentLength:512,source:'api'},
    {id:'s5',timestamp:'2026-02-24T10:00:00.000Z',engine:'perplexity',detected:true,latencyMs:1920,contentLength:4096,source:'compare'},
    {id:'s6',timestamp:'2026-02-24T10:00:06.000Z',engine:'cloudflare',detected:true,latencyMs:650,contentLength:4096,source:'compare'},
    {id:'s7',timestamp:'2026-02-24T15:45:00.000Z',engine:'traditional',detected:false,latencyMs:35,contentLength:1024,source:'demo'},
    {id:'s8',timestamp:'2026-02-25T08:20:00.000Z',engine:'traditional',detected:true,latencyMs:50,contentLength:8192,source:'compare'},
    {id:'s9',timestamp:'2026-02-25T08:20:04.000Z',engine:'perplexity',detected:true,latencyMs:2200,contentLength:8192,source:'compare'},
    {id:'s10',timestamp:'2026-02-25T08:20:08.000Z',engine:'cloudflare',detected:true,latencyMs:710,contentLength:8192,source:'compare'},
    {id:'s11',timestamp:'2026-02-25T11:30:00.000Z',engine:'traditional',detected:true,latencyMs:41,contentLength:3072,source:'api'},
    {id:'s12',timestamp:'2026-02-26T09:45:00.000Z',engine:'perplexity',detected:true,latencyMs:1990,contentLength:768,source:'compare'},
    {id:'s13',timestamp:'2026-02-26T09:45:06.000Z',engine:'cloudflare',detected:true,latencyMs:670,contentLength:768,source:'compare'},
    {id:'s14',timestamp:'2026-02-26T13:15:00.000Z',engine:'traditional',detected:true,latencyMs:47,contentLength:5120,source:'demo'},
    {id:'s15',timestamp:'2026-02-26T13:15:03.000Z',engine:'perplexity',detected:true,latencyMs:2050,contentLength:5120,source:'demo'},
    {id:'s16',timestamp:'2026-02-27T08:00:00.000Z',engine:'traditional',detected:true,latencyMs:44,contentLength:6144,source:'compare'},
    {id:'s17',timestamp:'2026-02-27T08:00:03.000Z',engine:'perplexity',detected:true,latencyMs:1870,contentLength:6144,source:'compare'},
    {id:'s18',timestamp:'2026-02-27T08:00:07.000Z',engine:'cloudflare',detected:true,latencyMs:690,contentLength:6144,source:'compare'},
    {id:'s19',timestamp:'2026-02-27T12:30:00.000Z',engine:'traditional',detected:true,latencyMs:39,contentLength:2560,source:'api'},
    {id:'s20',timestamp:'2026-02-27T12:30:02.000Z',engine:'perplexity',detected:false,latencyMs:2300,contentLength:2560,source:'api'},
    {id:'s21',timestamp:'2026-02-28T09:10:00.000Z',engine:'traditional',detected:true,latencyMs:48,contentLength:10240,source:'compare'},
    {id:'s22',timestamp:'2026-02-28T09:10:04.000Z',engine:'perplexity',detected:true,latencyMs:2150,contentLength:10240,source:'compare'},
    {id:'s23',timestamp:'2026-02-28T09:10:08.000Z',engine:'cloudflare',detected:true,latencyMs:740,contentLength:10240,source:'compare'},
    {id:'s24',timestamp:'2026-02-28T14:20:00.000Z',engine:'traditional',detected:true,latencyMs:43,contentLength:1536,source:'demo'},
    {id:'s25',timestamp:'2026-02-28T17:30:00.000Z',engine:'perplexity',detected:true,latencyMs:1900,contentLength:4096,source:'compare'},
    {id:'s26',timestamp:'2026-03-01T08:00:00.000Z',engine:'traditional',detected:true,latencyMs:46,contentLength:7168,source:'compare'},
    {id:'s27',timestamp:'2026-03-01T08:00:04.000Z',engine:'perplexity',detected:true,latencyMs:1980,contentLength:7168,source:'compare'},
    {id:'s28',timestamp:'2026-03-01T08:00:08.000Z',engine:'cloudflare',detected:true,latencyMs:700,contentLength:7168,source:'compare'},
    {id:'s29',timestamp:'2026-03-01T10:30:00.000Z',engine:'traditional',detected:false,latencyMs:37,contentLength:896,source:'api'},
    {id:'s30',timestamp:'2026-03-01T10:30:03.000Z',engine:'perplexity',detected:true,latencyMs:2080,contentLength:896,source:'api'},
    {id:'s31',timestamp:'2026-03-01T10:30:06.000Z',engine:'cloudflare',detected:false,latencyMs:570,contentLength:896,source:'api'},
    {id:'s32',timestamp:'2026-03-01T14:15:00.000Z',engine:'traditional',detected:true,latencyMs:52,contentLength:3584,source:'demo'},
    {id:'s33',timestamp:'2026-03-01T14:15:03.000Z',engine:'perplexity',detected:true,latencyMs:1820,contentLength:3584,source:'demo'},
    {id:'s34',timestamp:'2026-03-01T14:15:06.000Z',engine:'cloudflare',detected:true,latencyMs:640,contentLength:3584,source:'demo'},
    {id:'s35',timestamp:'2026-03-01T15:00:00.000Z',engine:'traditional',detected:true,latencyMs:40,contentLength:2048,source:'compare'},
    {id:'s36',timestamp:'2026-03-01T15:00:03.000Z',engine:'perplexity',detected:true,latencyMs:1950,contentLength:2048,source:'compare'},
    {id:'s37',timestamp:'2026-03-01T15:00:06.000Z',engine:'cloudflare',detected:true,latencyMs:680,contentLength:2048,source:'compare'},
  ]

  try {
    const r = await fetch(NPOINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scans })
    })
    return NextResponse.json({ ok: true, count: scans.length, status: r.status })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
