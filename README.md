# Atelier « Culture informatique et Web »

Application web interactive pour les stagiaires d'un ESRP. Elle reprend les 5 séances du livret « Culture informatique et environnement Web », complétées par 2 séances sur le client/serveur, en FALC (Facile à lire et à comprendre).

- **Aucun serveur, aucun compte, aucune base de données.** Le site est statique et hébergé sur GitHub Pages.
- **Tout le contenu est dans des fichiers JSON** (dossier `content/`). Vous pouvez ajouter ou modifier des exercices **sans toucher au code**.
- Le travail du stagiaire reste **dans son navigateur**. Rien n'est envoyé sur Internet.

Pour les règles détaillées du projet, voir [CLAUDE.md](CLAUDE.md).

---

## Sommaire

1. [Arborescence du projet](#1-arborescence-du-projet)
2. [Tester sur son ordinateur](#2-tester-sur-son-ordinateur)
3. [Publier sur GitHub Pages](#3-publier-sur-github-pages)
4. [Comment marchent les exercices](#4-comment-marchent-les-exercices)
5. [Ajouter ou modifier du contenu](#5-ajouter-ou-modifier-du-contenu)
6. [Format JSON d'une séance](#6-format-json-dune-séance)
7. [Les blocs « à lire »](#7-les-blocs--à-lire-)
8. [Les 3 types d'exercices](#8-les-3-types-dexercices)
9. [Les textes de l'interface](#9-les-textes-de-linterface)
10. [Sauvegarde, export et import](#10-sauvegarde-export-et-import)
11. [Limites connues](#11-limites-connues)
12. [Notes sur le contenu du livret](#12-notes-sur-le-contenu-du-livret)
13. [Pour les développeurs : créer un nouveau type d'exercice](#13-pour-les-développeurs--créer-un-nouveau-type-dexercice)

---

## 1. Arborescence du projet

```
culture-web/
├── index.html                  Page unique de l'application
├── .nojekyll                   Fichier vide : désactive un traitement automatique de GitHub Pages
├── README.md                   Ce guide
├── CLAUDE.md                   Règles du projet et historique des décisions
│
├── css/
│   └── styles.css              Mise en forme accessible (contrastes, focus, grande police)
│
├── js/
│   ├── app.js                  Démarrage, menu des séances, passage d'un écran à l'autre
│   ├── chargeur-contenu.js     Chargement des JSON et contrôle de leur contenu
│   ├── blocs-lecon.js          Affichage des parties « à lire » (paragraphes, images, tableaux…)
│   ├── moteur-exercices.js     Moteur commun : délai, validation, verrouillage, correction
│   ├── progression.js          Sauvegarde dans le navigateur, export et import de fichier
│   ├── outils.js               Petites fonctions utiles partout
│   └── types/                  Un fichier par type d'exercice
│       ├── registre.js         Liste des types connus
│       ├── commun-qcm.js       Code partagé par les deux types de QCM
│       ├── qcm-unique.js       Type « qcm_unique »
│       ├── qcm-multiple.js     Type « qcm_multiple »
│       └── texte-libre.js      Type « texte_libre »
│
├── content/
│   ├── interface.json          Textes des boutons et des messages, liste des séances
│   ├── seance-1.json           Séance 1 : Qu'est-ce que le web ?
│   ├── seance-2.json           Séance 2 : Comment ça marche ?
│   ├── seance-3.json           Séance 3 : Chercher et vérifier
│   ├── seance-4.json           Séance 4 : Problèmes et solutions
│   ├── seance-5.json           Séance 5 : Sécurité, fiabilité et bilan
│   ├── seance-6.json           Séance 6 : Client et serveur : le trajet d'une page
│   └── seance-7.json           Séance 7 : Enquête : observer les échanges avec F12
│
└── assets/
    └── images/                 Les 9 illustrations (renommées et compressées)
```

Répartition des illustrations :

| Séance | Illustrations |
|---|---|
| 1 | 01 — Internet, web, navigateur (métro) |
| 2 | 02 — Client-serveur (courrier) ; 03 — Anatomie d'une URL |
| 3 | 04 — Moteur de recherche (bibliothèque) ; 05 — Grille de crédibilité |
| 4 | 06 — Les 4 erreurs courantes ; 07 — Guide de dépannage |
| 5 | 08 — Les 10 règles de sécurité ; 09 — Bilan et progression |

---

## 2. Tester sur son ordinateur

⚠️ **Ouvrir `index.html` par double-clic ne fonctionne pas.** Les navigateurs bloquent la lecture des fichiers JSON quand la page est ouverte comme un simple fichier. Dans ce cas, l'application affiche un message d'explication au bout de quelques secondes.

Il faut passer par un **petit serveur local**. Deux solutions, au choix.

**Solution A — avec Python** (souvent déjà installé) :

1. Ouvrir un terminal dans le dossier `culture-web`.
2. Taper : `python -m http.server 8000`
3. Ouvrir dans le navigateur : `http://localhost:8000`
4. Pour arrêter : touches `Ctrl + C` dans le terminal.

**Solution B — avec VS Code** : installer l'extension « Live Server », puis clic droit sur `index.html` → « Open with Live Server ».

Ces outils servent seulement à tester. Ce ne sont pas des dépendances du projet.

Après avoir modifié un fichier JSON : **rechargez la page** (touche F5).

---

## 3. Publier sur GitHub Pages

1. Créer un dépôt sur GitHub (par exemple `culture-web`).
2. Envoyer **le contenu** du dossier `culture-web` à la racine du dépôt : `index.html` doit être à la racine.
3. Sur GitHub : **Settings** → **Pages**.
4. Dans « Build and deployment », choisir **Deploy from a branch**, branche `main`, dossier `/ (root)`. Cliquer sur **Save**.
5. Après une ou deux minutes, le site est en ligne à l'adresse `https://<votre-compte>.github.io/culture-web/`.

Pour mettre à jour le contenu : modifiez le fichier JSON sur GitHub (icône crayon), puis « Commit changes ». Le site se met à jour tout seul en une à deux minutes.

À savoir avant de publier :

- **Tout ce qui est dans le dépôt devient public**, y compris les bonnes réponses dans les JSON. Voir [Limites connues](#11-limites-connues).
- **Les fichiers d'origine ne sont pas publiés** : le fichier `.gitignore` exclut les PNG et le PDF placés à la racine du dossier (images non compressées avec un logo RATP, livret formateur). Seules les images de `assets/images/` sont utilisées. Il exclut aussi les fichiers de travail exportés par les stagiaires (`mon-travail-culture-web-*.json`). Ne retirez pas ces lignes du `.gitignore`.
- Les illustrations ont été **générées par une intelligence artificielle**. Le pied de page de l'application le signale. Voir la [section 12](#12-notes-sur-le-contenu-du-livret).
- GitHub Pages **respecte les majuscules** dans les noms de fichiers, Windows non. Écrivez toujours les noms de fichiers en minuscules, sans espace ni accent.
- Utilisez toujours des **chemins relatifs** (`assets/images/…`), jamais `/assets/images/…`.

---

## 4. Comment marchent les exercices

Pour **chaque** exercice, le déroulé est le même :

1. L'exercice s'affiche. Le bouton **« Valider ma réponse »** est inactif.
2. Si l'exercice a un délai (`tempsMinimumSecondes`), un message doux s'affiche : « Prenez le temps de bien lire. » **Il n'y a pas de compte à rebours.** À la fin du délai, un lecteur d'écran annonce une seule fois : « Vous pouvez maintenant valider votre réponse. »
3. Le stagiaire répond. Quand le délai est passé **et** qu'une réponse est choisie, « Valider ma réponse » devient actif.
4. Au clic sur « Valider ma réponse », **la réponse est enregistrée dans le navigateur**. Les réponses sont bloquées : impossible de les changer.
5. Le bouton **« Voir la correction »** devient actif. Avant, il est visible mais inactif.
6. Au clic, la correction s'affiche : le résultat (« Bonne réponse » ou « Ce n'est pas la bonne réponse », toujours en texte avec une icône), le détail et l'explication.

Règles importantes :

- **La correction n'existe pas dans la page avant le clic sur « Voir la correction ».** Elle n'est pas cachée : elle n'est pas encore construite. Un lecteur d'écran ne peut donc pas la lire à l'avance.
- **Un exercice validé ne peut pas être refait** (décision du formateur, voir CLAUDE.md, D-005).
- Après un rechargement de la page : un exercice validé réapparaît avec la réponse donnée. Un exercice non validé reste verrouillé, et son délai repart de zéro.
- Le délai **ne limite jamais** le temps de réponse. Il n'y a pas de durée maximale.
- Le stagiaire peut sauter d'une séance ou d'un exercice à l'autre avec le menu et le plan de la séance. Cela ne montre aucune correction.

---

## 5. Ajouter ou modifier du contenu

### Ce que vous pouvez faire seul, sans développeur

- Ajouter un exercice d'un type existant (`qcm_unique`, `qcm_multiple`, `texte_libre`).
- Modifier une question, une option, une bonne réponse ou une explication.
- Augmenter ou diminuer un délai (`tempsMinimumSecondes`).
- Ajouter une étape, un paragraphe, une liste ou un encadré.
- Reformuler un bouton ou un message (fichier `content/interface.json`).
- Ajouter une séance (voir [section 9](#9-les-textes-de-linterface)).

### Méthode conseillée

1. Ouvrir le fichier de la séance, par exemple `content/seance-2.json`, dans un éditeur de texte (VS Code, Notepad++…). Évitez le Bloc-notes de Windows.
2. **Copier un exercice existant** du même type, avec ses accolades `{ }`.
3. Le coller à l'endroit voulu dans la liste `"exercices"`.
4. Changer l'`id` (voir les règles ci-dessous), puis la question, les options, etc.
5. Enregistrer le fichier et recharger la page (F5).
6. **Si un message rouge « Un fichier de contenu a un problème » s'affiche** sur la séance, il indique le fichier, l'élément (`id`) et le champ à corriger.

### ⚠️ Les pièges du format JSON

Le JSON est très strict. Une petite erreur rend le fichier illisible.

| Erreur | Faux | Juste |
|---|---|---|
| Virgule après le dernier élément | `["a", "b",]` | `["a", "b"]` |
| Virgule oubliée entre deux éléments | `{ "id": "a" } { "id": "b" }` | `{ "id": "a" }, { "id": "b" }` |
| Commentaire | `// ma note` | *(interdit : aucun commentaire possible)* |
| Guillemets simples | `'texte'` | `"texte"` |
| Guillemets doubles dans un texte | `"Il dit "bonjour""` | `"Il dit « bonjour »"` |
| Nombre entre guillemets | `"tempsMinimumSecondes": "20"` | `"tempsMinimumSecondes": 20` |

Astuce : dans un texte, utilisez les guillemets français « » plutôt que `"`. L'apostrophe `'` ne pose pas de problème.

Pour vérifier un fichier, vous pouvez coller son contenu dans un validateur JSON en ligne. Le contenu des séances n'est pas confidentiel, mais ne collez jamais un fichier de travail d'un stagiaire.

### ⚠️ Les identifiants (`id`)

- Un exercice a un `id` de la forme `s<séance>-e<numéro>` : `s2-e07` = séance 2, exercice 07.
- Chaque `id` doit être **unique dans tout le projet**.
- **Ne modifiez jamais l'`id` d'un exercice déjà utilisé par des stagiaires**, et ne le réutilisez jamais pour un autre exercice. Le travail des stagiaires est enregistré par `id`. Si vous changez l'`id`, leur réponse est perdue. Si vous réutilisez un `id`, leur ancienne réponse s'affiche sur le nouvel exercice.
- Pour ajouter un exercice entre deux autres, prenez simplement le numéro libre suivant (par exemple `s2-e16`). **L'ordre d'affichage est l'ordre dans le fichier**, pas l'ordre des numéros.
- Pour retirer un exercice, supprimez-le. Ne donnez plus jamais son `id` à un autre exercice.

---

## 6. Format JSON d'une séance

```json
{
  "version": 1,
  "id": "seance-2",
  "titre": "Comment ça marche ?",
  "objectifs": [
    "comprendre comment votre ordinateur et le serveur se parlent ;",
    "découper une adresse web en plusieurs parties."
  ],
  "etapes": [
    {
      "id": "s2-etape-1",
      "titre": "Rappel : le client et le serveur",
      "blocs": [
        { "type": "paragraphe", "texte": "On continue là où on s'était arrêtés." }
      ],
      "exercices": [
        { "id": "s2-e01", "type": "qcm_unique", "...": "voir la section 8" }
      ]
    }
  ]
}
```

| Champ | Obligatoire | Rôle |
|---|---|---|
| `version` | Oui | Version du format. Aujourd'hui : `1`. |
| `id` | Oui | Identifiant de la séance, par exemple `"seance-2"`. |
| `titre` | Oui | Titre, sans le numéro. L'application affiche « Séance 2 : Comment ça marche ? ». |
| `objectifs` | Non | Liste de textes affichée sur l'écran de présentation de la séance. |
| `etapes` | Oui | Liste ordonnée des étapes (au moins une). |

Chaque **étape** :

| Champ | Obligatoire | Rôle |
|---|---|---|
| `id` | Oui | Identifiant unique, par exemple `"s2-etape-1"`. Il apparaît dans l'adresse de la page. |
| `titre` | Oui | Titre de l'étape. |
| `blocs` | Oui | Liste des parties « à lire » (peut être vide `[]`). Voir section 7. |
| `exercices` | Non | Liste ordonnée des exercices de l'étape. Voir section 8. |

Déroulé à l'écran : présentation de la séance → étape 1 (à lire) → exercices de l'étape 1 → étape 2 (à lire) → exercices de l'étape 2 → etc. Chaque exercice a son propre écran. Le repère « Séance 2 › Étape 3 sur 5 › Exercice 4 sur 15 » est toujours visible en haut.

---

## 7. Les blocs « à lire »

Dans tous les textes, vous pouvez mettre des mots **en gras** en les entourant de deux étoiles : `"Le **serveur** répond."`

### Paragraphe

```json
{ "type": "paragraphe", "texte": "Une seule idée par phrase." }
```

### Sous-titre

```json
{ "type": "sous_titre", "texte": "Les favoris" }
```

### Liste (à puces ou numérotée)

```json
{
  "type": "liste",
  "numerotee": true,
  "elements": ["Ouvrez un nouvel onglet.", "Tapez l'adresse."]
}
```

`numerotee` est facultatif (`false` par défaut : liste à puces).

### Définitions

```json
{
  "type": "definitions",
  "elements": [
    { "terme": "Un serveur", "definition": "Un ordinateur qui garde les sites." }
  ]
}
```

### Encadré

```json
{
  "type": "encadre",
  "style": "attention",
  "titre": "Attention avant d'effacer",
  "texte": "Enregistrez d'abord votre travail dans un fichier."
}
```

- `style` : `"info"` (par défaut), `"attention"` ou `"astuce"`. Chaque style a son icône et sa couleur, mais c'est le **titre** qui porte le message : écrivez-le toujours.
- `titre` : facultatif, recommandé.
- `texte` et/ou `elements` (une liste de textes) : au moins l'un des deux.

### Illustration

```json
{
  "type": "illustration",
  "fichier": "assets/images/07-guide-depannage-logigramme.png",
  "alt": "Schéma en 5 cases reliées par des flèches. Les 5 étapes sont écrites juste après l'image.",
  "legende": "Le guide de dépannage en 5 étapes.",
  "transcription": {
    "titre": "Les 5 étapes du schéma :",
    "numerotee": true,
    "elements": ["J'observe.", "Je cherche la cause."]
  }
}
```

| Champ | Obligatoire | Rôle |
|---|---|---|
| `fichier` | Oui | Chemin **relatif** de l'image, en minuscules. |
| `alt` | Oui | Texte alternatif lu par les lecteurs d'écran. Mettre `""` seulement pour une image purement décorative. |
| `legende` | Non | Légende visible sous l'image. |
| `transcription` | Non, mais **obligatoire si l'image contient du texte ou un schéma** | Le contenu de l'image, écrit en texte dans la page (règle d'accessibilité). |

### Tableau

```json
{
  "type": "tableau",
  "legende": "Grille pour vérifier une source",
  "entetes": ["À regarder", "Bon signe", "Mauvais signe"],
  "lignes": [
    ["L'auteur", "Nom et métier affichés", "Anonyme ou pseudo"]
  ]
}
```

La première case de chaque ligne sert de titre à la ligne. Sur un petit écran, le tableau défile horizontalement dans son cadre.

---

## 8. Les 3 types d'exercices

### Champs communs à tous les types

| Champ | Type | Obligatoire | Rôle |
|---|---|---|---|
| `id` | texte | **Oui** | Forme `s2-e07`. Unique. **Ne jamais modifier ni réutiliser.** |
| `type` | texte | **Oui** | `"qcm_unique"`, `"qcm_multiple"` ou `"texte_libre"`. |
| `question` | texte | **Oui** | Une seule question, en FALC. |
| `difficulte` | texte | Non, recommandé | `"facile"`, `"moyen"` ou `"difficile"`. **Pas encore affiché à l'écran** : l'usage reste à définir. |
| `tempsMinimumSecondes` | nombre entier ≥ 0 | Non, recommandé | Délai avant de pouvoir valider. Absent ou `0` = pas de délai. Écrire le nombre **sans guillemets**. |

Conseils pour le délai :

- QCM court : pas de délai (champ absent), ou 10 secondes.
- Cas pratique avec un long énoncé : 15 à 20 secondes.
- Réponse à écrire (texte libre) : 30 à 60 secondes.
- Le délai freine la précipitation. Il ne prouve pas que le stagiaire a lu.

### 8.1 `qcm_unique` — une seule bonne réponse

Affiché avec des boutons radio : une seule réponse possible.

```json
{
  "id": "s1-e04",
  "type": "qcm_unique",
  "question": "Qu'est-ce qu'un navigateur ?",
  "options": [
    { "id": "a", "texte": "Un ordinateur géant qui garde les sites." },
    { "id": "b", "texte": "L'application pour voir les pages web, comme Chrome, Firefox ou Edge." },
    { "id": "c", "texte": "Tous les ordinateurs connectés du monde." }
  ],
  "reponseCorrecte": "b",
  "explicationCorrection": "Le navigateur est l'application qui vous montre les pages web.",
  "difficulte": "facile",
  "tempsMinimumSecondes": 0
}
```

| Champ | Obligatoire | Rôle |
|---|---|---|
| `options` | Oui | Au moins 2 options `{ "id", "texte" }`. Chaque `id` d'option est unique dans l'exercice. |
| `reponseCorrecte` | Oui | L'`id` de la bonne option. Il doit exister dans `options`. |
| `explicationCorrection` | Oui | Affichée après validation, que la réponse soit juste ou fausse. |

### 8.2 `qcm_multiple` — plusieurs bonnes réponses

Affiché avec des cases à cocher. Le message « Plusieurs réponses sont possibles. Cochez toutes les bonnes réponses. » s'affiche automatiquement.

La réponse est **juste seulement si toutes les bonnes cases sont cochées, et aucune mauvaise**. La correction détaille chaque option : bonne réponse cochée, bonne réponse oubliée, mauvaise réponse cochée…

```json
{
  "id": "s3-e02",
  "type": "qcm_multiple",
  "question": "Parmi ces noms, lesquels sont des moteurs de recherche ?",
  "options": [
    { "id": "a", "texte": "Google" },
    { "id": "b", "texte": "Firefox" },
    { "id": "c", "texte": "Qwant" }
  ],
  "reponsesCorrectes": ["a", "c"],
  "explicationCorrection": "Google et Qwant sont des moteurs de recherche. Firefox est un navigateur.",
  "difficulte": "moyen",
  "tempsMinimumSecondes": 10
}
```

| Champ | Obligatoire | Rôle |
|---|---|---|
| `options` | Oui | Comme pour `qcm_unique`. |
| `reponsesCorrectes` | Oui | **Liste** des `id` des bonnes options (au moins un). Attention au `s` et aux crochets `[ ]`. |
| `explicationCorrection` | Oui | Affichée après validation. |

### 8.3 `texte_libre` — le stagiaire écrit sa réponse

Deux modes, avec le champ `mode`.

**Mode `"modele"` (par défaut)** : pas de note. La correction affiche la réponse du stagiaire et un exemple de réponse. Idéal pour « expliquez avec vos mots ».

```json
{
  "id": "s1-e12",
  "type": "texte_libre",
  "mode": "modele",
  "question": "Expliquez avec vos mots : qu'est-ce qu'un navigateur ?",
  "reponseModele": "Un navigateur est une application pour voir les sites web.",
  "explicationCorrection": "Votre réponse n'a pas besoin d'être identique.",
  "difficulte": "moyen",
  "tempsMinimumSecondes": 30
}
```

**Mode `"comparaison"`** : la réponse est comparée à une liste de réponses acceptées. Pour les réponses courtes et précises (un mot, une partie d'adresse).

```json
{
  "id": "s2-e03",
  "type": "texte_libre",
  "mode": "comparaison",
  "question": "Voici une adresse : www.youtube.com/watch?v=abc123. Quel est le nom du site ?",
  "reponsesAcceptees": ["youtube", "youtube.com", "www.youtube.com"],
  "fautesAcceptees": 1,
  "reponseModele": "youtube",
  "explicationCorrection": "Le nom du site est « youtube ». La terminaison est « .com ».",
  "difficulte": "facile"
}
```

| Champ | Obligatoire | Rôle |
|---|---|---|
| `mode` | Non | `"modele"` (par défaut) ou `"comparaison"`. |
| `reponseModele` | Oui | L'exemple de réponse affiché dans la correction. |
| `reponsesAcceptees` | Oui en mode `"comparaison"` | Liste de toutes les formes acceptées. Pensez aux variantes. |
| `fautesAcceptees` | Non | Nombre de fautes de frappe tolérées (1 par défaut). Mettre `0` pour exiger la réponse exacte. |
| `explicationCorrection` | Non, recommandé | Affichée après validation. |

Comment marche la comparaison :

- les **majuscules**, les **accents**, les **espaces en trop** et la **ponctuation finale** ne comptent pas ;
- une faute de frappe est acceptée par défaut (« youtub » = « youtube ») ;
- **les réponses de moins de 4 caractères doivent être exactes** (sinon « .fr » et « .de » seraient confondus) ;
- pour une question ouverte, préférez le mode `"modele"` : une comparaison automatique mettrait des stagiaires en échec sans raison.

⚠️ **Ne posez pas de question personnelle en texte libre** (santé, handicap, difficultés personnelles). Les réponses sont enregistrées dans le navigateur et dans le fichier d'export. C'est pour cette raison que la grille « Moi et le web » se remplit sur papier (voir CLAUDE.md, D-008).

---

## 9. Les textes de l'interface

Tous les textes des boutons et des messages sont dans `content/interface.json`. Vous pouvez les reformuler librement.

- Les repères entre accolades, comme `{numero}` ou `{nom}`, sont remplacés automatiquement. **Gardez-les tels quels.**
- Ne changez pas les **noms des champs** (à gauche des deux-points), seulement les textes (à droite).

**Ajouter une séance** : créer `content/seance-6.json` (même format), puis l'ajouter à la liste `"seances"` de `content/interface.json` :

```json
"seances": ["seance-1.json", "seance-2.json", "seance-3.json", "seance-4.json", "seance-5.json", "seance-6.json"]
```

**Seule exception** : le message affiché quand l'application ne peut pas démarrer est écrit dans `index.html`. Il ne peut pas venir d'un JSON, car il sert justement quand les JSON ne se chargent pas.

---

## 10. Sauvegarde, export et import

### Sauvegarde automatique

À chaque validation, la réponse est enregistrée dans le `localStorage` du navigateur. Un avertissement reste **visible en permanence** en haut de chaque page :

> Votre travail est gardé sur cet ordinateur seulement. Pour le garder, cliquez sur « Enregistrer mon travail dans un fichier ».

Si le navigateur bloque cette sauvegarde, l'application le détecte, affiche un avertissement et reste utilisable. Le travail est alors perdu à la fermeture de la page, sauf s'il est exporté.

### Exporter (« Enregistrer mon travail dans un fichier »)

Télécharge un fichier `mon-travail-culture-web-AAAA-MM-JJ.json`, souvent dans le dossier « Téléchargements ». Le stagiaire le garde sur une clé USB ou dans ses documents.

Contenu du fichier :

```json
{
  "format": "culture-web-progression",
  "version": 1,
  "dateExport": "2026-09-14T09:30:00.000Z",
  "exercices": {
    "s1-e02": { "reponse": "b", "valide": true, "correctionVue": true, "resultat": "juste", "date": "2026-09-14T09:12:00.000Z" }
  }
}
```

Le fichier contient **seulement** : les identifiants d'exercices, les réponses, l'état (validé, correction vue), le résultat et la date. **Aucun nom, aucune donnée de santé ou de handicap.**

### Importer (« Reprendre un travail enregistré »)

1. Le stagiaire choisit son fichier.
2. L'application **vérifie le fichier avant de toucher à quoi que ce soit** : est-ce un JSON ? est-ce un fichier de cet atelier ? est-ce la bonne version ?
3. Si le fichier est correct, une fenêtre résume son contenu et demande une confirmation. Le bouton sélectionné en premier est « Non, garder mon travail actuel ».
4. Seulement après confirmation, le travail du navigateur est **remplacé** par celui du fichier.

---

## 11. Limites connues

### Le verrouillage n'est PAS un dispositif anti-triche

Le verrouillage des corrections et le délai minimum sont des **garde-fous pédagogiques contre la précipitation**. Ils ne protègent pas contre une fraude volontaire :

- les fichiers JSON sont **publics** : les bonnes réponses sont lisibles par toute personne qui ouvre les fichiers ou les outils de développement du navigateur ;
- le travail enregistré (`localStorage`) et les fichiers exportés peuvent être **modifiés à la main** ;
- un fichier exporté par un stagiaire peut être importé par un autre.

C'est un choix assumé (CLAUDE.md, D-002) : une vraie protection demanderait un serveur. La présence du formateur dans la salle complète le dispositif. **Ne présentez jamais ce mécanisme comme infalsifiable.**

### Le travail peut être perdu

Le travail est gardé **dans un navigateur, sur un ordinateur**. Il est perdu en cas de :

- changement d'ordinateur ou de navigateur ;
- nettoyage du cache ou des données de navigation (y compris « Effacer l'historique » avec les données de sites) ;
- navigation privée ;
- réinitialisation automatique des postes à la déconnexion, selon la configuration de l'ESRP (**à vérifier avec le service informatique**).

**Seule parade : l'export du travail dans un fichier**, puis l'import sur le nouveau poste.

### Autres limites

- **Poste partagé** : deux stagiaires qui utilisent le même poste avec la même session Windows partagent le même travail. Le second verra les réponses et corrections du premier. Point ouvert, non traité (voir CLAUDE.md, section 2.4). En attendant : une session Windows par stagiaire, ou export puis effacement des données du site entre deux stagiaires.
- **Pas de nouvelle tentative** : un exercice validé ne peut pas être refait, même après import ou rechargement.
- **Double-clic sur `index.html`** : ne fonctionne pas (voir section 2).
- **Le délai repart de zéro** si la page est rechargée.
- **`difficulte`** est vérifié mais pas encore utilisé à l'écran.
- **Navigateurs testés** : Chrome et Edge récents (tests automatiques). À vérifier sur Firefox et sur les navigateurs des postes de l'ESRP.
- **Tests d'accessibilité manuels à faire** avant la mise en service : parcours au clavier seul, parcours avec NVDA, zoom à 200 %, vérification des contrastes avec un outil dédié.

---

## 12. Notes sur le contenu du livret

Le livret fourni est un **guide pour le formateur** : il ne contient ni QCM ni bonnes réponses. Les exercices de l'application ont donc été **rédigés à partir de ce guide**. **Ils sont à relire et valider par le formateur** avant la mise en service.

Choix faits lors de l'adaptation :

- **Seul le contenu destiné aux stagiaires est repris.** Les parties pour le formateur (grilles d'observation, rôle du formateur, équipe pluridisciplinaire, positionnement initial) ne sont pas dans l'application.
- **Tutoiement du guide remplacé par le vouvoiement**, comme dans les consignes du guide et les textes de l'interface.
- **« Pôle Emploi » remplacé par « France Travail »** (nouveau nom depuis 2024) : adresse `francetravail.fr`, exemple de faux site `francetravaill.com`.
- **Exemple de mot de passe fort corrigé** : celui du guide (`Mq7$Lp2@kX9`) n'avait que 11 caractères, alors que la règle en demande au moins 12. Nouvel exemple : `Mq7$Lp2@kX9#`.
- **Cadenas et HTTPS** : ajout systématique de la nuance « le cadenas ne prouve pas que le site est honnête », pour ne pas laisser croire l'inverse.
- **Moteur de recherche** : l'explication du guide (« il compte combien de fois le mot-clé apparaît ») a été simplifiée en « il montre d'abord les pages qui semblent les plus utiles ».
- **Exemple de recherche précise** : « Windows 10 … code erreur 0x00000001 » remplacé par « Windows 11 ordinateur ne démarre pas écran noir ».
- **Grille « Moi et le web »** : présentée dans la séance 5 mais **non enregistrée dans l'application**. Elle contient des besoins d'adaptation proches de données de santé. Elle se remplit sur papier, avec le formateur (CLAUDE.md, D-008).

À propos des illustrations :

- **Illustration 03 (anatomie d'une URL)** : les flèches du bas relient les parties de façon illogique (le chemin est relié à la ville, le protocole au numéro). La transcription ne reprend pas ces correspondances. L'analogie correcte est expliquée dans le texte. **Il est conseillé de refaire cette image.**
- **Illustration 08 (10 règles de sécurité)** : l'affiche d'origine portait un **logo RATP**. Il a été masqué dans la version publiée. Les règles de l'affiche ne sont pas les mêmes que celles du guide : les deux listes sont données, avec une explication des termes nouveaux (2FA, Wi-Fi public, sauvegarde).
- **Illustration 05** : la page « fiable » a un cadenas, la page « douteuse » n'en a pas. Le texte à côté rappelle que le cadenas ne suffit pas.
- Les 9 images ont été renommées (minuscules, sans espace ni accent) et compressées : environ 3,6 Mo au total au lieu de 11 Mo.
- **Les 9 illustrations ont été générées par une intelligence artificielle.** Les fichiers d'origine contenaient un marquage de provenance (« Content Credentials », C2PA), perdu lors de la compression. Pour rester transparent, le pied de page de l'application indique : « Les illustrations ont été créées avec une intelligence artificielle. » Une image générée peut reproduire une marque ou un logo existant (c'était le cas du logo RATP) : vérifiez chaque nouvelle image avant de l'ajouter.

---

## 13. Pour les développeurs : créer un nouveau type d'exercice

Contraintes du projet : HTML, CSS et JavaScript **vanilla**, modules ES natifs, **aucune dépendance**, aucun CDN, aucun build. Code et commentaires en français.

1. Créer `js/types/mon-type.js` qui exporte un objet respectant ce contrat :

```js
export default {
  // Valeur du champ "type" dans le JSON
  type: 'mon_type',

  // Vérifie les champs propres à ce type. Renvoie une liste d'erreurs { champ, code, valeur?, valeurs? }.
  // Les champs communs (id, type, difficulte, tempsMinimumSecondes) sont déjà vérifiés par le chargeur.
  // "code" renvoie à un message de content/interface.json (erreurs.codes).
  verifierStructure(exercice) { return []; },

  // Construit le HTML accessible de la question dans le conteneur, SANS la correction.
  // "textes" = rubrique types.mon_type de content/interface.json.
  afficher(exercice, conteneur, textes) {},

  // Renvoie la réponse du stagiaire (texte ou liste de textes), ou null si pas de réponse.
  lireReponse(conteneur) {},

  // Remet à l'écran une réponse déjà enregistrée (après rechargement).
  restaurerReponse(conteneur, reponse) {},

  // true (juste), false (faux) ou null (non noté).
  estCorrecte(exercice, reponse) {},

  // Détail de la correction : liste de { etat: 'juste' | 'faux' | 'neutre', libelle, texte }.
  // Le moteur se charge de l'afficher.
  decrireCorrection(exercice, reponse, textes) { return []; }
};
```

2. L'ajouter dans `js/types/registre.js`.
3. Ajouter ses textes dans `content/interface.json` (rubrique `types`) et ses éventuels codes d'erreur (rubrique `erreurs.codes`).
4. Documenter ses champs JSON dans ce README.
5. Consigner la décision dans CLAUDE.md, section 6.

Un type d'exercice **ne doit jamais** afficher la correction, gérer le délai, bloquer les champs ou écrire dans le `localStorage`. C'est le rôle du moteur (`moteur-exercices.js`). Ainsi, un nouveau type ne peut pas oublier le verrouillage.

Rappel : **aucun texte affiché ne doit être écrit dans le JavaScript**. Tous les textes viennent de `content/`.
