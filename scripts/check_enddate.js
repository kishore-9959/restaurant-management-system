const fs = require('fs');
const content = fs.readFileSync('database/17_ReportStoredProcedures.sql', 'utf8');
const procs = content.split(/CREATE OR ALTER PROCEDURE\s+/i).slice(1);
console.log(`Found ${procs.length} procedures.`);
procs.forEach((p, idx) => {
  const match = p.match(/^([a-zA-Z0-9_\.\[\]]+)/);
  const name = match ? match[1] : `Proc_${idx}`;
  const hasEndDate = p.includes('@EndDate');
  const hasBoundaryCheck = p.includes("CAST(@EndDate AS TIME) = '00:00:00.000'");
  if (hasEndDate) {
    console.log(`${name.padEnd(40)}: hasEndDate=true, boundaryNormalized=${hasBoundaryCheck}`);
  }
});

