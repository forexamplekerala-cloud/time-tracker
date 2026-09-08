import fs from 'fs';
import path from 'path';

export function runScorer() {
  const resultsPath = path.join(__dirname, 'results.json');
  if (!fs.existsSync(resultsPath)) {
    console.error("results.json not found. Run runner.ts first.");
    return;
  }

  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

  let totalCases = 0;
  let categoryMatches = 0;
  let totalEntriesExpected = 0;
  let inventionViolations = 0;
  let traceabilityFails = 0;

  for (const res of results) {
    if (res.error) continue;
    totalCases++;

    const expectedEntries = res.expected.entries || [];
    const actualEntries = res.actual.entries || [];
    
    totalEntriesExpected += expectedEntries.length;

    // Very naive scoring for MVP
    actualEntries.forEach((actual: any, idx: number) => {
      if (actual.violations && actual.violations.includes('V4_INVENTED_TIME')) inventionViolations++;
      if (actual.violations && actual.violations.includes('V2_TRACEABILITY_FAIL')) traceabilityFails++;
      
      const expect = expectedEntries[idx];
      if (expect && expect.category === actual.category) {
        categoryMatches++;
      }
    });
  }

  const categoryAccuracy = totalEntriesExpected > 0 ? (categoryMatches / totalEntriesExpected) : 0;
  const traceabilityRate = totalEntriesExpected > 0 ? ((totalEntriesExpected - traceabilityFails) / totalEntriesExpected) : 0;

  console.log(`=== EVAL SCORES ===`);
  console.log(`Total Cases Run: ${totalCases}`);
  console.log(`Category Accuracy: ${(categoryAccuracy * 100).toFixed(1)}% (Target: >=80%)`);
  console.log(`Traceability Rate: ${(traceabilityRate * 100).toFixed(1)}% (Target: 100%)`);
  console.log(`Invention Violations: ${inventionViolations} (Target: 0)`);

  if (traceabilityRate < 1.0 || inventionViolations > 0 || categoryAccuracy < 0.8) {
    console.error("\n❌ Targets missed.");
    process.exit(1);
  } else {
    console.log("\n✅ All targets met!");
  }
}

if (require.main === module) {
  runScorer();
}
