export function getTruthLine(distractionMins: number, productiveMins: number, isToday: boolean = true): string {
  const hours = Math.floor(distractionMins / 60)
  const mins = distractionMins % 60
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  const todayStr = isToday ? " today" : ""
  
  if (distractionMins === 0 && productiveMins === 0) return "No time logged yet."
  if (distractionMins === 0) return "A rare zero-distraction day. Well executed."
  if (distractionMins > 120) return `You gave distraction ${timeStr}${todayStr} — that's more than a full trading session.`
  if (distractionMins > 60) return `You gave distraction ${timeStr}${todayStr} — almost the client call you skipped.`
  return `You gave distraction ${timeStr}${todayStr} — a small leak, but keep it tight.`
}
