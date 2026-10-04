/**
 * Training mode ("Entraînement") copy, fr / en / es. Source: Mirage's tutorial/strings.js (validated),
 * aligned with the game's existing terminology (i18n.ts): fr "Caisse" (not "Trésorerie"), "Acompte",
 * "Flux passif", "Revenu passif", "Flux mensuel", "Petite affaire", "Train de vie", "La Porte"; es "Caja", "Entrada"...
 * Placeholders: {n} turn, {d} die, {sal} {pas} {exp} {flow} {down} {cf} {m} {gap} {k} amounts, {name} player.
 */
import type { Lang } from "@/game/i18n";

export type StepId =
  | "t1roll" | "t1pawn" | "t2roll" | "t2pay" | "t3roll" | "t3deal" | "t3asset" | "t4roll" | "t4life" | "t5roll" | "t5gate";

export interface TrainingStrings {
  pill: string;
  got: string;
  next: string;
  skip: string;
  replayNote: string;
  skipToast: string;
  topSub: string;
  passNote: string;
  steps: Record<StepId, [string, string]>;
  paid: string;
  perMonth: string;
  deal: {
    tag: string; kind: string; title: string; story: string; down: string; cf: string; note: string; none: string;
    safe: string; cap: string; if: string; cash: string; passive: string; flow: string; gap: string; buy: string; decline: string;
  };
  life: {
    tag: string; kind: string; title: string; story: string; pay: string; then: string; once: string; onceEx: string;
    sub: string; subEx: string; year: string; btnPay: string; btnPass: string;
  };
  nod: { tag: string; title: string; story: string };
  done: { kicker: string; title: string; r1: string; r2: string; r3: string; play: string; replay: string; restore: string };
  replay: { title: string; body: string; go: string; cancel: string };
}

const fr: TrainingStrings = {
  pill: "Entraînement · Tour {n}/5",
  got: "Compris",
  next: "Suivant",
  skip: "Passer le tutoriel",
  replayNote: "Rejouable à tout moment : Options › Revoir le tutoriel.",
  skipToast: "Entraînement arrêté : règles normales dès le prochain tour. Rejouable depuis Options.",
  topSub: "Entraînement · Tour {n}/5 · {name}",
  passNote: "Tour d’entraînement de {name} terminé — au joueur suivant (règles normales).",
  steps: {
    t1roll: ["Lance le dé", "Tout commence ici. En entraînement, le dé est réglé pour de petits pas sans risque."],
    t1pawn: ["Ton pion avance", "{d} au dé = {d} stations. Te voilà sur Don : une station calme, rien à payer ce tour-ci."],
    t2roll: ["Tour 2 : relance", "Prochaine station : Jour de paie. Garde un œil sur ta caisse."],
    t2pay: ["Jour de paie !", "Salaire {sal} + Passif {pas} − Dépenses {exp} = {flow}. Ce flux tombe dans ta caisse à chaque Jour de paie, même quand tu ne fais que passer devant."],
    t3roll: ["Tour 3 : une affaire", "Une petite affaire t’attend. En entraînement, son prix est plafonné et elle ne demande aucun prêt."],
    t3deal: ["Avant / après", "Regarde ce qui change avant d’acheter : {down} d’acompte, {cf}/mois de revenu passif. Badge « Sans risque » : pas de prêt, pas de mensualité."],
    t3asset: ["Ton premier actif", "{cf}/mois qui arrivent sans travailler. Ton flux mensuel passe à {flow}."],
    t4roll: ["Tour 4 : train de vie", "Station Train de vie : de petites tentations. Rien d’obligatoire."],
    t4life: ["Une fois, ou tous les mois ?", "Une dépense ponctuelle se paie une seule fois. Un abonnement s’ajoute à tes dépenses chaque mois et éloigne la Porte de {m}."],
    t5roll: ["Tour 5 : dernier lancer", "Dernier tour d’entraînement. Après, on regarde ensemble où tu vas."],
    t5gate: ["La Porte : ton vrai objectif", "Quand ton revenu passif dépasse tes dépenses, la Porte s’ouvre vers la Ligne 2 · Liberté. Toi : {pas} contre {exp}. Il manque {gap}/mois, soit environ {k} affaires comme celle-ci."],
  },
  paid: "Paie encaissée",
  perMonth: "/mois",
  deal: {
    tag: "Petite affaire", kind: "Actif", title: "Sous-location de la chambre d’ami", story: "Le futon d’un cousin devient un petit revenu tranquille.",
    down: "Acompte", cf: "Flux passif", note: "Mensualité", none: "aucune", safe: "Sans risque", cap: "Prix plafonné en entraînement : {cap} max",
    if: "Si tu achètes…", cash: "Caisse", passive: "Revenu passif", flow: "Flux mensuel", gap: "Écart avec la Porte",
    buy: "L’acheter", decline: "Refuser",
  },
  life: {
    tag: "Train de vie", kind: "Dépense", title: "Autel aux abonnements", story: "Trois applis, deux box, un magazine. Ils se renouvellent pour toujours.",
    pay: "Payer", then: "Puis chaque mois", once: "Ponctuel", onceEx: "Le long dîner : {once} une fois", sub: "Abonnement", subEx: "{now} + {m} × 12",
    year: "sur 12 mois", btnPay: "Payer", btnPass: "Laisser passer",
  },
  nod: { tag: "Social", title: "Un signe de tête de l’autre côté de la salle", story: "Quelqu’un manque de se présenter. Le moment passe." },
  done: {
    kicker: "Tutoriel terminé", title: "À toi de jouer", r1: "Le dé fait avancer ton pion, station par station.", r2: "Jour de paie : salaire + passif − dépenses.",
    r3: "Achète des actifs, méfie-toi des abonnements, ouvre la Porte.", play: "Jouer", replay: "Revoir le tutoriel", restore: "Reprendre ma partie sauvegardée",
  },
  replay: {
    title: "Revoir le tutoriel",
    body: "Une partie d’entraînement de 5 tours démarre avec le même personnage et le même rêve. Ta partie en cours est mise de côté : tu pourras la reprendre à la fin ou depuis Options.",
    go: "Lancer l’entraînement", cancel: "Annuler",
  },
};

