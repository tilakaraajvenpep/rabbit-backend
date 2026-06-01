import { db } from '../src/db/index.js';
import { scopeDocuments } from '../src/db/schema/index.js';

async function main() {
  const allDocs = await db.select().from(scopeDocuments);
  console.log(`Total documents in DB: ${allDocs.length}`);
  for (const doc of allDocs) {
    const text = doc.extractedText || '';
    if (text.toLowerCase().includes('ocr') || text.toLowerCase().includes('agv')) {
      console.log(`Document ID: ${doc.documentId} | Project ID: ${doc.projectId} | File Name: ${doc.fileName}`);
      console.log(`- Contains OCR or AGV in extracted text!`);
      // Print snippet
      const idx = text.toLowerCase().indexOf('ocr');
      if (idx !== -1) {
        console.log(`- Snippet: ${text.substring(Math.max(0, idx - 100), Math.min(text.length, idx + 100))}`);
      }
    }
  }
  process.exit(0);
}

main();
