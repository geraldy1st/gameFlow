# Hooks de test : course vers le métro

Actifs **uniquement** en dev (`npm run dev`) ou dans un build fait avec `VITE_METRO_HOOK=1`. Dans le build public (`npm run build:pages` sans cette variable), `METRO_HOOK` vaut `false` à la compilation : le code est éliminé et les paramètres d'URL n'ont aucun effet (vérifié : ni `metro-demo`, ni `metro-seed`, ni `metro-length` dans `dist-pages/assets/*.js`). Le moteur n'est pas touché : la course envoie toujours le même résultat (le nombre de vies restantes), depuis le lot 5 par l'action générique `{ type: "MINIGAME", id: "metro", result: { lives } }` (`METRO` reste un alias accepté).

| Paramètre d'URL | Effet |
|---|---|
| `?metro-demo=win` | un bot fait les bons gestes : arrivée sans perte de vie → **+500 $** |
| `?metro-demo=hurt` | le bot rate le 3e obstacle : une vie perdue → **+250 $** |
| `?metro-demo=crash` | le bot fait les mauvais gestes : 0 vie → **ratée**, aucun gain |
| `?metro-seed=<entier>` | graine des obstacles (défaut `RUN.seed` = 1008, déjà déterministe) |
| `?metro-length=<mètres>` | longueur de la piste, bornée à 30–260 m (défaut 260 m, ~27 s). Avec 60 m, la course dure quelques secondes |

Les paramètres se combinent, par exemple `?metro-demo=win&metro-length=80`.

## Exemple (couvrir le cas 500 $)
```bash
VITE_METRO_HOOK=1 npm run build:pages          # build de test, jamais déployé
npx vite preview --config vite.pages.config.ts  # ou tout serveur statique sur dist-pages/ servi sous /gameFlow/
```
1. Charger une sauvegarde dont l'offre est due : joueur en phase `idle`, `players[0].turns = 11` (tour 10 terminé), `metroTurn` absent.
2. Ouvrir `http://localhost:<port>/gameFlow/?metro-demo=win&metro-length=80`, « Continuer », puis « J'y vais ».
3. Attendre l'écran de victoire, puis cliquer « Retour à la partie » : la caisse augmente de 500 $ et le journal affiche « Course vers le métro : +500 $ ».

La course est entièrement déterministe à graine et longueur égales : le bot joue sur l'état pur (`RunState`), pas sur le temps réel de l'écran.
