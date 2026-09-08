import { getTruthLine } from '../src/lib/dashboard/truth';

export function runTruthEvals() {
  const testCases = [
    { name: 'All distraction', dist: 480, prod: 0, expectInclude: 'that\'s more than a full trading session' },
    { name: 'Zero distraction', dist: 0, prod: 240, expectInclude: 'rare zero-distraction day' },
    { name: 'Nothing logged', dist: 0, prod: 0, expectInclude: 'No time logged yet' },
    { name: 'Small leak', dist: 35, prod: 180, expectInclude: 'small leak' },
    { name: 'Big leak', dist: 130, prod: 60, expectInclude: 'trading session' },
  ];

  let passed = 0;
  console.log(`=== TRUTH LINE EVALS ===\n`);

  for (const tc of testCases) {
    const result = getTruthLine(tc.dist, tc.prod);
    if (result.includes(tc.expectInclude)) {
      console.log(`✅ [PASS] ${tc.name}: "${result}"`);
      passed++;
    } else {
      console.log(`❌ [FAIL] ${tc.name}: expected to include "${tc.expectInclude}", got "${result}"`);
    }
  }

  if (passed === testCases.length) {
    console.log(`\n✅ All ${testCases.length} truth line tests passed!`);
  } else {
    console.error(`\n❌ ${testCases.length - passed} tests failed.`);
    process.exit(1);
  }
}

if (require.main === module) {
  runTruthEvals();
}
