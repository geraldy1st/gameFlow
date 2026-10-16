# Plan d'architecture GameFlow : extensible et plus léger

Base : `origin/main` @ 4515dea (PC-3 et nettoyage fusionnés). Document de planification uniquement : aucun commit, aucun push.
Ordre décidé : (1) mini-jeux en plugins, (2) modèle de données décors/scènes et boutiques, (3) découpage d'`engine.ts` sans changement de comportement, (4) Knip en CI, (5) i18n chargée par langue.

## 1. État actuel

**`src/game/engine.ts` : 3 885 lignes, 57 exports, environ 130 fonctions internes.**

| Lignes | Contenu |
|---|---|
| 1–110 | imports, types de base (Phase, Screen, Tone, Line, Choice…) |
| 112–400 | modèle : Asset, Liability, Player, Payload, CardView, Statement, GameState, TrainingState, Pick |
| 401–600 | aides (money, rand, shuffle, withP, log, blip), statement(), unlocked(), skillChip |
| 600–760 | affaires : price, takeDeal, dealCard, twoDealCard, loanCard |
| 760–1000 | blankMenu, createMatch, startCard, landing, buildSpace, cartes du tutoriel |
| 1000–1600 | ~25 générateurs de cartes (lifestyle, market, career, social, love, health, tax, meet, mentor, boom, family…) |
| 1600–2040 | niveau 2 / entreprise : foundBusiness, client, hire, expand, ops, pitch, press, brand, scale, exit |
| 2040–2265 | jalons, win, finish, advance, beginTurn, skillTurn, prêts, marché, boom, saisie |
| 2266–2480 | `Action` (30 types), trainingRefuses, **reduce** (+ awardXp), doQuiz, minigameGig, quizOpen, achats de biens |
| 2480–3700 | reduceCore et tous les gestionnaires `do*` / `resolve*` (dé, choix, vêtements, maison, cercle, famille, entreprise, Porte, métro, prêt, vente, retraite) |
| 3700–3885 | normalisation des sauvegardes (hydratePlayer, soloFromMulti, wasMultiSave), rebaseAssets (PC-3), **hydrate**, sélecteurs (dreamOf, portraitOf, priceOf…) |

**Course vers le métro**
- Logique pure dans `src/game/metro-run.ts` : règle d'offre `metroOfferTurn` (tous les 10 tours propres, délai de grâce de 2), `metroReward`, puis le coureur (RUN, act, advanceRun, autopilote).
- Moteur :
  - action `{type:"METRO", result, lives}`, traitée par `doMetro` (engine.ts ~3586) ;
  - marqueur `Player.metroTurn`, réparé dans hydrate (`metroTurn` legacy) ;
  - points de compétences dans `awardXp` (clés `runner.*` de `SKILL_REWARDS`) ;
  - `minigameGig` (bonus Créativité).
- UI :
  - `boite/MetroRun.tsx` (offre et course), `metro-audio.ts`, `metro-skin.ts` (interface `RunnerSkin`), `metro-skin-shibuya.ts` (949 lignes) ;
  - branchement en dur dans GameFlow.tsx (imports l.31/43, `metroDue` l.1107, rendu l.1475–1494).
- Tout est dans le bundle principal (~55 Ko).

**Quiz en classe**
- Données : `class-quiz.ts` (questions, LESSON, question créative). Réglages : `tuning.ts` `CLASS_QUIZ`.
- Moteur : action `QUIZ`, traitée par `doQuiz` ; `quizOpen`/`quizWait`/`creativeOpen` ; `Player.quizTurn` ; clé `quiz.complete` dans `awardXp`.
- UI : `v3/ClassQuiz.tsx`, avec l'état `classQuiz` et le rendu dans GameFlow (l.584, 1456). L'entrée est dans Hub (`MINIGAMES`, tuning.ts:288, une liste statique avec deux « Bientôt »).

