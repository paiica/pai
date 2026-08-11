// The platform has no existing letter-grade or GPA system anywhere (confirmed
// by grep across the whole backend) — this is the single source of truth for
// both, isolated here so it's swappable if a real configurable grading system
// is ever built. Standard collegiate-style scale, extending the partial scale
// given in the transcript spec.
const SCALE: { min: number; letter: string; points: number }[] = [
  { min: 90, letter: "A", points: 4.0 },
  { min: 85, letter: "A-", points: 3.7 },
  { min: 80, letter: "B+", points: 3.3 },
  { min: 75, letter: "B", points: 3.0 },
  { min: 70, letter: "B-", points: 2.7 },
  { min: 65, letter: "C+", points: 2.3 },
  { min: 60, letter: "C", points: 2.0 },
  { min: 0, letter: "F", points: 0.0 },
];

export function percentageToLetter(pct: number): string {
  const row = SCALE.find((r) => pct >= r.min);
  return row?.letter ?? "F";
}

export function percentageToGpaPoints(pct: number): number {
  const row = SCALE.find((r) => pct >= r.min);
  return row?.points ?? 0.0;
}
