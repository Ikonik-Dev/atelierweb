/*
 * outils.js — Petites fonctions utiles partout dans l'application.
 *
 * Ce fichier ne contient AUCUN texte affiché : tous les textes viennent
 * des fichiers JSON du dossier content/.
 */

/**
 * Remplace les repères {nom} d'un modèle de texte par des valeurs.
 * Exemple : formater("Séance {numero}", { numero: 2 }) donne "Séance 2".
 */
export function formater(modele, valeurs = {}) {
  return String(modele ?? '').replace(/\{(\w+)\}/g, (repere, cle) =>
    cle in valeurs ? String(valeurs[cle]) : repere
  );
}

/**
 * Crée un élément HTML.
 * - balise : nom de la balise ('p', 'button'...)
 * - attributs : objet { nom: valeur }. "texte" remplit le contenu texte,
 *   "classe" remplit l'attribut class. Une valeur false ou null est ignorée.
 * - enfants : liste d'éléments à ajouter dedans.
 */
export function creer(balise, attributs = {}, enfants = []) {
  const element = document.createElement(balise);
  for (const [nom, valeur] of Object.entries(attributs)) {
    if (valeur === false || valeur === null || valeur === undefined) continue;
    if (nom === 'texte') element.textContent = valeur;
    else if (nom === 'classe') element.className = valeur;
    else element.setAttribute(nom, valeur === true ? '' : valeur);
  }
  for (const enfant of enfants) {
    if (enfant) element.append(enfant);
  }
  return element;
}

/**
 * Ajoute un texte dans un élément, en transformant **mot** en gras.
 * On n'utilise jamais innerHTML : un texte du JSON ne peut donc pas
 * injecter de code HTML dans la page.
 */
export function ajouterTexteRiche(parent, texte) {
  const morceaux = String(texte ?? '').split(/\*\*(.+?)\*\*/g);
  morceaux.forEach((morceau, index) => {
    if (morceau === '') return;
    // Les morceaux d'index impair sont ceux qui étaient entre ** **
    parent.append(index % 2 === 1 ? creer('strong', { texte: morceau }) : document.createTextNode(morceau));
  });
  return parent;
}

/** Fabrique un identifiant HTML unique (pour relier un libellé à un champ, par exemple). */
let compteurIdentifiants = 0;
export function identifiantUnique(prefixe) {
  compteurIdentifiants += 1;
  return `${prefixe}-${compteurIdentifiants}`;
}

/* ------------------------------------------------------------------
 * Aides à la vérification des fichiers JSON.
 * Chaque erreur est un objet { champ, code, valeur?, valeurs? }.
 * Le "code" renvoie à un message du fichier content/interface.json
 * (rubrique erreurs.codes).
 * ------------------------------------------------------------------ */

/** Vrai si la valeur est un texte non vide. */
export function estTexteNonVide(valeur) {
  return typeof valeur === 'string' && valeur.trim() !== '';
}

/** Vérifie qu'un champ obligatoire est un texte non vide. */
export function verifierTexteObligatoire(objet, champ, erreurs, prefixe = '') {
  const valeur = objet?.[champ];
  if (valeur === undefined || valeur === null || valeur === '') {
    erreurs.push({ champ: prefixe + champ, code: 'champManquant' });
  } else if (!estTexteNonVide(valeur)) {
    erreurs.push({ champ: prefixe + champ, code: typeof valeur === 'string' ? 'champManquant' : 'typeTexte' });
  }
}

/** Vérifie qu'un champ facultatif, s'il est présent, est un texte. */
export function verifierTexteFacultatif(objet, champ, erreurs, prefixe = '') {
  const valeur = objet?.[champ];
  if (valeur !== undefined && typeof valeur !== 'string') {
    erreurs.push({ champ: prefixe + champ, code: 'typeTexte' });
  }
}

/** Vérifie qu'un champ est une liste de textes non vides. */
export function verifierListeDeTextes(objet, champ, erreurs, { obligatoire = true, prefixe = '' } = {}) {
  const valeur = objet?.[champ];
  if (valeur === undefined) {
    if (obligatoire) erreurs.push({ champ: prefixe + champ, code: 'champManquant' });
    return;
  }
  if (!Array.isArray(valeur)) {
    erreurs.push({ champ: prefixe + champ, code: 'typeListe' });
    return;
  }
  if (obligatoire && valeur.length === 0) {
    erreurs.push({ champ: prefixe + champ, code: 'listeVide' });
  }
  valeur.forEach((element, index) => {
    if (!estTexteNonVide(element)) erreurs.push({ champ: `${prefixe}${champ}[${index + 1}]`, code: 'typeTexte' });
  });
}

/** Vrai si l'objet est un objet JSON { } (et pas une liste ni null). */
export function estObjet(valeur) {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}