**Biens, boutiques, décors : données dispersées**
- `tuning.ts` : `GoodDef`, `GOODS`, `GOODS_CATEGORIES`, `SOON_GOODS`, `ShopDef`/`SHOPS` (`sells: "clothes" | "home" | string[]`, donc deux cas spéciaux codés en dur), `Unlock`.
- `life.ts` (OUTFITS, vêtements) et `shop.ts` (HOME_SHOP, CLOTH_PRICE, HOME_LEVEL) gardent leurs propres règles.
- `shops.ts` : unlockState, goodById, shopOfGood.
- Décors : il n'y a pas de notion de scène. Les images `public/game/art/*.jpg` sont référencées en dur depuis data.ts, engine.ts et GameFlow.tsx. Seul décor structuré : le skin du coureur.

**Interface de skin (`metro-skin.ts`)**
- `RunnerSkin` : dessin canvas à partir du `RunState` pur, plus `SkinMusic`, `SkinLabels`, `FaceSet`, `Fx`, `Spark`, `Camera`, `DrawInput`.
- Le gameplay ne dépend pas du skin. C'est le bon modèle à généraliser.

**i18n**
- `i18n.ts` (193 Ko : fr, es et `long`), `i18n-ui.ts` (31 Ko), `training-strings.ts` (15 Ko).
- `tr()` est synchrone. Ces trois fichiers sont importés par 19 modules, dont des modules de données (`quizzes.ts`, `class-quiz.ts`, `chats.ts`).
- Le moteur stocke des clés (`tl()`, text.ts) et ne traduit pas, ce qui est favorable au découpage.

**CI** : un seul workflow, `pages.yml` (Node 22, `npm ci`, `build:pages`). Il n'y a ni tests ni lint en CI.

## 2. Structure cible

```
src/minigames/
  types.ts            MinigameDefinition, MinigameResult, OfferContext
  registry.ts         MINIGAMES: MinigameDefinition[] (ordre d'affichage) + byId
  metro/  logic.ts (= metro-run.ts), offer.ts, rewards.ts, ui.tsx, skins/{types.ts, shibuya.ts}, audio.ts, i18n.{fr,es}.ts, metro.test.ts
  quiz/   logic.ts, questions.ts, offer.ts, rewards.ts, ui.tsx, i18n.{fr,es}.ts, quiz.test.ts
src/scenes/
  types.ts            SceneDefinition, ShopDefinition, ArticleType
  registry.ts         SCENES, SHOPS, ARTICLES (données uniquement)
  maison/ appartement/ garage/ ecole/   scene.ts (+ images dans public/game/scenes/<id>/)
src/game/engine/      modules internes ; src/game/engine.ts devient un barrel (même API publique)
```

**Interface `MinigameDefinition` (pure, sans React)**
```ts
export interface MinigameDefinition<R = unknown> {
  id: string;                       // "metro", "quiz" : clé stable, jamais renommée (sauvegardes)
  name: string; note: string;       // clés i18n (tl)
  icon: string;
  /** Moment où le jeu est proposé ou jouable : "offer" = modale imposée (métro), "menu" = Activités (quiz). */
  entry: "offer" | "menu";
  isDue(s: GameState, p: Player): boolean;          // remplace metroOfferTurn / quizOpen
  waitTurns?(p: Player): number;                    // « dans N tours » (quizWait)
  /** Validation du résultat envoyé par l'UI, puis récompense en argent. Pure et déterministe. */
  sanitize(raw: unknown, p: Player): R;
  cash(result: R, p: Player): number;
  skillKeys(result: R, p: Player): { key: string; times?: number; bonus?: number }[]; // clés SKILL_REWARDS
  logLine(result: R | "decline"): string;           // tl(...)
  feedsGig?: boolean;                               // minigameGig (Créativité)
  /** UI chargée à la demande : un chunk Vite par mini-jeu. */
  load: () => Promise<{ default: React.ComponentType<MinigameUiProps<R>> }>;
}
```
- **Une seule action générique** : `{type:"MINIGAME", id, result}`. Le reducer appelle `def.sanitize`, `def.cash`, `def.skillKeys`, puis pose le marqueur.
- **Marqueur** : `Player.minigames?: Record<id, number>` (dernier tour joué ou refusé).
- **Les actions `METRO` et `QUIZ` restent acceptées** comme alias, pour les anciennes sauvegardes et pour le replay de Crypto.
- **hydrate** recopie `metroTurn` et `quizTurn` dans `minigames.metro` et `minigames.quiz`, tout en gardant les deux champs (lecture seule) tant que des outils les lisent.
  - **Fait au lot 5 (16/10), dans l'autre sens** pour garder l'empreinte identique bit à bit : `metroTurn` et `quizTurn` restent la source de vérité du métro et du quiz (le moteur continue à les écrire, `def.legacyMarker`). `Player.minigames` ne sert qu'aux jeux ajoutés après le lot 5. hydrate replie `minigames.metro` et `minigames.quiz` dans `metroTurn` et `quizTurn` quand ces champs manquent, garde les autres ids bien formés et n'écrit jamais `minigames` vide (les anciennes sauvegardes hydratent exactement comme avant). Le passage complet à `minigames` demandera une nouvelle EXPECTED, après le lot 5bis.
