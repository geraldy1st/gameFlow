export const QUIZ_KEY = "gameflow-quiz-v1";
export const CREATE_CASH = 1_000_000;
export const FREE_CHARACTER = "aoi";

/** Each passed quiz unlocks one face. Aoi is free. */
export const QUIZ_UNLOCK: Record<string, string> = {
  cash: "ren",
  asset: "mio",
  risk: "sora",
};

export function loadPassed(): string[] {
  try {
    const raw = localStorage.getItem(QUIZ_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { passed?: unknown };
    if (!Array.isArray(parsed.passed)) return [];
    return parsed.passed.filter((id): id is string => typeof id === "string" && id in QUIZ_UNLOCK);
  } catch {
    return [];
  }
}

export function savePassed(passed: string[]): void {
  localStorage.setItem(QUIZ_KEY, JSON.stringify({ passed }));
}

export function unlockedIds(passed: string[]): string[] {
  const ids = [FREE_CHARACTER];
  for (const [quiz, characterId] of Object.entries(QUIZ_UNLOCK)) {
    if (passed.includes(quiz)) ids.push(characterId);
  }
  return ids;
}
