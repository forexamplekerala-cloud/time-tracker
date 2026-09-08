export function getTruthLine(distractionMins: number, productiveMins: number): string {
  const hours = Math.floor(distractionMins / 60)
  const mins = distractionMins % 60
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  
  if (distractionMins === 0 && productiveMins === 0) return "No time logged yet."
  if (distractionMins === 0) return "A rare zero-distraction day. Well executed."
  if (distractionMins > 120) return `You gave distraction ${timeStr} today — that's more than a full trading session.`
  if (distractionMins > 60) return `You gave distraction ${timeStr} today — almost the client call you skipped.`
  return `You gave distraction ${timeStr} today — a small leak, but keep it tight.`
}

export function getProcrastinationLine(badMinutes: number): string | null {
  if (badMinutes === 0) return null
  
  const hours = Math.floor(badMinutes / 60)
  const mins = badMinutes % 60
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  
  if (badMinutes >= 120) return `You spent ${timeStr} on productive procrastination. That's a full session lost.`
  if (badMinutes >= 60) return `${timeStr} went to bad-effect work. You were busy, not productive.`
  return `${timeStr} of productive procrastination today. Small drift.`
}