- **UI** :
  - `GameFlow` ne connaît plus aucun mini-jeu : un `<MinigameHost>` lit le registre, affiche l'offre quand `entry === "offer"` et `isDue`, et charge `def.load()` avec `React.lazy` et `Suspense`.
  - Hub › Activités lit le registre au lieu de `MINIGAMES` (tuning.ts).
- **Skins** : `skins/types.ts` généralise `RunnerSkin` en `Skin<State>` (draw, music, labels, faces). Un nouveau décor (livraison à moto) est un fichier de plus, pas un nouveau jeu.
- **Récompenses** : les montants restent dans `tuning.ts` (un seul fichier de réglages pour Geraldy). `rewards.ts` les lit et ne les duplique pas.

**Modèle décors, scènes et boutiques (données)**
```ts
type ArticleType = "clothes" | "home" | "vehicle" | "property" | "book" | "art" | "furniture" | string;
interface ArticleDef { id; type: ArticleType; name; note; icon; price; monthly?; passive?; xp?; gauge?; repeat?;
  scene?: string /* là où l'objet apparaît */; rules?: "outfit" | "homeItem" /* adapte les règles actuelles life/shop */ }
interface ShopDefinition { id; name; icon; color; unlock: Unlock; sells: { types: ArticleType[]; ids?: string[] };
  pricing?: { discount?: "nego"; resale?: number } }
interface SceneDefinition { id: "maison" | "appartement" | "garage" | "ecole" | string; name; unlock: Unlock;
  background: string /* chemin /game/scenes/... */; ambience?: { music?: string; palette?: string };
  hotspots: { id; label; action: Action | { minigame: string } | { shop: string } }[]; shops?: string[] }
```
- Les `"clothes"` et `"home"` codés en dur deviennent des types d'article. `OUTFITS`, `HOME_SHOP` et `GOODS` sont lus par un adaptateur `articles.ts` : les ids et les prix restent identiques, donc aucune sauvegarde ne change.
- L'école héberge le quiz (`hotspot → { minigame: "quiz" }`).
- Les chemins d'image restent sous `/game/…`. Le plugin `basePublicAssets` et `rebaseAssets` (PC-3) continuent de les gérer : **ne jamais construire un chemin d'image hors d'un littéral `"/game/…"`, `'/game/…'` ou `` `/game/…` ``**, sinon le plugin Pages ne le préfixe pas.

