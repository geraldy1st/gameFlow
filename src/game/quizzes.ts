import type { Lang } from "./i18n";

export const PASS_AT = 4;

export interface QuizQuestion {
  q: Record<Lang, string>;
  choices: Record<Lang, [string, string, string, string]>;
  answer: 0 | 1 | 2 | 3;
  why: Record<Lang, string>;
}

export interface QuizDef {
  id: string;
  title: Record<Lang, string>;
  questions: QuizQuestion[];
}

const en = "en" as const;
const fr = "fr" as const;
const es = "es" as const;

function q(
  question: [string, string, string],
  choices: [string, string, string, string][],
  answer: 0 | 1 | 2 | 3,
  why: [string, string, string],
): QuizQuestion {
  return {
    q: { [en]: question[0], [fr]: question[1], [es]: question[2] },
    choices: {
      [en]: choices[0] as [string, string, string, string],
      [fr]: choices[1] as [string, string, string, string],
      [es]: choices[2] as [string, string, string, string],
    },
    answer,
    why: { [en]: why[0], [fr]: why[1], [es]: why[2] },
  };
}

export const QUIZZES: QuizDef[] = [
  {
    id: "cash",
    title: { en: "The paycheck", fr: "La paie", es: "La nómina" },
    questions: [
      q(
        ["Cash flow for a month is…", "Le cash-flow d’un mois, c’est…", "El flujo de caja de un mes es…"],
        [
          ["Income minus expenses", "Only the salary", "The price of a dream", "Whatever is left on payday"],
          ["Revenus moins dépenses", "Seulement le salaire", "Le prix d’un rêve", "Ce qui reste le jour de paie"],
          ["Ingresos menos gastos", "Solo el sueldo", "El precio de un sueño", "Lo que queda el día de cobro"],
        ],
        0,
        [
          "Cash flow is what stays after the month’s expenses leave.",
          "Le cash-flow est ce qui reste quand les dépenses du mois sont parties.",
          "El flujo de caja es lo que queda cuando salen los gastos del mes.",
        ],
      ),
      q(
        ["A liability is…", "Un passif, c’est…", "Un pasivo es…"],
        [
          ["Something that takes money out every month", "Any object you can touch", "A friend who likes you", "Cash sitting in the bank"],
          ["Quelque chose qui sort de l’argent chaque mois", "N’importe quel objet", "Un ami qui t’aime bien", "Du cash à la banque"],
          ["Algo que saca dinero cada mes", "Cualquier objeto", "Un amigo que te aprecia", "Efectivo en el banco"],
        ],
        0,
        [
          "A liability asks for a payment. An asset pays you.",
          "Un passif demande un paiement. Un actif te paie.",
          "Un pasivo pide un pago. Un activo te paga.",
        ],
      ),
      q(
        ["If expenses are higher than income…", "Si les dépenses dépassent les revenus…", "Si los gastos superan los ingresos…"],
        [
          ["The month ends poorer than it started", "You are diversified", "The tax office sends a gift", "Passive income has begun"],
          ["Le mois finit plus pauvre qu’il n’a commencé", "Tu es diversifié", "Le fisc t’offre un cadeau", "Le revenu passif a commencé"],
          ["El mes acaba más pobre de lo que empezó", "Estás diversificado", "Hacienda te manda un regalo", "Empezó el ingreso pasivo"],
        ],
        0,
        [
          "More going out than coming in is a negative cash flow.",
          "Plus de sorties que d’entrées, c’est un cash-flow négatif.",
          "Sale más de lo que entra: flujo de caja negativo.",
        ],
      ),
      q(
        ["An emergency fund is cash kept for…", "Un fonds d’urgence, c’est du cash gardé pour…", "Un fondo de emergencia es efectivo guardado para…"],
        [
          ["A bill you did not plan", "The next pair of sneakers", "A friend’s stock tip", "Decorating before rent"],
          ["Une facture que tu n’avais pas prévue", "La prochaine paire de baskets", "Le tuyau boursier d’un ami", "Décorer avant le loyer"],
          ["Una factura que no planeaste", "El próximo par de zapatillas", "El soplo bursátil de un amigo", "Decorar antes del alquiler"],
        ],
        0,
        [
          "The fund is for the surprise, not the want.",
          "Le fonds sert à la surprise, pas à l’envie.",
          "El fondo es para la sorpresa, no para el antojo.",
        ],
      ),
      q(
        ["Paying yourself first means…", "Se payer en premier, c’est…", "Pagarte primero significa…"],
        [
          ["Setting savings aside before the fun spending", "Asking the boss to pay early", "Skipping rent", "Borrowing so the month looks full"],
          ["Mettre l’épargne de côté avant les envies", "Demander au patron de payer plus tôt", "Sauter le loyer", "Emprunter pour que le mois ait l’air plein"],
          ["Apartar el ahorro antes de los gustos", "Pedirle al jefe que pague antes", "Saltarte el alquiler", "Pedir prestado para que el mes parezca lleno"],
        ],
        0,
        [
          "Savings leave first. Spending gets what remains.",
          "L’épargne part d’abord. Les envies ont ce qui reste.",
          "El ahorro sale primero. El gasto se queda con el resto.",
        ],
      ),
    ],
  },
  {
    id: "asset",
    title: { en: "The asset", fr: "L’actif", es: "El activo" },
    questions: [
      q(
        ["An asset is…", "Un actif, c’est…", "Un activo es…"],
        [
          ["Something that puts money in your pocket", "Anything expensive", "A salary", "A dinner you enjoyed"],
          ["Quelque chose qui met de l’argent dans ta poche", "N’importe quoi de cher", "Un salaire", "Un dîner que tu as aimé"],
          ["Algo que mete dinero en tu bolsillo", "Cualquier cosa cara", "Un sueldo", "Una cena que disfrutaste"],
        ],
        0,
        [
          "Price is not the test. Cash flowing in is.",
          "Le prix n’est pas le test. L’argent qui entre, si.",
          "El precio no es la prueba. El dinero que entra, sí.",
        ],
      ),
      q(
        ["A down payment is…", "Un apport, c’est…", "Un pago inicial es…"],
        [
          ["Cash you put in before the loan", "The monthly note", "A tax", "Interest the bank forgot"],
          ["Le cash que tu avances avant le prêt", "La mensualité", "Un impôt", "Des intérêts que la banque a oubliés"],
          ["El efectivo que pones antes del préstamo", "La cuota mensual", "Un impuesto", "Intereses que el banco olvidó"],
        ],
        0,
        [
          "The down payment is your cash. The note is the bank’s.",
          "L’apport est ton cash. La mensualité est celle de la banque.",
          "El inicial es tu efectivo. La cuota es del banco.",
        ],
      ),
      q(
        ["Passive income is money that…", "Un revenu passif, c’est de l’argent qui…", "El ingreso pasivo es dinero que…"],
        [
          ["Arrives without trading another hour of your shift", "Only comes from a second job", "Is always tax-free", "Replaces every expense the day you buy one thing"],
          ["Arrive sans échanger une heure de plus de ton service", "Vient seulement d’un second emploi", "N’est jamais imposé", "Remplace toutes les dépenses le jour où tu achètes une chose"],
          ["Llega sin cambiar otra hora de tu turno", "Solo viene de un segundo empleo", "Nunca paga impuestos", "Reemplaza todos los gastos el día que compras una cosa"],
        ],
        0,
        [
          "The asset works. You do not have to clock in for that dollar.",
          "L’actif travaille. Tu n’as pas à pointer pour ce dollar.",
          "El activo trabaja. No tienes que fichar por ese dinero.",
        ],
      ),
      q(
        ["Borrowing to buy an asset can make sense when…", "Emprunter pour acheter un actif peut se tenir quand…", "Pedir prestado para comprar un activo tiene sentido cuando…"],
        [
          ["The asset pays more than the loan costs", "The brochure is pretty", "A friend says hurry", "You have no cash flow at all"],
          ["L’actif rapporte plus que le prêt ne coûte", "La brochure est jolie", "Un ami dit de se dépêcher", "Tu n’as aucun cash-flow"],
          ["El activo paga más de lo que cuesta el préstamo", "El folleto es bonito", "Un amigo dice que te apures", "No tienes flujo de caja"],
        ],
        0,
        [
          "Good debt is a note smaller than the cash the asset sends back.",
          "Une bonne dette est une mensualité plus petite que ce que l’actif renvoie.",
          "Una buena deuda es una cuota menor que el dinero que devuelve el activo.",
        ],
      ),
      q(
        ["Selling for more than you paid can still…", "Vendre plus cher que tu n’as payé peut encore…", "Vender por más de lo que pagaste aún puede…"],
        [
          ["Leave a tax on the gain", "Be free of every consequence", "Turn the asset into a salary", "Erase the down payment from history"],
          ["Laisser un impôt sur le gain", "Être sans aucune conséquence", "Transformer l’actif en salaire", "Effacer l’apport de l’histoire"],
          ["Dejar un impuesto sobre la ganancia", "Quedar libre de toda consecuencia", "Convertir el activo en sueldo", "Borrar el pago inicial de la historia"],
        ],
        0,
        [
          "A gain can be taxed. Read that before you celebrate.",
          "Un gain peut être imposé. Lis ça avant de fêter.",
          "Una ganancia puede tributar. Léelo antes de celebrar.",
        ],
      ),
    ],
  },
  {
    id: "risk",
    title: { en: "The long game", fr: "Le long terme", es: "El largo plazo" },
    questions: [
      q(
        ["Diversification means…", "Diversifier, c’est…", "Diversificar significa…"],
        [
          ["Not staking the whole month on one bet", "Buying the most expensive thing", "Owning one perfect stock", "Ignoring every offer"],
          ["Ne pas jouer tout le mois sur un seul pari", "Acheter le plus cher", "Avoir une seule action parfaite", "Ignorer toutes les offres"],
          ["No jugarte el mes entero a una sola apuesta", "Comprar lo más caro", "Tener una sola acción perfecta", "Ignorar todas las ofertas"],
        ],
        0,
        [
          "Several smaller bets survive one bad one.",
          "Plusieurs petits paris survivent à un mauvais.",
          "Varias apuestas pequeñas sobreviven a una mala.",
        ],
      ),
      q(
        ["Opportunity cost is…", "Le coût d’opportunité, c’est…", "El costo de oportunidad es…"],
        [
          ["What you give up by choosing this instead of that", "The sticker price", "A late fee", "A tip from a friend"],
          ["Ce à quoi tu renonces en choisissant ceci plutôt que cela", "Le prix affiché", "Des frais de retard", "Un tuyau d’un ami"],
          ["A lo que renuncias al elegir esto en vez de aquello", "El precio de la etiqueta", "Un recargo por mora", "Un soplo de un amigo"],
        ],
        0,
        [
          "Every yes is a no to something else.",
          "Chaque oui est un non à autre chose.",
          "Cada sí es un no a otra cosa.",
        ],
      ),
      q(
        ["Compounding is…", "Les intérêts composés, c’est…", "El interés compuesto es…"],
        [
          ["Returns that start earning their own returns", "Spending the raise the week it arrives", "A fee the bank hides", "Interest you only pay once"],
          ["Des rendements qui produisent eux-mêmes des rendements", "Dépenser l’augmentation la semaine où elle arrive", "Des frais que la banque cache", "Des intérêts que tu ne paies qu’une fois"],
          ["Rendimientos que empiezan a generar sus propios rendimientos", "Gastar el aumento la semana que llega", "Una comisión que el banco esconde", "Intereses que pagas una sola vez"],
        ],
        0,
        [
          "Leave the gain in place and it starts working too.",
          "Laisse le gain en place, et il se met aussi au travail.",
          "Deja la ganancia quieta y ella también se pone a trabajar.",
        ],
      ),
      q(
        ["A higher promised return usually comes with…", "Un rendement promis plus haut vient en général avec…", "Un rendimiento prometido más alto suele venir con…"],
        [
          ["More risk of losing the money", "A guarantee", "Lower expenses forever", "No need to read the terms"],
          ["Plus de risque de perdre l’argent", "Une garantie", "Des dépenses plus basses pour toujours", "Aucune raison de lire les clauses"],
          ["Más riesgo de perder el dinero", "Una garantía", "Gastos más bajos para siempre", "Ninguna razón para leer las cláusulas"],
        ],
        0,
        [
          "If the number is exciting, ask what can go wrong.",
          "Si le chiffre est excitant, demande ce qui peut mal tourner.",
          "Si el número emociona, pregunta qué puede salir mal.",
        ],
      ),
      q(
        ["When a friend tips a stock or a shop, the sensible move is…", "Quand un ami souffle une action ou une boutique, le geste sensé est…", "Cuando un amigo sopla una acción o una tienda, lo sensato es…"],
        [
          ["Read the numbers before you buy", "Buy before the sentence ends", "Mortgage the rent", "Ignore every friend forever"],
          ["Lire les chiffres avant d’acheter", "Acheter avant la fin de la phrase", "Hypothéquer le loyer", "Ignorer tous les amis pour toujours"],
          ["Leer los números antes de comprar", "Comprar antes de que acabe la frase", "Hipotecar el alquiler", "Ignorar a todos los amigos para siempre"],
        ],
        0,
        [
          "A tip is a door. The ledger still has to agree.",
          "Un tuyau est une porte. Le livre doit encore être d’accord.",
          "Un soplo es una puerta. El libro todavía tiene que estar de acuerdo.",
        ],
      ),
    ],
  },
];
