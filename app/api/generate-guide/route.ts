import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType } from 'docx';

export async function GET() {
  const H1 = HeadingLevel.HEADING_1;
  const H2 = HeadingLevel.HEADING_2;
  const CENTER = AlignmentType.CENTER;
  const p = (text: string, opts?: object) => new Paragraph({ text, ...opts });

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        p('NextGuard Admin Upload Guide', { heading: HeadingLevel.TITLE, alignment: CENTER }),
        p('Version 1.0 | Prepared by NextGuard Technology', { alignment: CENTER }),
        p(''),
        p('1. Overview', { heading: H1 }),
        p('The Admin Upload feature allows administrators to upload files into two separate storage areas in Cloudflare R2:'),
        p('Public Upload: Files stored under the public/ prefix. Visible to all visitors on next-guard.com/downloads.', { bullet: { level: 0 } }),
        p('Internal Upload: Files stored under the internal/ prefix. NOT visible on public website; accessible to admins only.', { bullet: { level: 0 } }),
        p(''),
        p('2. Accessing the Upload Panel', { heading: H1 }),
        p('1. Log in to the Admin Panel at https://next-guard.com/admin'),
        p('2. Click the Uploads tab in the top navigation.'),
        p('3. Two mode buttons appear: Upload for Public and Upload for Internal.'),
        p(''),
        p('3. Upload Mode Selection', { heading: H1 }),
        p('Upload for Public (Blue Button)', { heading: H2 }),
        p('Files go to the public/ prefix in R2.'),
        p('They appear on the /downloads page for all visitors.'),
        p('Suitable for: brochures, datasheets, white papers, product guides.'),
        p(''),
        p('Upload for Internal (Orange/Red Button)', { heading: H2 }),
        p('Files go to the internal/ prefix in R2.'),
        p('NOT publicly accessible - completely hidden from the /downloads page.'),
        p('Suitable for: internal policies, NDAs, pricing sheets, confidential reports.'),
        p(''),
        p('4. How to Upload a File', { heading: H1 }),
        p('Step 1: Select Upload Mode - Click Upload for Public or Upload for Internal.'),
        p('Step 2: Navigate or Create a Folder - Click into subfolders or click + New Folder.'),
        p('Step 3: Select and Upload File - Choose a file and click Upload.'),
        p('Step 4: Verify Upload - The file list refreshes automatically. Confirm the file appears.'),
        p(''),
        p('5. Folder Management', { heading: H1 }),
        p('Create Folder: Enter a name in the New Folder field and click Create.'),
        p('Navigate Folder: Click a folder name to enter it. The breadcrumb shows your location.'),
        p('Delete Folder: Select an empty folder and click Delete. Non-empty folders cannot be deleted.'),
        p(''),
        p('6. Deleting Files', { heading: H1 }),
        p('1. Navigate to the folder containing the file.'),
        p('2. Click the Delete icon next to the file.'),
        p('3. Confirm the deletion in the dialog.'),
        p('WARNING: Deleted files cannot be recovered.'),
        p(''),
        p('7. Public Downloads Page', { heading: H1 }),
        p('next-guard.com/downloads ONLY shows files from the public/ prefix.'),
        p('Files in internal/ are completely hidden from all public pages.'),
        p('Visitors can browse folders and download public files freely.'),
        p(''),
        p('8. Important Notes', { heading: H1 }),
        p('Always verify the correct Upload Mode before uploading sensitive files.', { bullet: { level: 0 } }),
        p('File names should not contain special characters or spaces; use hyphens or underscores.', { bullet: { level: 0 } }),
        p('Supported file types: PDF, DOCX, PPTX, XLSX, PNG, JPG, ZIP.', { bullet: { level: 0 } }),
        p('Internal files are not encrypted at rest by default. Handle with appropriate care.', { bullet: { level: 0 } }),
        p(''),
        p('9. Frequently Asked Questions (FAQ)', { heading: H1 }),
        p('Q: Can public visitors see Internal files?'),
        p('A: No. Internal files (internal/ prefix) are excluded from the /downloads page and all public APIs.'),
        p(''),
        p('Q: I uploaded a file but it does not appear in the folder. What should I do?'),
        p('A: Confirm you selected the correct Upload Mode. Check via /api/downloads?prefix=public/ or /api/downloads?prefix=internal/.'),
        p(''),
        p('Q: How do I move a file from Internal to Public?'),
        p('A: Download the file locally, switch to Upload for Public mode, re-upload, then delete the Internal copy.'),
        p(''),
        p('Q: Is there a file size limit?'),
        p('A: Cloudflare R2 supports files up to 5 TB per object. Practical limits depend on your network speed.'),
        p(''),
        p('10. Security Reminder', { heading: H1 }),
        p('The Admin panel is protected by authentication. Never share admin credentials.'),
        p('Regularly audit the internal/ folder to ensure no sensitive files are accidentally left accessible.'),
        p('For any security concerns, contact your NextGuard system administrator immediately.'),
        p(''),
        p('--- End of Guide ---', { alignment: CENTER }),
        p('NextGuard Technology | next-guard.com | Version 1.0', { alignment: CENTER }),
      ]
    }]
  });

  const buffer = await Packer.toBuffer(doc);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="NextGuard_Admin_Upload_Guide.docx"',
    },
  });
}