**Découpage d'`engine.ts` (comportement identique)**
```
src/game/engine/
  types.ts      (l.100–400 : GameState, Player, CardView, Action…)
  util.ts       money, rand, shuffle, withP, log, blip
  economy.ts    statement, price, spendAmount, prêts, marché, boom, saisie, vente, priceOf/spendOf/marketFor
  cards/        deals.ts, life.ts (lifestyle/social/love/health/tax/meet/mentor/family…), career.ts, business.ts (niveau 2)
  turns.ts      createMatch, blankMenu, beginTurn, advance, doRoll/doStep, landing, buildSpace
  skills.ts     awardXp, skillChip, skillTurn, minigameGig (le skills.ts existant reste les formules)
  gate.ts       doEnter, ascentCard, summitCard, checkMilestone, win, finish
  goods.ts      doBuyGood, doWear, doBuyCloth, doBuyHome, doToggleHome
  circle.ts     doCircle, circleCard, resolveCircle/Rate/FriendAct
  journal.ts    log, history, addLedger
  training.ts   trainingRefuses, cartes du tutoriel
  saves.ts      hydratePlayer, soloFromMulti, wasMultiSave, rebaseAssets, hydrate, migrations nommées
  reduce.ts     reduce, reduceCore, doChoice (aiguillage uniquement)
src/game/engine.ts  →  export * des 57 symboles actuels, et rien de plus
```
Règle : on déplace sans modifier le corps des fonctions. Chaque lot ne déplace qu'un groupe, et Crypto continue d'importer `src/game/engine.ts`.

## 3. Migration par petits lots

Vérification standard (V) à chaque lot :
- `tsc --noEmit`, vitest, lint sans nouveau problème, `build:pages`, build SSR ;
- **empreinte moteur de Crypto** (200 parties, `c5b22799e4ee85a3` sur 24b5a39, à recalculer sur 4515dea), identique ;
- hydratation des 24 fixtures de sauvegarde, plus `src/game/__tests__/*.fixture.json` ;
- fit-check sur 54 écrans ;
- e2e Chromium fr de Crypto (`run-regression.mjs --quick`), complet sur les lots marqués ★.

