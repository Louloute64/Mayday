# Mayday – Monomoteur

Version web du jeu. Les fichiers du dossier suffisent pour jouer, éditer le jeu ou l’héberger sur un serveur statique. Aucune installation de dépendances et aucune étape de compilation.

## Lancer sur ton ordinateur

1. Décompresse le ZIP.
2. Ouvre un terminal dans le dossier `Mayday-Monomoteur`.
3. Lance `python3 -m http.server 8000` sur macOS ou Linux, ou `py -m http.server 8000` sous Windows.
4. Ouvre [http://localhost:8000](http://localhost:8000) dans ton navigateur. Laisse le terminal ouvert pendant la partie.
5. Modifie un fichier dans ton éditeur, enregistre et recharge la page pour voir le résultat.

La version hébergée est accessible sur https://mayday-monomoteur.nearnacre3.chatgpt.site avec le compte ChatGPT qui possède le site. Pour héberger ta propre copie, publie le contenu de ce dossier sur ton hébergement statique, avec `index.html` à sa racine.

## Où modifier le jeu

| Fichier | Contenu |
|---|---|
| `index.html` | Menus, choix d’avion, boutons et structure du cockpit |
| `style.css` | Mise en page, couleurs, cadrans et adaptations à l’écran |
| `game.js` | Scénarios, modèles de vol, commandes, atterrissages, instruments et son |
| `terrain.js` | Aérodromes, pistes, caméras, rendu du décor et repérage des parcelles |
| `*.jpg` | Photos aériennes, détails de piste et variantes allégées pour tablette |
| `*-champs.png` | Cartes des parcelles utilisées pour détecter les champs |

Dans `game.js`, cherche `aircraftProfiles` pour modifier un avion, `missions` pour modifier une panne, et `toggleOptionalSound` pour modifier l’activation du son. La fonction `animation` cadence le vol indépendamment du son. Le bruit moteur est synthétisé sur place avec Web Audio après un appui sur **Activer le son**. Les interruptions audio sont signalées sur le bouton et ne commandent pas la pause du vol.

Le jeu utilise des photographies aériennes IGN / Géoplateforme et des données de parcelles agricoles ASP / IGN. Les crédits figurent dans la page. Les modèles de vol et la logique de décision sont simplifiés pour le jeu.
