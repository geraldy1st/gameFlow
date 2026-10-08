# Mode Entraînement : « Ligne d'apprentissage », spec moteur

**Pour :** Ash (engine.ts / data.ts / GameFlow.tsx)
**Base :** le code de `geraldy1st/gameFlow` tel que cloné (lecture seule). Les noms de fonctions et de constantes cités existent tous dans le dépôt, sauf ceux marqués **NOUVEAU**.
**Mockup de référence :** `tutorial/index.html`. Le trajet scripté est dans `shots/tutorial-board.png`.

---

## 0. Objectif et principe

- Cinq tours guidés sur `GRIND` (« La Corvée »). Pendant ces cinq tours, chaque tirage aléatoire est remplacé par un script : dé, case d'arrivée et carte.
- Au tour 6, le moteur de la partie d'entraînement reprend les règles normales ; l'UI la jette alors (« Jouer ») et ramène la vraie partie, intacte (voir §8). La partie d'entraînement a sa propre graine.
- La logique du mode tient dans **une seule garde** : `s.training` (voir §1). Toutes les fonctions existantes restent intactes quand `s.training` vaut `null`, donc aucune régression en partie normale.
- Le mode n'a pas d'écran à part. C'est l'écran de jeu normal plus l'overlay de coachmarks (mockup). L'overlay ne fait que lire l'état ; c'est le moteur qui garantit l'absence de risque.

---

## 1. État et constantes (data.ts / engine.ts)

```ts
// data.ts — NOUVEAU
export const TRAINING_TURNS = 5;
export const TRAINING_START = 21;           // GRIND[21] = health : case de départ, aucun effet au départ (on n'y « atterrit » pas)
export const TRAINING_DICE = [2, 1, 1, 1, 1] as const;
//   T1 : 21 → 22 (small, juste traversée) → 23 rest « Charity »   (case calme)
//   T2 : 23 → 0  payday                                          (Jour de paie)
//   T3 : 0  → 1  small                                           (petite affaire)
//   T4 : 1  → 2  lifestyle                                       (train de vie)
//   T5 : 2  → 3  social                                          (case calme puis coachmark Porte)
export const TRAINING_DEAL_CAP = 600;       // acompte max d'une petite affaire en entraînement
export const TRAINING_SPEND_CAP = 200;      // dépense ponctuelle max (hors abonnement)
export const TRAINING_MONTHLY_CAP = 70;     // = LIFESTYLE "subs".monthly, seul abonnement autorisé
export const TRAINING_CAREER = "barista";   // carrière imposée (cf. §2)
export const TUTORIAL_DONE_KEY = TUTORIAL_KEY; // on réutilise "gameflow-tutorial-seen" (voir §8)

// engine.ts — GameState NOUVEAU champ optionnel
training: null | {
  turn: number;          // 1..TRAINING_TURNS, avancé dans advance()/READY pour le joueur en entraînement
  player: number;        // index du joueur concerné (hot-seat, §9)
  skipped: boolean;      // true après « Passer » ; s.training est remis à null au début du tour suivant
};
```

`hydrate()` : il faut ajouter `training: saved.training ?? null`. Une ancienne sauvegarde charge alors en partie normale. Rien à faire dans `hydratePlayer()`, qui n'a besoin d'aucun nouveau champ joueur.

---

## 2. Création de partie : `createMatch`

Aujourd'hui `createMatch(picks, seed, muted)` tire la carrière au hasard parmi les `CAREERS` qui ont `starting: true`. Pour que les montants du tutoriel soient fixes et testables, on ajoute un paramètre optionnel :

```ts
createMatch(picks, seed, muted, opts?: { training?: boolean })
```

Si `opts.training` est vrai, pour le **joueur 1** :
- `careerId = TRAINING_CAREER` (barista : salaire 3 100, taxes 420, loyer 980, nourriture 360, transport 140, autres 160) ;
- `cash = Math.round(3100 * 0.55) = 1 705`, la formule actuelle reste inchangée ;
- `position = TRAINING_START` (21) au lieu de 11 ;
- `state.training = { turn: 1, player: 0, skipped: false }`.