| # | Lot | Fichiers | Risque | Vérification en plus de V | Effort | Bundle |
|---|---|---|---|---|---|---|
| 0 | Nouvelle empreinte de référence sur 4515dea, et ajout de l'empreinte moteur en test vitest (graine fixe, 20 parties, hash figé) | `src/game/engine-fp.test.ts` | Nul | — | S | 0 |
| 1 | Types et registre des mini-jeux, sans aucun branchement | `src/minigames/types.ts`, `registry.ts` | Nul | tsc | S | 0 |
| 2 | Métro : déplacer `metro-run.ts`, MetroRun.tsx, metro-skin*, metro-audio dans `src/minigames/metro/`, avec ré-exports aux anciens chemins | ~6 fichiers déplacés, imports | Faible | V | S | 0 |
| 3 | `MinigameHost` avec `React.lazy`, et le métro chargé via `def.load()` ; GameFlow ne garde que le host ★ | GameFlow.tsx, `minigames/metro/*`, `MinigameHost.tsx` | Moyen (Suspense, fin de course qui rend la main) | V, plus l'e2e offre/refus/course et la fin 500/250/0 | M | −55 Ko sur le bundle principal, chunk métro chargé à la demande |
| 4 | Quiz : même traitement (déplacement, def, lazy) ; Hub lit le registre | class-quiz.ts, ClassQuiz.tsx, Hub.tsx, tuning.ts (`MINIGAMES` → registre) | Faible à moyen | V, plus l'e2e du Quiz en classe | M | −25 Ko principal (questions et UI) |
| 5 | Action générique `MINIGAME`, `Player.minigames`, alias METRO/QUIZ, migration hydrate ; awardXp et doMetro/doQuiz passent par la définition ★ | engine.ts (reduce, awardXp, hydrate), minigames/*/rewards.ts | **Moyen** (récompenses, compétences) | V, empreinte identique **sur les actions METRO/QUIZ rejouées**, plus des tests : vieille sauvegarde avec metroTurn ou quizTurn, aucune offre en double | M | ~0 |
| 5bis | **Prérequis aux lots 6 et 8 (biens) : élargir la politique d'empreinte.** Ajouter avec un poids faible BUY_GOOD, BUY_CLOTH, WEAR, BUY_HOME, TOGGLE_HOME, HOUSE, CIRCLE et SKIP_TRAINING, **de façon alignée** dans `engine-fp.mjs` (Crypto) et dans `engine-fingerprint.test.ts`. Ajouter un test d'inventaire article par article (prix, déblocage, boutique, effets mensuels et XP de chaque GOODS / OUTFITS / HOME_SHOP), figé en snapshot. La nouvelle empreinte est figée **sur main dans un commit séparé**, sans aucun changement de code, **avec l'accord de Geraldy pour main** ; Crypto la recalcule de son côté avant le lot 6 | `src/game/engine-fingerprint.test.ts`, `src/game/goods-inventory.test.ts`, snapshots ; côté Crypto, `engine-fp.mjs` | Nul pour l'app (tests uniquement) | Les deux empreintes sont égales entre elles, l'ancienne `c5b22799e4ee85a3` reste reproductible avec l'ancienne politique (option), et le lot ne touche aucun fichier hors tests | S | 0 |
| 6 | Modèle `ArticleDef`/`ShopDefinition` et adaptateur `articles.ts` qui lit GOODS, OUTFITS et HOME_SHOP ; Hub et doBuyGood passent par l'adaptateur | tuning.ts, shops.ts, life.ts, shop.ts, Hub.tsx | Moyen (prix, déblocages) | V, plus un test qui compare les prix et déblocages de chaque article avant et après | M | ~0 |
| 7 | `SceneDefinition` et registre, avec une première scène « école » qui reprend l'existant (le quiz) ; les autres scènes sont des données vides et verrouillées | `src/scenes/*`, Hub.tsx | Faible | V, captures | M | +~3 Ko par scène (données), images à la demande |
| 8a–8l | Découpage d'engine.ts, un groupe par lot : types → util → economy → cards/deals → cards/life → cards/career → cards/business → circle → goods → gate → training → saves → reduce | `src/game/engine/*`, engine.ts (barrel) | Faible par lot (déplacement pur), ★ sur saves et reduce | V, empreinte **identique bit à bit** à chaque lot, plus le diff de surface d'API (liste des exports d'engine.ts inchangée) | 12 × S | 0 (même code, tree-shaking identique) |
| 9 | Knip en CI | `knip.json`, `.github/workflows/ci.yml` | Nul pour l'app | Le job passe sur main | S | 0 |
| 10 | i18n par langue (voir §5) ★ | i18n.ts, i18n-ui.ts, training-strings.ts, GameFlow (chargement), 19 importeurs | Moyen (texte anglais visible en attendant le chargement, SSR) | V, plus check-i18n fr/es/en, test du changement de langue en partie, test hors ligne | M/L | **−~210 Ko** du bundle principal pour un joueur anglophone, −~105 Ko pour fr ou es |

**Règles des lots de refactor (Crypto, 15/10)**
- Ne jamais modifier `**/__snapshots__/**` ni `EXPECTED` (engine-fingerprint.test.ts) dans un lot de refactor, et ne jamais lancer `vitest -u`. Un changement voulu de comportement passe par un commit dédié, avec sa justification et l'accord de Crypto.
- Critères de sortie de chaque lot : tsc et vitest verts, lint sans nouveau problème (référence : 1 erreur, 13 avertissements), les deux builds OK, empreinte `c5b22799e4ee85a3` identique bit à bit (jusqu'au lot 5bis), liste des exports inchangée, snapshots intacts.
- Vérification mécanique (à brancher dans la CI au lot 9) : `git diff --exit-code <base> -- 'src/**/__snapshots__/**'`, avec `<base>` = `origin/main` une fois le lot 0 fusionné sur main (avant, la base est `7b18cf6`, le commit du lot 0, car main ne contient pas encore les snapshots).

**Garanties de compatibilité des sauvegardes**
1. Aucun champ existant n'est renommé ni supprimé. Les nouveaux champs sont optionnels et ont une valeur par défaut sûre dans `hydratePlayer`.
2. Les ids stables (mini-jeux, articles, boutiques, scènes) ne changent jamais.
3. Toute conversion se fait dans `saves.ts`, de façon idempotente : `hydrate(hydrate(x))` est égal à `hydrate(x)`. Elle est testée sur les 24 fixtures plus une par lot qui modifie le modèle.
4. Les actions METRO et QUIZ restent acceptées indéfiniment (alias).
5. Les chemins d'image passent par des littéraux `/game/…` et sont réécrits par `rebaseAssets` au chargement.
6. Les clés i18n stockées (journal, cartes) restent dans les dictionnaires, quelle que soit la langue chargée.

## 4. Knip en CI

`knip.json` (minimal) :
```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "entry": ["src/router.tsx", "src/routes/**/*.tsx", "src/static/main.tsx", "pages/index.html",
            "server/middleware/*.ts", "scripts/*.mjs", "src/minigames/*/index.ts", "src/scenes/*/scene.ts"],
  "project": ["src/**/*.{ts,tsx}", "scripts/**/*.mjs", "server/**/*.ts"],
  "ignore": ["src/routeTree.gen.ts", "src/lib/multiplayer/**", "migrations/**", "src/lib/auth/**", "src/lib/app-data/**"],
  "ignoreDependencies": ["typescript", "tailwindcss", "@tanstack/router-plugin"],
  "tanstack-router": false
}
```
`.github/workflows/ci.yml` :
```yaml
name: CI
on: { pull_request: {}, push: { branches: [main] } }
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx vitest run
      - run: npx knip --include files,dependencies,unlisted,exports --no-progress
      - run: npm run build:pages
