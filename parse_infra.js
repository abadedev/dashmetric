const fs = require('fs');
const xlsx = require('xlsx');

try {
  console.log('Loading workbook...');
  const file = './public/Infraestrutura 01_03 à 31_03.xlsx';
  console.log('Exists?', fs.existsSync(file));
  
  const wb = xlsx.readFile(file);
  console.log('SHEETS:', wb.SheetNames);
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
    console.log(`\n=== SHEET: ${name} ===`);
    console.log(`ROWS: ${rows.length}`);
    for (let i = 0; i < Math.min(5, rows.length); i++) {
        console.log(`ROW ${i}:`, JSON.stringify(rows[i]));
    }
  }
} catch (e) {
  console.error('Error reading the excel file:', e);
}
