import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';

async function parseAll() {
  const uploadsDir = 'uploads';
  
  function getFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      file = path.join(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
        results = results.concat(getFiles(file));
      } else {
        if (file.endsWith('.pdf')) {
          results.push(file);
        }
      }
    });
    return results;
  }

  const pdfFiles = getFiles(uploadsDir);
  console.log(`Found ${pdfFiles.length} PDF files:`);

  for (const file of pdfFiles) {
    console.log(`\n========================================`);
    console.log(`FILE: ${file}`);
    const dataBuffer = fs.readFileSync(file);
    try {
      const parser = new PDFParse({ data: dataBuffer });
      const textResult = await parser.getText();
      console.log(`TEXT CONTENT (first 1000 chars):`);
      console.log(textResult.text.substring(0, 1000));
      console.log(`FULL TEXT LENGTH: ${textResult.text.length}`);
      await parser.destroy();
    } catch (err: any) {
      console.error(`Error parsing ${file}:`, err.message);
    }
  }
}

parseAll();
