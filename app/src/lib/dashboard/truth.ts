function fmt(mins: number): string {
  const hours = Math.floor(mins / 60)
  const m = mins % 60
  return hours > 0 ? `${hours}h ${m}m` : `${m}m`
}

export function getTruthLine(distractionMins: number, productiveMins: number, fuelMins: number = 0, isToday: boolean = true): string {
  const todayStr = isToday ? " today" : ""

  if (distractionMins === 0 && productiveMins === 0 && fuelMins === 0) return "No time logged yet."
  if (productiveMins === 0 && distractionMins === 0 && fuelMins > 0) return `Only ${fmt(fuelMins)} of fuel logged${todayStr}. No deep work, no distraction recorded yet — the day is still unwritten.`
  if (productiveMins === 0 && fuelMins > 0 && distractionMins > 0) return `${fmt(distractionMins)} lost${todayStr} against ${fmt(fuelMins)} of fuel and zero deep work.`
  if (distractionMins === 0) return "A rare zero-distraction day. Well executed."
  if (distractionMins > 120) return `You gave distraction ${fmt(distractionMins)}${todayStr} — that's more than a full trading session.`
  if (distractionMins > 60) return `You gave distraction ${fmt(distractionMins)}${todayStr} — almost the client call you skipped.`
  return `You gave distraction ${fmt(distractionMins)}${todayStr} — a small leak, but keep it tight.`
}
