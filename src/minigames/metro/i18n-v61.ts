/**
 * Metro v6.1 strings, kept in the lazy metro chunk (Crypto: nothing added to the first screen). `withV61` wraps the
 * game's t(): a v6.1 key is first translated here (fr / es), then handed to t() for the {variables}.
 * The language is read from t() itself (the game's "Metro run" title), so it always matches the game's choice.
 */
type TFn = (text: string, vars?: Record<string, string | number>) => string;

const FR: Record<string, string> = {
  "Practice run: nothing is credited ({c} coins).": "Course d’entraînement : rien n’est crédité ({c} pièces).",
  "Let’s go!": "C’est parti !",
  "{go} 3 lives. The metro is {m} metres away.": "{go} 3 vies. Le métro est à {m} mètres.",
  "Movers and their wardrobe": "Déménageurs et leur armoire",
  "Slide under the movers’ wardrobe": "passer sous l’armoire des déménageurs",
  "Each coin: {amount}, kept even if you miss.": "Chaque pièce : {amount}, gardée même si tu rates.",
  "{n} coins picked up": "{n} pièces ramassées",
  "You made the metro with {n} lives and {c} coins. {amount} won.": "Arrivée au métro avec {n} vies et {c} pièces. {amount} gagnés.",
  "Missed. {c} coins kept: {amount}.": "Raté. {c} pièces gardées : {amount}.",
  "Bonus {prime} + {c} coins × {v} ({sum})": "Prime {prime} + {c} pièces × {v} ({sum})",
  "{c} coins × {v}: {sum} kept": "{c} pièces × {v} : {sum} gardés",
  "The metro left without you. No bonus, and no second try for this offer (the coins you picked up are kept).":
    "Le métro est parti sans toi. Pas de prime, et pas de second essai pour cette offre (les pièces ramassées sont gardées).",
};
const ES: Record<string, string> = {
  "Practice run: nothing is credited ({c} coins).": "Carrera de práctica: no se acredita nada ({c} monedas).",
  "Let’s go!": "¡Vamos!",
  "{go} 3 lives. The metro is {m} metres away.": "{go} 3 vidas. El metro está a {m} metros.",
  "Movers and their wardrobe": "Mudanceros y su armario",
  "Slide under the movers’ wardrobe": "pasar bajo el armario de los mudanceros",
  "Each coin: {amount}, kept even if you miss.": "Cada moneda: {amount}, te la quedas aunque falles.",
  "{n} coins picked up": "{n} monedas recogidas",
  "You made the metro with {n} lives and {c} coins. {amount} won.": "Llegaste al metro con {n} vidas y {c} monedas. {amount} ganados.",
  "Missed. {c} coins kept: {amount}.": "Fallaste. {c} monedas guardadas: {amount}.",
  "Bonus {prime} + {c} coins × {v} ({sum})": "Prima {prime} + {c} monedas × {v} ({sum})",
  "{c} coins × {v}: {sum} kept": "{c} monedas × {v}: {sum} guardados",
  "The metro left without you. No bonus, and no second try for this offer (the coins you picked up are kept).":
    "El metro se fue sin ti. Sin prima, y sin segundo intento para esta oferta (te quedas las monedas recogidas).",
};
export const V61_STRINGS = { fr: FR, es: ES };

export function langOf(t: TFn): "fr" | "es" | "en" {
  const probe = t("Metro run");
  return probe === "Course vers le métro" ? "fr" : probe === "Carrera al metro" ? "es" : "en";
}

export function withV61(t: TFn): TFn {
  const lang = langOf(t);
  const table = lang === "fr" ? FR : lang === "es" ? ES : null;
  return (text, vars) => t((table && table[text]) || text, vars);
}