```
- Étape à ajouter au même job : garde-fou des snapshots.
```yaml
      - run: git fetch --no-tags origin main
      - name: Snapshots untouched (refactor batches)
        run: git diff --exit-code origin/main -- 'src/**/__snapshots__/**'
```
  Le job doit faire `actions/checkout` avec `fetch-depth: 0`. Un label de PR `behaviour-change` permet de sauter cette étape (`if: ${{ !contains(github.event.pull_request.labels.*.name, 'behaviour-change') }}`) pour les rares commits de comportement validés par Crypto.
- Knip est épinglé en devDependency (`knip@5`), pas appelé via npx sans version.
- Les exports des modules dans `src/minigames/*` et `src/scenes/*` sont des points d'entrée, parce qu'ils sont chargés par le registre ou par `import()`.
- Le lint n'est pas ajouté au job tant que l'erreur PC-1 (`client.server.ts:281`) n'est pas corrigée. On l'ajoute ensuite avec `--max-warnings` égal au compte du moment.

## 5. i18n chargée par langue

- **Découpage** : `src/i18n/fr.ts` (fr, UI_FR, long.fr, training fr) et `src/i18n/es.ts`. L'anglais reste la clé, donc il n'y a pas de dictionnaire anglais.
- `i18n.ts` garde `tr`, `trKey`, `readLang` et `fillVars`. On ajoute :
```ts
const tables: Partial<Record<Lang, Dict>> = {};
export async function loadLang(l: Lang) { if (l === "en" || tables[l]) return;
  tables[l] = (await (l === "fr" ? import("./i18n/fr") : import("./i18n/es"))).default; }
export function tr(lang, text, vars) { const table = tables[lang]; /* absente : repli sur l'anglais (la clé) */ ... }
```
- **Démarrage** :
  - `main.tsx` (static) lit `readLang()` et attend `loadLang()` avant le premier rendu. Le coût est d'un seul fichier, mis en cache ensuite.
  - Pour éviter un aller-retour, `pages/index.html` ajoute un `<link rel="modulepreload">` vers le chunk de la langue enregistrée, via un petit script inline.
- **Changement de langue** : `await loadLang(l)`, puis `setLang(l)` (avec un indicateur pendant l'attente).
- **Repli** : si le chargement échoue (hors ligne), on affiche l'anglais sans planter et on retente au prochain changement.
- **Données traduites** (`quizzes.ts`, `class-quiz.ts`, `chats.ts`, `training-strings.ts`) : il faut retirer leurs objets `{fr, es}` intégrés vers les fichiers de langue (tables indexées par clé), sinon le gain est perdu. Chaque mini-jeu apporte son propre `i18n.{fr,es}.ts`, fusionné dans le chunk de sa langue ou chargé avec le jeu.
- **SSR / Grok Build** :
  - côté serveur, `loadLang` fait un import normal (Vite SSR le résout) ;
  - le rendu serveur se fait en anglais (la langue est lue dans localStorage, donc côté client), comme aujourd'hui où `lang` vaut "en" puis passe à `readLang()` au montage ;
  - le client attend `loadLang` avant `setLang`, donc pas de différence d'hydratation.
- **Moteur et tests** : le moteur n'utilise que `tl()`, il n'est pas touché. Les tests qui traduisent (`text.test`, `training-i18n.test`) appellent `await loadLang("fr")` dans `beforeAll`.
- **Crypto** : `check-i18n` doit attendre la fin du chargement (sélecteur de langue appliqué) avant de relever les segments.

## 6. Recettes après refactor

**Ajouter un mini-jeu** (exemple : `delivery`)
1. `src/minigames/delivery/logic.ts` : état pur et tests vitest (aucun DOM).
2. `rewards.ts` et `offer.ts` : `isDue`, `sanitize`, `cash`, `skillKeys`, `logLine`. Les montants vont dans `tuning.ts`, les points dans `SKILL_REWARDS["delivery.*"]`.
3. `ui.tsx` : composant `MinigameUiProps<R>` (`onDone(result)`, `onClose()`), accessible, en pause quand l'onglet passe en arrière-plan. Skins éventuels dans `skins/`.
4. `i18n.fr.ts` et `i18n.es.ts` : les nouvelles clés.
5. `index.ts` : `export default { id: "delivery", entry: "menu", load: () => import("./ui"), ... } satisfies MinigameDefinition`.
6. Une ligne dans `src/minigames/registry.ts`. GameFlow, engine et Hub ne changent pas.
7. Tests : offre (dû ou non, practice, refus unique), récompense par issue, hydrate d'une ancienne sauvegarde (marqueur absent, donc valeur par défaut).

**Ajouter un décor ou une boutique** (exemple : garage)
1. Images dans `public/game/scenes/garage/`, référencées par un **littéral** `"/game/scenes/garage/bg.jpg"`.
2. `src/scenes/garage/scene.ts` : `SceneDefinition` (unlock, background, ambience, hotspots vers une boutique ou un mini-jeu).
3. Articles : entrées `ArticleDef` avec un `type` (`"vehicle"`…) et un id stable. Boutique : `ShopDefinition` avec `sells.types`.
4. Les clés i18n fr et es des noms et notes.
5. Une ligne dans `src/scenes/registry.ts`. Test de données : chaque `sells`, `hotspot` et `unlock` pointe vers un id existant, et les prix sont positifs.

## 7. Effort et impact
- Lots 0, 1, 2, 5bis, 9 : petits (S). Lots 3, 4, 5, 6, 7 : moyens (M). Lot 8 : 12 petits lots. Lot 10 : moyen à gros (M/L), à cause des données traduites intégrées.
- Bundle principal aujourd'hui : ~816 Ko (275 Ko gzip). Après les lots 3–4 : environ −80 Ko (mini-jeux à la demande). Après le lot 10 : environ −210 Ko pour l'anglais, −105 Ko pour le français ou l'espagnol. Un joueur français passerait d'environ 816 Ko à 630 Ko pour le premier écran.
- L'avertissement Vite « chunk > 500 Ko » (PC-2) devrait disparaître après les lots 3, 4 et 10, ou presque : react-dom pèse à lui seul ~524 Ko non minifié dans l'analyse.
