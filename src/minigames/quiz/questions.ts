/**
 * GameFlow v3 — « Quiz en classe » content: Kyoko M.'s lesson and its 5 questions (from the finance quizzes of
 * quizzes.ts), with the handwritten keyword of each answer, the correction and the board formula.
 * The teacher keeps only her initial: name card « Kyoko M. », « Kyoko-sensei » in her speech bubbles (tuning.ts).
 */
import type { Lang } from "@/game/i18n";

type L<T> = Record<Lang, T>;

export interface ClassQuestion {
  q: L<string>;
  choices: L<[string, string, string, string]>;
  answer: 0 | 1 | 2 | 3;
  /** Handwritten keyword for each answer (written in the notebook). */
  kw: L<[string, string, string, string]>;
  /** Correction written above a wrong keyword. */
  fix: L<string>;
  why: L<string>;
  board: L<string>;
}

export const LESSON = {
  title: { en: "Today’s lesson: cash flow", fr: "Leçon du jour : le cash-flow", es: "Lección de hoy: el flujo de caja" } as L<string>,
  text: {
    en: "Cash flow is what is left each month: income minus expenses. An asset raises it, a liability eats it, and an emergency fund protects it.",
    fr: "Le cash-flow, c’est ce qui reste chaque mois : revenus moins dépenses. Un actif l’augmente, un passif le mange, et un fonds d’urgence le protège.",
    es: "El flujo de caja es lo que queda cada mes: ingresos menos gastos. Un activo lo aumenta, un pasivo se lo come y un fondo de emergencia lo protege.",
  } as L<string>,
  plan: {
    en: ["Cash flow", "Liabilities", "Compound interest", "Borrowing for an asset", "The emergency fund"],
    fr: ["Le cash-flow", "Le passif", "Les intérêts composés", "Emprunter pour un actif", "Le fonds d’urgence"],
    es: ["El flujo de caja", "El pasivo", "El interés compuesto", "Pedir prestado para un activo", "El fondo de emergencia"],
  } as L<string[]>,
};