Le premier `rand(s)` reste consommé pour la carrière, même s'il est ignoré, afin que le `seed` suive la même trajectoire qu'en partie normale.

`startCard` reste affichée. L'overlay la remplace visuellement par le coachmark T1 : le mockup démarre en phase `idle`. Côté moteur, on peut garder la carte `start` et son choix `ok` ; la reprise se fait après.

Chiffres de départ de Aoi, tirés de `statement()` :

| Poste | Valeur |
|---|---|
| Salaire | 3 100 $ |
| Dépenses (`baseExpenses`) | 420 + 980 + 360 + 140 + 160 = **2 060 $** |
| Passif | 0 $ |
| `cashFlow` | **+1 040 $/mois** |
| Caisse | **1 705 $** |
| Vitals (`startingVitals("aoi")`) | content 64, social 58, mind 52, luck 48 |

---

## 3. Dé contraint : `doRoll`

```ts
function doRoll(s) {
  ...
  const t = trainingFor(s);                       // NOUVEAU : s.training si actif pour cur(s), sinon null
  const r = rand(s.seed);                         // consommé quand même → seed stable
  const die = t ? TRAINING_DICE[t.turn - 1] : 1 + Math.floor(r.value * 6);
  ...
}
```

- On garde le dé **forcé** et on écarte l'idée d'un dé pondéré : avec un dé pondéré on ne garantirait ni la case ni les montants. L'animation du dé reste la même ; seule la valeur est imposée.
- Si `p.position !== expected[t.turn - 1]` (par exemple sauvegarde corrompue ou retour en arrière), on sort du mode : `s.training = null` et on log `"Training ended."`. Le moteur n'essaie pas de deviner.
- `collect()` reste inchangé. Au T2, l'arrivée sur la case 0 (`isStipend` vaut vrai pour `payday`) verse `statement(p).cashFlow` = **+1 040**, et la caisse passe de 1 705 à **2 745**.

---

## 4. Cases et cartes autorisées par tour : `landing` → `buildSpace`

On ajoute une garde au début de `buildSpace(s, kind)` :

```ts
const t = trainingFor(s);
if (t) return trainingCard(s, kind, t.turn);      // NOUVEAU, n'appelle que des fabriques existantes
```

| Tour | Case (index GRIND / `SpaceKind`) | Carte servie | Règle |
|---|---|---|---|
| 1 | 23 `rest` (« Charity ») | `restCard()`, choix réduits à `ghost("Just rest", "rest")` | Le choix « Give $200 » est masqué, sinon −200 et −40/mois fausseraient la suite. `resolve` existant : `brokeTurns: 0, skipTurns: 0`. |
| 2 | 0 `payday` | carte `payday` existante (`buildSpace`, branche `kind === "payday"`) | Aucun changement. `passedPay` = 1 040. |
| 3 | 1 `small` | `dealCard(p, dealById("room"), "small")` | Voir §5. On **contourne** `drawDeal` : pas de `drawId`, pas de `twoDealCard` même avec le trait Connector, et `s.decks.small` reste intact. |
| 4 | 2 `lifestyle` | `lifestyleCard`-like construite sur `LIFESTYLE` `"subs"` | Voir §6. Pas de `drawId` sur `decks.life`. |
| 5 | 3 `social` | coquille existante « A nod across the room » de `socialCard` (`payload: {t:"ok"}`) | On **ne** passe **pas** par `socialCard` : elle consomme `rand` et peut servir `meetCard`. Le coachmark Porte s'affiche juste après la carte. |

Défense en profondeur : si `kind` ne correspond pas au tableau (cas qui ne devrait jamais arriver vu le dé forcé), `trainingCard` renvoie la carte de repli « A quiet square » de `buildSpace`, avec `payload: {t:"ok"}`.

### Exclus pendant l'entraînement

Ces cartes ne peuvent pas apparaître, puisque le trajet ne passe jamais par leur case. `trainingCard` les **refuse** quand même explicitement :

