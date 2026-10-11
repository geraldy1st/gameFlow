/** GameFlow v3 — what each skill does, for Legend › Skills and Day › Stats (English source; fr/es in i18n.ts). */
import type { SkillId } from "./skills";

export interface SkillInfo {
  id: SkillId;
  icon: string;
  /** CSS colour of the bar / chip (navy text on it stays above 4.5:1). */
  color: string;
  desc: string;
  low: string;
  high: string;
  up: string;
}

export const SKILL_INFO: SkillInfo[] = [
  { id: "content", icon: "smile", color: "#FFC745", desc: "Your mood: it weighs on your spending and on your luck with the die.", low: "Under 30: lifestyle costs +10% (comfort spending).", high: "Over 70: a small chance to re-roll once per turn.", up: "Rest, parties, outings with friends." },
  { id: "social", icon: "people", color: "#8FD3FF", desc: "How easily you get along with people.", low: "Few friend seats, affinity grows slowly.", high: "More friend seats (3 to 7); a friend may tip you about a hidden deal.", up: "Circle activities, birthdays, gifts." },
  { id: "mind", icon: "book", color: "#C9B6FF", desc: "Reading a deal before you sign.", low: "Profitability and risk of deal cards show “???”.", high: "Profitability and risk visible; the class quiz pays more.", up: "Books, the museum, the class quiz, missions." },
  { id: "luck", icon: "clover", color: "#3DDC97", desc: "The small push of chance.", low: "Normal odds.", high: "A few more small deals; a crash hits you less hard.", up: "Stocks, the friends’ shop, the metro run." },
  { id: "health", icon: "cross", color: "#FF8A73", desc: "Your body keeps the pace, or not.", low: "Low: sometimes a lost turn (forced rest) and medical costs.", high: "High: a small salary bonus.", up: "Gym (purchase), sleep, active outings." },
  { id: "discipline", icon: "target", color: "#B99BF0", desc: "Saying no to one expense too many. The lesson of the game.", low: "Frequent surprises, temptations hard to refuse.", high: "Fewer surprises; refusing a lifestyle temptation gets easy.", up: "Refusing a lifestyle card, keeping the budget, good choices." },
  { id: "nego", icon: "pct", color: "#F2A65A", desc: "Pay less, sell better.", low: "Prices as shown.", high: "−5 to −15% on deals and shops; better resale offers.", up: "Shop purchases, deals closed, sales." },
  { id: "charisma", icon: "star", color: "#FF9EC7", desc: "Making a good impression at work.", low: "Promotions are rare on Career squares.", high: "More promotions; interviews to change jobs.", up: "Parties, wardrobe clothes, Career squares." },
  { id: "creativity", icon: "brush", color: "#7FD6C2", desc: "Turning a talent into income.", low: "No side income.", high: "Side incomes (drawings, online content), counted as earned income.", up: "Gallery, studio, museum, mini-games." },
  { id: "reputation", icon: "medal", color: "#E8C27A", desc: "What the city thinks of you.", low: "Shops open at their normal conditions.", high: "Locked shops open earlier; mentors come to you.", up: "Good card choices, your circle, successful deals." },
];

export function skillInfo(id: SkillId): SkillInfo {
  return SKILL_INFO.find((s) => s.id === id)!;
}