export const CLASS_QUESTIONS: ClassQuestion[] = [
  {
    q: { en: "A month’s cash flow is…", fr: "Le cash-flow d’un mois, c’est…", es: "El flujo de caja de un mes es…" },
    choices: {
      en: ["Only the salary", "Income minus expenses", "What is left on payday", "The price of a dream"],
      fr: ["Seulement le salaire", "Revenus moins dépenses", "Ce qui reste le jour de paie", "Le prix d’un rêve"],
      es: ["Solo el salario", "Ingresos menos gastos", "Lo que queda el día de pago", "El precio de un sueño"],
    },
    answer: 1,
    kw: {
      en: ["salary only", "in − out", "left at payday", "a dream’s price"],
      fr: ["salaire seul", "entrées − sorties", "reste à la paie", "prix d’un rêve"],
      es: ["solo salario", "entradas − salidas", "lo que queda", "precio de un sueño"],
    },
    fix: { en: "→ in − out", fr: "→ entrées − sorties", es: "→ entradas − salidas" },
    why: {
      en: "Cash flow is what is left once the month’s expenses are gone.",
      fr: "Le cash-flow est ce qui reste quand les dépenses du mois sont parties.",
      es: "El flujo de caja es lo que queda cuando se van los gastos del mes.",
    },
    board: { en: "On the board: CF = Salary + Passive − Expenses.", fr: "Au tableau : CF = Salaire + Passif − Dépenses.", es: "En la pizarra: FC = Salario + Pasivo − Gastos." },
  },
  {
    q: { en: "A liability is…", fr: "Un passif, c’est…", es: "Un pasivo es…" },
    choices: {
      en: ["Any object at all", "Something that takes money out every month", "A friend who likes you", "Cash in the bank"],
      fr: ["N’importe quel objet", "Quelque chose qui sort de l’argent chaque mois", "Un ami qui t’aime bien", "Du cash à la banque"],
      es: ["Cualquier objeto", "Algo que saca dinero cada mes", "Un amigo que te aprecia", "Efectivo en el banco"],
    },
    answer: 1,
    kw: {
      en: ["an object", "money out", "a friend", "cash"],
      fr: ["un objet", "sort de l’argent", "un ami", "du cash"],
      es: ["un objeto", "saca dinero", "un amigo", "efectivo"],
    },
    fix: { en: "→ costs me", fr: "→ me coûte", es: "→ me cuesta" },
    why: {
      en: "A liability asks for a payment. An asset pays you.",
      fr: "Un passif demande un paiement. Un actif te paie.",
      es: "Un pasivo pide un pago. Un activo te paga.",
    },
    board: { en: "On the board: Asset = pays me · Liability = costs me.", fr: "Au tableau : Actif = me rapporte · Passif = me coûte.", es: "En la pizarra: Activo = me paga · Pasivo = me cuesta." },
  },
  {
    q: { en: "Compound interest is…", fr: "Les intérêts composés, c’est…", es: "El interés compuesto es…" },
    choices: {
      en: ["Fees the bank hides", "Interest you pay only once", "Returns that earn returns of their own", "Spending the raise the week it lands"],
      fr: ["Des frais que la banque cache", "Des intérêts que tu ne paies qu’une fois", "Des rendements qui produisent eux-mêmes des rendements", "Dépenser l’augmentation la semaine où elle arrive"],
      es: ["Comisiones que el banco esconde", "Intereses que pagas una sola vez", "Rendimientos que generan sus propios rendimientos", "Gastar el aumento la semana en que llega"],
    },
    answer: 2,
    kw: {
      en: ["hidden fees", "paid once", "interest²", "spend it all"],
      fr: ["frais cachés", "payés une fois", "intérêts²", "tout dépenser"],
      es: ["comisiones", "pagado una vez", "interés²", "gastarlo todo"],
    },
    fix: { en: "→ interest²", fr: "→ intérêts²", es: "→ interés²" },
    why: {
      en: "Leave the gain in place, and it goes to work too.",
      fr: "Laisse le gain en place, et il se met aussi au travail.",
      es: "Deja la ganancia en su sitio y también se pone a trabajar.",
    },
    board: {
      en: "A = P(1+r)ⁿ. At 8%, the rule of 72 gives ≈ 9 years to double.",
      fr: "A = P(1+r)ⁿ. À 8 %, la règle de 72 donne ≈ 9 ans pour doubler.",
      es: "A = P(1+r)ⁿ. Al 8 %, la regla del 72 da ≈ 9 años para duplicar.",
    },
  },
  {
    q: { en: "Borrowing to buy an asset can make sense when…", fr: "Emprunter pour acheter un actif peut se tenir quand…", es: "Pedir prestado para comprar un activo puede tener sentido cuando…" },
    choices: {
      en: ["The asset pays more than the loan costs", "The brochure is pretty", "You have no cash flow", "A friend says to hurry"],
      fr: ["L’actif rapporte plus que le prêt ne coûte", "La brochure est jolie", "Tu n’as aucun cash-flow", "Un ami dit de se dépêcher"],
      es: ["El activo deja más de lo que cuesta el préstamo", "El folleto es bonito", "No tienes flujo de caja", "Un amigo dice que te des prisa"],
    },
    answer: 0,
    kw: {
      en: ["ROI > loan", "pretty brochure", "zero cash flow", "hurry up"],
      fr: ["ROI > prêt", "jolie brochure", "zéro cash-flow", "se dépêcher"],
      es: ["ROI > préstamo", "folleto bonito", "flujo cero", "darse prisa"],
    },
    fix: { en: "→ ROI > loan", fr: "→ ROI > prêt", es: "→ ROI > préstamo" },
    why: {
      en: "Good debt is a monthly payment smaller than what the asset sends back.",
      fr: "Une bonne dette est une mensualité plus petite que ce que l’actif renvoie.",
      es: "Una buena deuda es una cuota menor que lo que el activo devuelve.",
    },
    board: { en: "Compare the ROI (gain / cost) to the loan rate.", fr: "Compare le ROI (gain / coût) au taux du prêt.", es: "Compara el ROI (ganancia / coste) con el tipo del préstamo." },
  },
  {
    q: { en: "An emergency fund is cash kept for…", fr: "Un fonds d’urgence, c’est du cash gardé pour…", es: "Un fondo de emergencia es dinero guardado para…" },
    choices: {
      en: ["The next pair of sneakers", "A friend’s stock tip", "A bill you did not see coming", "Decorating before the rent"],
      fr: ["La prochaine paire de baskets", "Le tuyau boursier d’un ami", "Une facture que tu n’avais pas prévue", "Décorer avant le loyer"],
      es: ["Las próximas zapatillas", "El soplo bursátil de un amigo", "Una factura que no esperabas", "Decorar antes del alquiler"],
    },
    answer: 2,
    kw: {
      en: ["sneakers", "stock tip", "the unexpected", "decor"],
      fr: ["baskets", "tuyau boursier", "l’imprévu", "la déco"],
      es: ["zapatillas", "soplo bursátil", "lo imprevisto", "la deco"],
    },
    fix: { en: "→ the unexpected", fr: "→ l’imprévu", es: "→ lo imprevisto" },
    why: {
      en: "The fund is for surprises, not for wants.",
      fr: "Le fonds sert à la surprise, pas à l’envie.",
      es: "El fondo es para las sorpresas, no para los caprichos.",
    },
    board: { en: "On the board: set aside first, wants after.", fr: "Au tableau : de côté d’abord, les envies ensuite.", es: "En la pizarra: primero apartar, luego los caprichos." },
  },
];

/** SKILLS.md §11.2 — creative bonus question (Creativity ≥ CLASS_QUIZ.creativeAt): every answer is accepted, the best scores 2. */
export const CREATIVE_QUESTION = {
  q: { en: "Bonus: how would you bring in $100 more a month?", fr: "Bonus : comment ferais-tu entrer 100 $ de plus par mois ?", es: "Bonus: ¿cómo harías entrar 100 $ más al mes?" } as L<string>,
  choices: {
    en: ["Rent out the spare room to a student", "Sell my drawings online", "Pick up extra shifts"],
    fr: ["Louer la chambre en trop à un étudiant", "Vendre mes dessins en ligne", "Faire des heures en plus"],
    es: ["Alquilar el cuarto libre a un estudiante", "Vender mis dibujos en internet", "Hacer horas extra"],
  } as L<[string, string, string]>,
  /** Grade of each answer: 2 = best (an asset that pays every month), 1 = fine. */
  grade: [2, 1, 1] as const,
  why: {
    en: "All three work. The room keeps paying while you sleep: that is an asset.",
    fr: "Les trois marchent. La chambre continue de payer pendant que tu dors : c’est un actif.",
    es: "Las tres funcionan. El cuarto sigue pagando mientras duermes: eso es un activo.",
  } as L<string>,
};