- `big` / `premium` (`drawDeal(s,"big"|"premium")`, `BIG_DEALS` : acompte de 2 800 à 8 000) : la Grande affaire est exclue.
- `market` (`marketCard`, `applyMarket` : crash −200, rumor 8 % de la caisse, tenant −150, rates −100) et `boom` (`boomCard`, `applyBoom`) : pas de Krach ni de Boom, pas de grosses variations de marché.
- `tax` (`taxCard` : max(100, 10 % de la caisse)).
- `health` (`healthCard` : payer 320 ou passer un tour). La case 21 sert de départ mais n'est jamais « atterrie ».
- `love` / `family` (`loveCard`, `familyCard`, `CHILD_COST` = 480) : ni couple ni enfants.
- `career` (`careerCard`) et `mentor` (`mentorCard`) : ils changeraient le salaire de référence du tutoriel.
- `legacy`, `dream`, `philanthropy` (`giveCard` propose « Borrow $1,000 »), ainsi que tout le contenu `VENTURE` / `FREEDOM`.
- `meetCard` et les actes d'amis (`friendAct`) : un ami ajouterait loyauté, traits et coûts (Omar, loyer −180, etc.).

---

## 5. Petite affaire d'entraînement (T3)

**Choix :** `SMALL_DEALS` `"room"` « Spare-room sublet ». Coût 500, acompte 500, `payment: 0`, cashFlow +340, `passive: true`, immobilier (`isRealty`).

Critères du filtre, si Ash préfère un tirage dans un pool plutôt qu'un id figé :

```ts
const TRAINING_SMALL = SMALL_DEALS.filter(d =>
  d.passive && d.payment === 0 && d.down <= TRAINING_DEAL_CAP && d.down <= p.cash * 0.25);
// avec 2 745 $ en caisse : room (500/+340), stickers (400/+160), zine (250/+140) → on prend "room" (meilleur ratio, chiffres ronds)
```

**Plafond (`TRAINING_DEAL_CAP` = 600) :** dans `price()`, on applique ensuite `down = Math.min(down, TRAINING_DEAL_CAP)`. On garde les effets d'`Investor`, `nextDownCut` et `nextCfBoost`, impossibles au T3 de toute façon. `clothDelta(p.outfit)` vaut 0 avec la tenue `"jeans"` de départ, donc le cashFlow reste 340.

**Le badge « Sans risque » est garanti par le moteur :**
- `afford` est toujours vrai (2 745 ≥ 500), donc le choix `borrow` n'est jamais construit dans `dealCard` ;
- `payment === 0`, donc pas de ligne « Monthly note » ni de `liabilities` dans `takeDeal`.