const en: TrainingStrings = {
  pill: "Training · Turn {n}/5",
  got: "Got it",
  next: "Next",
  skip: "Skip the tutorial",
  replayNote: "Replay any time: Options › Replay the tutorial.",
  skipToast: "Training stopped: normal rules from the next turn. Replay it from Options.",
  topSub: "Training · Turn {n}/5 · {name}",
  passNote: "{name}’s training turn is done — next player (normal rules).",
  steps: {
    t1roll: ["Roll the die", "It all starts here. In training, the die is set for small, safe steps."],
    t1pawn: ["Your token moves", "{d} on the die = {d} stations. You land on Charity: a quiet stop, nothing to pay this turn."],
    t2roll: ["Turn 2: roll again", "Next stop: Payday. Keep an eye on your cash."],
    t2pay: ["Payday!", "Salary {sal} + Passive {pas} − Expenses {exp} = {flow}. This cash flow lands in your cash on every Payday, even when you only pass it."],
    t3roll: ["Turn 3: a deal", "A small deal is waiting. In training its price is capped and it needs no loan."],
    t3deal: ["Before / after", "See what changes before you buy: {down} down, {cf}/mo passive income. “No risk” badge: no loan, no monthly note."],
    t3asset: ["Your first asset", "{cf}/mo that arrives without working. Your monthly cash flow becomes {flow}."],
    t4roll: ["Turn 4: lifestyle", "Lifestyle stop: small temptations. Nothing is mandatory."],
    t4life: ["Once, or every month?", "A one-off expense is paid once. A subscription joins your expenses every month and pushes the Gate {m} further away."],
    t5roll: ["Turn 5: last roll", "Last training turn. Then we look at where you are heading."],
    t5gate: ["The Gate: your real goal", "When passive income is greater than your expenses, the Gate opens onto Line 2 · Freedom. You: {pas} against {exp}. {gap}/mo to go, about {k} deals like this one."],
  },
  paid: "Payday cleared",
  perMonth: "/mo",
  deal: {
    tag: "Small Deal", kind: "Asset", title: "Spare-room sublet", story: "A cousin’s futon becomes a quiet little income.",
    down: "Down payment", cf: "Passive cash flow", note: "Monthly note", none: "none", safe: "No risk", cap: "Training price cap: {cap} max",
    if: "If you buy…", cash: "Cash", passive: "Passive income", flow: "Monthly cash flow", gap: "Gap to the Gate",
    buy: "Buy it", decline: "Decline",
  },
  life: {
    tag: "Lifestyle", kind: "Expense", title: "Subscription shrine", story: "Three apps, two crates, one magazine. They renew forever.",
    pay: "Pay", then: "Then monthly", once: "One-off", onceEx: "The long dinner: {once} once", sub: "Subscription", subEx: "{now} + {m} × 12",
    year: "over 12 months", btnPay: "Pay", btnPass: "Let it pass",
  },
  nod: { tag: "Social", title: "A nod across the room", story: "Someone almost introduces themselves. The moment passes." },
  done: {
    kicker: "Tutorial complete", title: "Your turn", r1: "The die moves your token, station by station.", r2: "Payday: salary + passive − expenses.",
    r3: "Buy assets, watch out for subscriptions, open the Gate.", play: "Play", replay: "Replay the tutorial", restore: "Back to my saved game",
  },
  replay: {
    title: "Replay the tutorial",
    body: "A 5-turn training game starts with the same character and dream. Your current game is set aside: you can pick it up again at the end or from Options.",
    go: "Start training", cancel: "Cancel",
  },
};

