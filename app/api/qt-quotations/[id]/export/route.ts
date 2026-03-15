// app/api/qt-quotations/[id]/export/route.ts
// Excel Export: generates .xlsx matching Skyguard quotation format, uploads to R2
import { NextRequest, NextResponse } from 'next/server';
import { authenticateQtRequest } from '@/lib/quotation-auth';
import { getDB } from '@/lib/db';
import { generateId, writeQuotationAudit } from '@/lib/quotation-db';
import * as XLSX from 'xlsx';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || '',
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
    },
  });
}

const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'nextguard-files';

function fmt(amount: number, currency = 'HKD'): string {
  return `${currency} ${Number(amount).toLocaleString('en-HK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildQuotationExcel(q: any, items: any[]): Buffer {
  const wb = XLSX.utils.book_new();
  const rows: any[][] = [];

  // Title
  rows.push(['NEXTGUARD TECHNOLOGY LIMITED']);
  rows.push(['QUOTATION']);
  rows.push([]);

  // Header info
  rows.push(['Quotation No.:', q.quote_number, '', 'Date:', new Date(q.created_at).toLocaleDateString('en-HK')]);
  rows.push(['Client:', q.client_name, '', 'Valid Until:', q.valid_until ? new Date(q.valid_until).toLocaleDateString('en-HK') : 'N/A']);
  rows.push(['Company:', q.client_company || '']);
  if (q.client_email) rows.push(['Email:', q.client_email]);
  if (q.client_phone) rows.push(['Phone:', q.client_phone]);
  if (q.client_address) rows.push(['Address:', q.client_address]);
  rows.push(['Currency:', q.currency || 'HKD']);
  rows.push([]);

  // Column headers
  rows.push(['#', 'Product / Description', 'SKU', 'Qty', 'Unit Price', 'Discount', 'Line Total']);

  // Items
  items.forEach((item, idx) => {
    const disc = item.discount_percent > 0 ? `${item.discount_percent}%` : '-';
    rows.push([
      idx + 1,
      item.product_name || item.description || '',
      item.sku || '',
      item.quantity,
      fmt(item.unit_price, q.currency),
      disc,
      fmt(item.line_total, q.currency),
    ]);
    if (item.description && item.description !== item.product_name) {
      rows.push(['', item.description]);
    }
  });

  rows.push([]);

  // Totals
  rows.push(['', '', '', '', '', 'Subtotal:', fmt(q.subtotal || q.total_amount, q.currency)]);
  if (Number(q.discount_amount) > 0) {
    rows.push(['', '', '', '', '', 'Discount:', `-${fmt(q.discount_amount, q.currency)}`]);
  }
  if (Number(q.tax_amount) > 0) {
    rows.push(['', '', '', '', '', 'Tax:', fmt(q.tax_amount, q.currency)]);
  }
  rows.push(['', '', '', '', '', 'TOTAL:', fmt(q.total_amount, q.currency)]);

  rows.push([]);

  // Notes & Terms
  if (q.notes) {
    rows.push(['Notes:']);
    rows.push([q.notes]);
    rows.push([]);
  }
  if (q.terms) {
    rows.push(['Terms & Conditions:']);
    q.terms.split('\n').forEach((line: string) => { if (line.trim()) rows.push([line.trim()]); });
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 40 },
    { wch: 20 },
    { wch: 8 },
    { wch: 20 },
    { wch: 12 },
    { wch: 22 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Quotation');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(buf);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticateQtRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const db = getDB();

  // Fetch quotation
  const qtResult = await db.execute({ sql: 'SELECT * FROM qt_quotations WHERE id = ?', args: [id] });
  if (qtResult.rows.length === 0) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
  const q = qtResult.rows[0] as any;

  if (auth.role !== 'admin' && q.created_by !== auth.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch line items
  const itemsResult = await db.execute({
    sql: 'SELECT * FROM qt_quotation_items WHERE quotation_id = ? ORDER BY sort_order, created_at',
    args: [id],
  });
  const items = itemsResult.rows as any[];

  // Build Excel
  const excelBuffer = buildQuotationExcel(q, items);

  // File naming
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const clientSlug = (q.client_company || q.client_name || 'client').replace(/[^a-zA-Z0-9]/g, '-').slice(0, 20);
  const fileName = `${q.quote_number}_${clientSlug}_${date}.xlsx`;
  const r2Key = `quotations/${id}/${fileName}`;

  // Try to upload to R2
  try {
    const r2 = getR2Client();
    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      Body: excelBuffer,
      ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      Metadata: { quotationId: id, quoteNumber: q.quote_number, client: q.client_name },
    }));

    // Record in audit log
    await writeQuotationAudit(auth.userId, auth.email, 'quotation_exported', 'quotation', id, { fileName });

    // Generate presigned URL (valid 15 mins)
    const signedUrl = await getSignedUrl(
      r2,
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: r2Key }),
      { expiresIn: 900 }
    );

    return NextResponse.json({ success: true, fileName, url: signedUrl, expiresIn: 900 });
  } catch (e: any) {
    // Fallback: return Excel directly
    console.error('R2 upload failed, returning direct download:', e.message);
    await writeQuotationAudit(auth.userId, auth.email, 'quotation_exported', 'quotation', id, { fileName, r2Error: e.message });
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(excelBuffer.length),
      },
    });
  }
}
