import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function runAudit() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase env vars. Run this script with .env.local loaded.")
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  console.log("Running Parser Audit...\n")

  // 1. Total parses vs accepted
  const { count: totalEntries } = await supabase
    .from('time_entries')
    .select('*', { count: 'exact', head: true })

  const { count: totalFeedback } = await supabase
    .from('ai_feedback')
    .select('*', { count: 'exact', head: true })

  if (totalEntries === null || totalFeedback === null) {
    console.error("Could not fetch stats.")
    return
  }

  const acceptanceRate = totalEntries > 0 ? ((totalEntries - totalFeedback) / totalEntries) * 100 : 100;
  
  console.log(`=== ACCEPTANCE TELEMETRY ===`)
  console.log(`Total parsed entries saved: ${totalEntries}`)
  console.log(`Total edits/misreads: ${totalFeedback}`)
  console.log(`Acceptance Rate: ${acceptanceRate.toFixed(1)}% (Target: >= 70%)`)

  if (acceptanceRate < 70) {
    console.log(`\n⚠️ WARNING: Acceptance rate is below 70%.`)
    console.log(`Action: Review recent ai_feedback rows and add failing cases to golden dataset.`)
  }

  // 2. Fetch specific violations
  const { data: feedbackData } = await supabase
    .from('ai_feedback')
    .select('corrected_fields')
    .order('created_at', { ascending: false })
    .limit(100)

  if (feedbackData && feedbackData.length > 0) {
    let inventionViolations = 0;
    feedbackData.forEach((row: any) => {
      const violations = row.corrected_fields?.violations || [];
      if (violations.includes('V4_INVENTED_TIME') || violations.includes('V3_ARITHMETIC_MISMATCH')) {
        inventionViolations++;
      }
    });

    console.log(`\n=== RECENT VIOLATIONS (Last 100 Feedback Rows) ===`)
    console.log(`Invention/Arithmetic Violations: ${inventionViolations}`)

    if (inventionViolations > 0) {
      console.log(`\n🚨 ALERT: Invention events detected in production!`)
      console.log(`Action: Freeze prompt changes. Review inputs causing V3/V4 violations.`)
    }
  }

  console.log(`\nAudit complete.`)
}

if (require.main === module) {
  runAudit().catch(console.error)
}