const es: TrainingStrings = {
  pill: "Entrenamiento · Turno {n}/5",
  got: "Entendido",
  next: "Siguiente",
  skip: "Saltar el tutorial",
  replayNote: "Puedes repetirlo cuando quieras: Opciones › Ver el tutorial otra vez.",
  skipToast: "Entrenamiento detenido: reglas normales desde el próximo turno. Repítelo desde Opciones.",
  topSub: "Entrenamiento · Turno {n}/5 · {name}",
  passNote: "Turno de entrenamiento de {name} terminado — siguiente jugador (reglas normales).",
  steps: {
    t1roll: ["Tira el dado", "Todo empieza aquí. En el entrenamiento, el dado está ajustado para pasos pequeños y sin riesgo."],
    t1pawn: ["Tu ficha avanza", "{d} en el dado = {d} estaciones. Llegas a Donación: una parada tranquila, nada que pagar este turno."],
    t2roll: ["Turno 2: tira otra vez", "Próxima parada: Día de pago. Vigila tu caja."],
    t2pay: ["¡Día de pago!", "Sueldo {sal} + Pasivo {pas} − Gastos {exp} = {flow}. Este flujo cae en tu caja en cada Día de pago, aunque solo pases por delante."],
    t3roll: ["Turno 3: un trato", "Te espera un trato pequeño. En el entrenamiento su precio tiene tope y no pide préstamo."],
    t3deal: ["Antes / después", "Mira qué cambia antes de comprar: {down} de entrada, {cf}/mes de ingreso pasivo. Sello «Sin riesgo»: sin préstamo, sin cuota."],
    t3asset: ["Tu primer activo", "{cf}/mes que llegan sin trabajar. Tu flujo mensual pasa a {flow}."],
    t4roll: ["Turno 4: estilo de vida", "Parada Estilo de vida: pequeñas tentaciones. Nada es obligatorio."],
    t4life: ["¿Una vez o cada mes?", "Un gasto puntual se paga una vez. Una suscripción se suma a tus gastos cada mes y aleja la Puerta {m}."],
    t5roll: ["Turno 5: última tirada", "Último turno de entrenamiento. Después vemos juntos hacia dónde vas."],
    t5gate: ["La Puerta: tu verdadero objetivo", "Cuando tu ingreso pasivo supera tus gastos, la Puerta se abre hacia la Línea 2 · Libertad. Tú: {pas} contra {exp}. Faltan {gap}/mes, unos {k} tratos como este."],
  },
  paid: "Pago cobrado",
  perMonth: "/mes",
  deal: {
    tag: "Trato pequeño", kind: "Activo", title: "Subarriendo del cuarto libre", story: "El futón de un primo se convierte en un pequeño ingreso tranquilo.",
    down: "Entrada", cf: "Flujo pasivo", note: "Cuota", none: "ninguna", safe: "Sin riesgo", cap: "Precio con tope en entrenamiento: {cap} máx.",
    if: "Si compras…", cash: "Caja", passive: "Ingreso pasivo", flow: "Flujo mensual", gap: "Distancia a la Puerta",
    buy: "Comprarlo", decline: "Rechazar",
  },
  life: {
    tag: "Estilo de vida", kind: "Gasto", title: "Altar de suscripciones", story: "Tres apps, dos cajas, una revista. Se renuevan para siempre.",
    pay: "Pagar", then: "Luego cada mes", once: "Puntual", onceEx: "La cena larga: {once} una vez", sub: "Suscripción", subEx: "{now} + {m} × 12",
    year: "en 12 meses", btnPay: "Pagar", btnPass: "Dejarlo pasar",
  },
  nod: { tag: "Social", title: "Un saludo desde el otro lado de la sala", story: "Alguien casi se presenta. El momento pasa." },
  done: {
    kicker: "Tutorial terminado", title: "Te toca", r1: "El dado mueve tu ficha, estación a estación.", r2: "Día de pago: sueldo + pasivo − gastos.",
    r3: "Compra activos, cuidado con las suscripciones, abre la Puerta.", play: "Jugar", replay: "Ver el tutorial otra vez", restore: "Volver a mi partida guardada",
  },
  replay: {
    title: "Ver el tutorial otra vez",
    body: "Empieza una partida de entrenamiento de 5 turnos con el mismo personaje y el mismo sueño. Tu partida actual queda apartada: podrás retomarla al final o desde Opciones.",
    go: "Empezar el entrenamiento", cancel: "Cancelar",
  },
};

export const TRAINING_STRINGS: Record<Lang, TrainingStrings> = { fr, en, es };

export function fill(s: string, vars: Record<string, string | number> = {}): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