Choix proposés : `"accept"` (« L'acheter ») ou `"decline"` (« Refuser »). Les deux passent par `resolveDeal`, déjà existant.

| | Avant | Après achat |
|---|---|---|
| Caisse | 2 745 | **2 245** |
| Passif | 0 | **+340** |
| Dépenses | 2 060 | 2 060 |
| `cashFlow` | +1 040 | **+1 380** |
| Écart à la Porte (dépenses − passif) | 2 060 | **1 720** |

---

## 6. Train de vie d'entraînement (T4)

On sert `LIFESTYLE` `"subs"` « Subscription shrine » : **40 $ maintenant, puis +70 $/mois** via `expenseMods`, exactement comme `resolveSpend`. La carte ajoute une ligne de comparaison avec la dépense ponctuelle `"dinner"` (180 $, `amount` sans `monthly`) :

- ponctuel : 180 $, une seule fois ;
- abonnement : 40 + 70 × 12 = **880 $ sur 12 mois**, et la Porte recule de 70 $.

Plafonds : `spendAmount` ≤ `TRAINING_SPEND_CAP` (200) et `monthly` ≤ `TRAINING_MONTHLY_CAP` (70). Le trait Party-goer (+15 %) est impossible ici, faute d'ami.

Les deux choix sont autorisés. `"pay"` coûte −40 et fait passer les dépenses à 2 130. `"decline"` ne change rien. Le mockup suit le chemin « Laisser passer ». Le coachmark T5 calcule l'écart à partir de l'état réel : 1 720 ou 1 790.

---

## 7. Garde-fous : jamais fauché, jamais de game over

Pendant `s.training` actif :

1. **Pas de prêt.** On masque le bouton Emprunter de l'UI (action `BORROW`). `doBorrow` renvoie `s` sans rien faire. `dealCard` et `lifestyleCard` ne construisent jamais `gold("Borrow …")` : c'est déjà le cas puisque la caisse suffit, mais on ajoute une garde explicite.
2. **Plancher de caisse.** Dans `finish()`, au lieu de `if (cur(n).cash < 0) loanCard(false)`, on fait `if (training) n = withP(n, p => ({...p, cash: Math.max(0, p.cash)}))`. Ce cas est inatteignable avec le script ; la garde ne sert qu'à la défense.
3. Pas de `brokeTurns`, de `skipTurns`, de `repossess()` ni de `doBreathe`. La phase `"broke"` est impossible.
4. `checkMilestone()` est sans effet (niveau 1, piste grind), donc pas de victoire non plus.
5. **Bien-être minimal.** Dans `beginTurn()`, pendant l'entraînement, on **ne** fait **pas** `driftVitals(...)` et on n'applique ni la décroissance `calm` ni la décroissance `loyalty` (`turns % 3`). On incrémente quand même `p.turns`, pour que le compteur de tours reste juste. Le seul effet visible sur l'humeur est `reaction` (happy au Jour de paie, proud à l'achat, stressed si on paie l'abonnement) : il est cosmétique et sans conséquence.
6. **Plafonds récapitulés :**

| Variable | Plafond | Référence moteur |
|---|---|---|
| Acompte d'affaire | 600 $ | `price()` |
| Dépense ponctuelle | 200 $ | `spendAmount()` |
| Nouvelle mensualité | 70 $/mois | `LIFESTYLE.subs.monthly` |
| Perte de caisse cumulée sur 5 tours | ≤ 540 $ (500 + 40) | caisse jamais < 2 205 |
| Gain de caisse | +1 040 $ (un seul Jour de paie) | `collect()` |
| Vitals | ±0 (drift gelé) | `driftVitals` |

---

## 8. Fin, drapeau sauvegardé et rejouer

> **Règle en vigueur (Geraldy, 08/10/2026, remplace l'ancien §8 « la partie d'entraînement devient la vraie partie ») :**
> le tutoriel ne touche **jamais** la vraie partie, quel que soit le point d'entrée (nouvelle partie ou Options › Revoir le tutoriel).
> Il est proposé automatiquement **uniquement à la toute première partie sur l'appareil**, ensuite seulement via Options.
> Précision (Geraldy via Crypto, 08/10/2026) : en plus de la toute première partie, le tutoriel reste accessible **à tout moment** via Options › Revoir le tutoriel (comme aujourd'hui), toujours avec un **impact nul** sur la vraie partie.

- **Partie d'entraînement jetable.** Toute partie créée avec `createMatch(..., { training: true })` porte `practice: true` pendant toute sa vie (tours scriptés **et** récapitulatif qui suit). Elle n'est jamais la vraie partie : elle ne nourrit ni les records (`gameflow-trophies-v1`), ni l'historique du graphique « Revenu passif par tour » (`gameflow-passive-history-v1`), et `backupBeforeReplay` ne la met jamais de côté. Elle a sa propre graine (jamais celle de la vraie partie).
- **Fin naturelle.** Après la carte du T5, `finish()` → `advance()`. Au début du tour suivant, si `training.turn > TRAINING_TURNS`, on remet `s.training = null` (le moteur ne change pas). L'UI affiche la Porte puis la carte « Tutoriel terminé · À toi de jouer ». **« Jouer » jette la partie d'entraînement** et ramène la vraie partie, intacte.
- **Première partie sur l'appareil (lancement automatique).** Si `TUTORIAL_KEY` est absent à l'action « Nouvelle partie » :
  1. la vraie partie est distribuée tout de suite à son **état initial** (tous les joueurs, métier tiré au hasard, tour 1, caisse de départ, journal « The board is set. First career dealt. ») et mise de côté sous `gameflow-save-v1:before-training` (`setAsideFreshGame`), exactement comme « Revoir » met de côté la partie en cours ;
  2. le tutoriel se joue sur une partie **solo** jetable avec le personnage et le rêve du joueur 1 (le joueur 2 ne joue aucun tour pendant ce temps) ;
  3. « Jouer » (carte de fin) ou « Passer le tutoriel » restaurent la vraie partie mise de côté : tour 1, caisse initiale, aucun actif, aucune dépense ajoutée, métier non imposé, aucune ligne du tutoriel dans le journal. Valable à 1 et 2 joueurs, tutoriel terminé ou passé.
- **Drapeau.** `TUTORIAL_KEY` (`"gameflow-tutorial-seen"`) vaut `"training-v1"`. Il est écrit dès la Porte du T5, à « Jouer » et à « Passer ». Toute valeur non vide = « vu » : les nouvelles parties suivantes ne lancent plus le tutoriel ; il reste accessible via Options › Revoir le tutoriel. C'est un réglage de l'appareil, pas de la partie.
- **Rejouer depuis Options, à tout moment.** Le bouton « Revoir le tutoriel » est toujours présent dans Options (menu d'accueil, ou Menu › Options pendant une partie), qu'il y ait une partie en cours, aucune partie, une partie terminée ou un tutoriel déjà en cours, et autant de fois qu'on veut. « Revoir le tutoriel » demande confirmation dès qu'une partie serait remplacée, met la vraie partie en cours de côté (`gameflow-save-v1:before-training`, jamais une partie d'entraînement), puis lance une partie d'entraînement solo jetable avec le même personnage et le même rêve. « Jouer » ou « Passer » ramènent la partie mise de côté, à l'identique. S'il n'y avait aucune partie (Revoir depuis le menu sans sauvegarde), ils distribuent une partie neuve à l'état initial avec le même personnage.
- **Impact nul (vérifié).** Après Revoir puis « Jouer » ou « Passer », la vraie partie est identique à celle d'avant (tour, joueur courant, caisse, actifs, dettes, journal, décisions, Registre affiché) : la copie mise de côté est restituée octet pour octet, seul le champ technique de son `sfx` (effet sonore en cours) peut repasser à `null` quand l'application la recharge ; `gameflow-passive-history-v1` et `gameflow-trophies-v1` ne bougent pas. Revoir une deuxième fois en plein tutoriel garde la copie de la vraie partie (jamais celle du tutoriel). Tests : `tutorial-save.test.ts` (« Options › Replay the tutorial: reachable at any time, zero impact »), `history.test.ts`, `trophies.test.ts` ; navigateur : `tut-iso.mjs` ISO-O (fr/es/en, 1 et 2 joueurs, terminer, passer, recharger, refuser).
- **Rechargement.** Pendant les tours scriptés, « Continuer » reprend l'entraînement ; sur la Porte ou la carte de fin, le coach revient (empreinte `gameflow-save-v1:tutorial-result`). La vraie partie reste de côté jusqu'à « Jouer » ou « Passer ».

---

## 9. « Passer le tutoriel »

- Bouton toujours visible pendant le coach. Il écrit `TUTORIAL_KEY`, **jette la partie d'entraînement** et ramène la vraie partie (mise de côté) à l'identique, ou une partie neuve à l'état initial s'il n'y en avait pas (voir §8).
- L'action moteur `{ type: "SKIP_TRAINING" }` existe toujours (garde-fous §7, tests) mais l'UI ne s'en sert plus : la partie d'entraînement n'est jamais poursuivie en règles normales.
- Message affiché (strings `skipToast`) : « Tutoriel passé : place à ta vraie partie, intacte. Rejouable depuis Options. »

---

## 10. Hot-seat à 2 joueurs

- Le tutoriel est **toujours solo** : seul le joueur 1 le joue, sur une partie jetable avec son personnage et son rêve. Le joueur 2 ne joue aucun tour pendant le tutoriel.
- La vraie partie à 2 joueurs est distribuée à son état initial avant le tutoriel et ramenée intacte à la fin (§8) : tour 1 pour tout le monde.
- Le moteur garde la prise en charge `training.player = 0` dans une partie à plusieurs joueurs (`trainingFor(s)` renvoie `null` si `s.current !== s.training.player`) pour les sauvegardes antérieures, mais l'UI ne crée plus de partie d'entraînement à plusieurs joueurs.

---

## 11. i18n

`i18n.ts` traduit à partir de la chaîne anglaise (`tr()`, dictionnaires `fr`/`es`, plus `long` pour les textes longs). Les textes du mode suivent la même convention ; les valeurs fr/en/es complètes sont dans `tutorial/strings.js` (maquette) et, dans le dépôt, dans `src/components/game/boite/training-strings.ts`, qui fait foi : la table ci-dessous est alignée sur ce fichier.

| Clé anglaise (source) | fr | es |
|---|---|---|
| `Training · Turn {n}/5` | Entraînement · Tour {n}/5 | Entrenamiento · Turno {n}/5 |
| `Got it` | Compris | Entendido |
| `Next` (déjà présent) | Suivant | Siguiente |
| `Skip the tutorial` | Passer le tutoriel | Saltar el tutorial |
| `Replay the tutorial` | Revoir le tutoriel | Ver el tutorial otra vez |
| `No risk` | Sans risque | Sin riesgo |
| `Training price cap: {cap} max` | Prix plafonné en entraînement : {cap} max | Precio con tope en entrenamiento: {cap} máx. |
| `Tutorial complete` / `Your turn` | Tutoriel terminé / À toi de jouer | Tutorial terminado / Te toca |
| les 11 textes de coachmark `t1roll` … `t5gate` | voir `strings.js` (`steps`) | idem |

Titres de cartes sans traduction dans le dépôt, proposés dans `strings.js` : « Spare-room sublet » → Sous-location de la chambre d’ami / Subarriendo del cuarto libre, « Subscription shrine » → Autel aux abonnements / Altar de suscripciones, « A nod across the room » → Un signe de tête de l’autre côté de la salle / Un saludo desde el otro lado de la sala, « Rest / Charity » → Don / Donación, « The long dinner ».

Les montants passent par `money()`. Pour fr/es, le mockup affiche « 1 705 $ » (espace fine insécable).

---

## 12. Sans analytics

- Le dépôt ne contient aucun tracker, et le mode Entraînement n'en ajoute **aucun** : pas d'événement, pas de réseau.
- Seul stockage : `localStorage` (`TUTORIAL_KEY`, la sauvegarde `SAVE_KEY`, la partie mise de côté `gameflow-save-v1:before-training` et l'empreinte `gameflow-save-v1:tutorial-result`).
- Les statistiques éventuelles (taux de skip) se mesurent en test utilisateur, jamais dans le build.

---

## 13. Tests à écrire (engine, purs)

1. `createMatch(picks, 42, false, {training:true})` donne une caisse de 1 705, `careerId` "barista", une position de 21, `statement().cashFlow` = 1 040.
2. Enchaîner ROLL → REVEAL → STEP×n pour les tours 1 à 5 donne les dés `[2,1,1,1,1]` et les positions `[23,0,1,2,3]`, quel que soit le `seed` (tester 100 seeds).
3. T2 : la caisse passe à 2 745. T3 avec accept : caisse 2 245, `assets.length` = 1, passif 340, `liabilities.length` = 0.
4. T4 avec pay : `expenseMods` = 70, caisse 2 205. Avec decline : aucun changement.
5. Au T1, `restCard` n'expose que "rest". Aucune carte servie n'a de choix `borrow`.
6. Les vitals sont identiques avant et après les 5 tours. Les `friends` restent vides.
7. `SKIP_TRAINING` au T2 : au tour suivant, le dé redevient aléatoire, `s.training === null` et `drawDeal` est utilisé.
8. 2 joueurs : J2 joue avec des dés aléatoires dès son premier tour, et J1 garde le script.
9. `hydrate()` d'une sauvegarde v1 sans `training` donne `training: null`.
10. Partie normale, sans `training` : snapshot identique à `main`, donc aucune régression.
