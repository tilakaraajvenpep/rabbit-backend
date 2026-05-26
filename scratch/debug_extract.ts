import { DocumentService } from '../src/modules/document/document.service.js';
import { db } from '../src/db/index.js';
import { scopeDocuments } from '../src/db/schema/index.js';
import { eq } from 'drizzle-orm';

async function debug() {
  try {
    const docId = 5;
    console.log(`Fetching doc ${docId} from database...`);
    const doc = await db.query.scopeDocuments.findFirst({
      where: eq(scopeDocuments.documentId, docId),
    });
    console.log('Doc details:', doc);
    
    if (!doc) {
      console.log('Doc not found!');
      return;
    }

    console.log(`Running extraction logic for doc ${docId}...`);
    const result = await DocumentService.extractScopeDetails(docId, doc.tenantId);
    console.log('Extraction success!', result);
  } catch (err: any) {
    console.error('Extraction error:', err);
  }
}

debug();
