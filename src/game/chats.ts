import type { Lang } from "./i18n";

export interface ChatLine {
  who: "you" | "them";
  text: Record<Lang, string>;
}

export interface ChatScript {
  id: string;
  topic: string;
  lines: ChatLine[];
}

const line = (who: "you" | "them", en: string, fr: string, es: string): ChatLine => ({
  who,
  text: { en, fr, es },
});

export const CHATS: ChatScript[] = [
  {
    id: "rent",
    topic: "Finance",
    lines: [
      line("them", "I almost signed a bigger room. Then I wrote the rent on paper and the room got smaller.", "J’ai failli signer une plus grande pièce. J’ai écrit le loyer sur papier, et la pièce a rapetissé.", "Casi firmo una habitación más grande. Escribí el alquiler en un papel y la habitación se encogió."),
      line("you", "The pretty number is the one that fits after food, not before.", "Le joli chiffre, c’est celui qui tient encore après la nourriture.", "El número bonito es el que cabe después de la comida, no antes."),
      line("them", "I keep a jar for the month and a jar I am not allowed to touch. The second one is the whole trick.", "J’ai un bocal pour le mois et un bocal que je n’ai pas le droit de toucher. Le deuxième, c’est tout le truc.", "Tengo un frasco para el mes y otro que no puedo tocar. El segundo es todo el truco."),
      line("you", "Then the dream can wait without starving. That still counts as a plan.", "Alors le rêve peut attendre sans mourir de faim. Ça compte quand même comme un plan.", "Entonces el sueño puede esperar sin pasar hambre. Eso también es un plan."),
    ],
  },
  {
    id: "fear",
    topic: "Finance",
    lines: [
      line("you", "I check the balance when I’m already scared. It never helps.", "Je regarde le solde quand j’ai déjà peur. Ça n’aide jamais.", "Miro el saldo cuando ya tengo miedo. Nunca ayuda."),
      line("them", "Look at it on a calm morning, with tea, like a menu. Fear reads every number as a threat.", "Regarde-le un matin calme, avec un thé, comme un menu. La peur lit chaque chiffre comme une menace.", "Míralo en una mañana tranquila, con té, como un menú. El miedo lee cada cifra como una amenaza."),
      line("you", "A menu I can refuse. A threat I just pay.", "Un menu, je peux le refuser. Une menace, je la paie.", "Un menú lo puedo rechazar. Una amenaza, la pago."),
      line("them", "Exactly. The ledger is not your parent. It is a list.", "Exactement. Le livre n’est pas ton parent. C’est une liste.", "Exacto. El libro no es tu padre. Es una lista."),
    ],
  },
  {
    id: "compare",
    topic: "Psychology",
    lines: [
      line("them", "I saw someone’s new counter today and felt late to my own life.", "J’ai vu le nouveau comptoir de quelqu’un, et je me suis senti en retard dans ma propre vie.", "Vi el mostrador nuevo de alguien y me sentí tarde en mi propia vida."),
      line("you", "You saw the counter. Not the loan under it.", "Tu as vu le comptoir. Pas le prêt dessous.", "Viste el mostrador. No el préstamo debajo."),
      line("them", "That’s rude and useful.", "C’est impoli, et utile.", "Eso es grosero y útil."),
      line("you", "Stay with your month. Theirs is a poster.", "Reste avec ton mois. Le leur est une affiche.", "Quédate con tu mes. El de ellos es un cartel."),
    ],
  },
  {
    id: "no",
    topic: "Psychology",
    lines: [
      line("you", "I say yes, then I resent the evening I gave away.", "Je dis oui, puis j’en veux à la soirée que j’ai donnée.", "Digo que sí, y luego le guardo rencor a la noche que regalé."),
      line("them", "A small no is cheaper than a long sulk. People survive it.", "Un petit non coûte moins cher qu’une longue bouderie. Les gens y survivent.", "Un no pequeño sale más barato que un enfado largo. La gente sobrevive."),
      line("you", "I rehearse the no in the stairwell and still smile at the door.", "Je répète le non dans l’escalier, et je souris quand même à la porte.", "Ensayo el no en la escalera y aun así sonrío en la puerta."),
      line("them", "Then practice on me. I’ll pretend to be disappointed for three seconds.", "Alors entraîne-toi sur moi. Je ferai semblant d’être déçu pendant trois secondes.", "Entonces practica conmigo. Fingiré decepción durante tres segundos."),
    ],
  },
  {
    id: "sleep",
    topic: "Wellbeing",
    lines: [
      line("them", "I worked past midnight and called it ambition. It was just a bad trade.", "J’ai travaillé après minuit et j’ai appelé ça de l’ambition. C’était juste un mauvais échange.", "Trabajé pasada la medianoche y lo llamé ambición. Era solo un mal trato."),
      line("you", "Sleep is the one asset that doesn’t send a bill.", "Le sommeil est le seul actif qui n’envoie pas de facture.", "Dormir es el único activo que no manda una factura."),
      line("them", "It still charges you, if you skip it. The fee arrives as a short temper.", "Il te le fait quand même payer, si tu le sautes. Les frais arrivent sous forme de mauvaise humeur.", "Igual te lo cobra si lo saltas. La cuota llega como mal humor."),
      line("you", "Then tonight the ledger closes when the light does.", "Alors ce soir le livre se ferme avec la lumière.", "Entonces esta noche el libro se cierra cuando se apaga la luz."),
    ],
  },
  {
    id: "walk",
    topic: "Wellbeing",
    lines: [
      line("you", "I walked the long way home and bought nothing. It felt illegal.", "J’ai pris le long chemin et je n’ai rien acheté. Ça m’a semblé illégal.", "Volví por el camino largo y no compré nada. Parecía ilegal."),
      line("them", "A walk with no errand is how the body remembers it isn’t a wallet.", "Une marche sans course, c’est comme le corps se rappelle qu’il n’est pas un portefeuille.", "Un paseo sin recado es cómo el cuerpo recuerda que no es una cartera."),
      line("you", "My head got quieter after the bridge.", "Ma tête s’est calmée après le pont.", "La cabeza se me calmó después del puente."),
      line("them", "Keep the bridge. Don’t optimize it.", "Garde le pont. Ne l’optimise pas.", "Quédate con el puente. No lo optimices."),
    ],
  },
  {
    id: "useful",
    topic: "Love",
    lines: [
      line("them", "I think people keep me because I am useful. I want to be kept on a quiet Tuesday.", "Je crois qu’on me garde parce que je suis utile. Je veux qu’on me garde un mardi calme.", "Creo que me quieren porque soy útil. Quiero que me quieran un martes tranquilo."),
      line("you", "Useful is a job. Tuesday is a person.", "Utile, c’est un travail. Mardi, c’est une personne.", "Útil es un trabajo. El martes es una persona."),
      line("them", "Say that again when I try to fix your whole month.", "Redis-le quand j’essaierai de réparer tout ton mois.", "Repítelo cuando intente arreglarte el mes entero."),
      line("you", "I will. You can sit. The month can be messy and you can stay.", "Je le dirai. Tu peux t’asseoir. Le mois peut être en désordre, et toi rester.", "Lo diré. Puedes sentarte. El mes puede estar desordenado y tú quedarte."),
    ],
  },
  {
    id: "sport",
    topic: "Sport",
    lines: [
      line("you", "I ran until my thoughts got bored and left.", "J’ai couru jusqu’à ce que mes pensées s’ennuient et partent.", "Corrí hasta que mis pensamientos se aburrieron y se fueron."),
      line("them", "That’s the only meeting I don’t take notes in.", "C’est la seule réunion où je ne prends pas de notes.", "Es la única reunión en la que no tomo notas."),
      line("you", "My lungs still send an invoice.", "Mes poumons envoient quand même une facture.", "Mis pulmones igual mandan la factura."),
      line("them", "Pay it in water, not in guilt. Same time tomorrow if you want company.", "Paie-la en eau, pas en culpabilité. Même heure demain, si tu veux de la compagnie.", "Págala con agua, no con culpa. Misma hora mañana, si quieres compañía."),
    ],
  },
];

export function chatText(lang: Lang, row: ChatLine): string {
  return row.text[lang] || row.text.en;
}
