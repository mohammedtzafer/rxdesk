export type RoundingRule = "NONE" | "NEAREST_5" | "NEAREST_15" | "NEAREST_30";

const roundingIncrements: Record<RoundingRule, number> = {
  NONE: 0,
  NEAREST_5: 5,
  NEAREST_15: 15,
  NEAREST_30: 30,
};

export function roundMinutes(minutes: number, rule: RoundingRule): number {
  const increment = roundingIncrements[rule];
  if (increment === 0) return minutes;
  return Math.round(minutes / increment) * increment;
}

export function roundTime(date: Date, rule: RoundingRule): Date {
  const increment = roundingIncrements[rule];
  if (increment === 0) return new Date(date);

  const ms = date.getTime();
  const incrementMs = increment * 60 * 1000;
  const rounded = Math.round(ms / incrementMs) * incrementMs;
  return new Date(rounded);
}
