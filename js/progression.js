/*
 * progression.js — Sauvegarde du travail du stagiaire.
 *
 * Où est gardé le travail ?
 *   Dans le "localStorage" du navigateur : une petite zone de stockage
 *   propre à CE navigateur sur CET ordinateur. Rien n'est envoyé sur Internet.
 *
 * Limites connues (voir README) :
 *   - le travail est perdu si on change d'ordinateur ou de navigateur,
 *     si on efface les données de navigation, ou en navigation privée ;
 *   - ce n'est PAS un verrou anti-triche : toute personne qui ouvre les
 *     outils de développement du navigateur peut lire ou modifier ces données.
 *     C'est un simple garde-fou pédagogique contre la précipitation.
 *
 * La seule parade à la perte : l'export du travail dans un fichier,
 * puis l'import de ce fichier sur un autre poste.
 *
 * Ce que contient la sauvegarde, pour chaque exercice validé :
 *   { reponse, valide, correctionVue, resultat, date }
 * Aucun nom, aucune donnée de santé ou de handicap.
 */

const CLE_STOCKAGE = 'culture-web-progression';
const CLE_SECOURS = 'culture-web-progression-illisible';
export const FORMAT_FICHIER = 'culture-web-progression';
export const VERSION_FICHIER = 1;
const RESULTATS_POSSIBLES = ['juste', 'faux', 'non_note'];

// Copie en mémoire du travail : l'application reste utilisable
// même si le localStorage est bloqué par le navigateur.
let travail = {};
let stockageDisponible = false;

/** Teste si le localStorage peut vraiment être utilisé (il peut être bloqué). */
function testerStockage() {
  try {
    const cleTest = `${CLE_STOCKAGE}-test`;
    window.localStorage.setItem(cleTest, '1');
    window.localStorage.removeItem(cleTest);
    return true;
  } catch {
    return false;
  }
}

/** Écrit le travail dans le localStorage. Renvoie true si l'écriture a réussi. */
function ecrireStockage() {
  if (!stockageDisponible) return false;
  try {
    const contenu = { format: FORMAT_FICHIER, version: VERSION_FICHIER, exercices: travail };
    window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(contenu));
    return true;
  } catch {
    return false;
  }
}

/**
 * Vérifie qu'une entrée d'exercice a la bonne forme.
 * Sert au démarrage (données du localStorage) et à l'import d'un fichier.
 */
function entreeValide(entree) {
  if (typeof entree !== 'object' || entree === null || Array.isArray(entree)) return false;
  if (entree.valide !== true) return false;
  if (typeof entree.correctionVue !== 'boolean') return false;
  if (!RESULTATS_POSSIBLES.includes(entree.resultat)) return false;
  const reponse = entree.reponse;
  const reponseOk =
    typeof reponse === 'string' ||
    (Array.isArray(reponse) && reponse.every((element) => typeof element === 'string'));
  return reponseOk;
}

/** Garde uniquement les entrées bien formées, avec uniquement les champs utiles. */
function nettoyer(exercices) {
  const propre = {};
  for (const [id, entree] of Object.entries(exercices)) {
    if (typeof id !== 'string' || !entreeValide(entree)) continue;
    propre[id] = {
      reponse: entree.reponse,
      valide: true,
      correctionVue: entree.correctionVue,
      resultat: entree.resultat,
      date: typeof entree.date === 'string' ? entree.date : ''
    };
  }
  return propre;
}

/**
 * À appeler une fois au démarrage.
 * Renvoie { disponible } : false si le navigateur bloque la sauvegarde.
 */
export function initialiserProgression() {
  stockageDisponible = testerStockage();
  if (!stockageDisponible) return { disponible: false };

  const brut = window.localStorage.getItem(CLE_STOCKAGE);
  if (brut) {
    try {
      const donnees = JSON.parse(brut);
      travail = donnees && typeof donnees.exercices === 'object' ? nettoyer(donnees.exercices) : {};
    } catch {
      // Données abîmées : on les met de côté au lieu de les écraser sans trace.
      try { window.localStorage.setItem(CLE_SECOURS, brut); } catch { /* rien à faire */ }
      travail = {};
    }
  }
  return { disponible: true };
}

export function sauvegardeDisponible() {
  return stockageDisponible;
}

/** Renvoie l'état enregistré d'un exercice, ou null s'il n'a jamais été validé. */
export function lireExercice(id) {
  return travail[id] ? { ...travail[id] } : null;
}

/**
 * Enregistre (ou complète) l'état d'un exercice.
 * Seul le moteur d'exercices appelle cette fonction.
 * Renvoie true si le travail est bien écrit sur l'ordinateur,
 * false s'il est seulement gardé en mémoire (sauvegarde bloquée).
 */
export function enregistrerExercice(id, changements) {
  travail[id] = { ...(travail[id] || {}), ...changements };
  return ecrireStockage();
}

/** Compte les exercices validés parmi une liste d'identifiants. */
export function compterFaits(identifiants) {
  return identifiants.filter((id) => travail[id]?.valide).length;
}

/** Nombre total d'exercices validés (tous confondus). */
export function nombreTotalFaits() {
  return Object.keys(travail).length;
}

/**
 * Télécharge un fichier .json qui contient le travail.
 * Renvoie true si le téléchargement a pu être lancé.
 */
export function exporterProgression(nomFichier) {
  try {
    const contenu = {
      format: FORMAT_FICHIER,
      version: VERSION_FICHIER,
      dateExport: new Date().toISOString(),
      exercices: travail
    };
    const fichier = new Blob([JSON.stringify(contenu, null, 2)], { type: 'application/json' });
    const adresse = URL.createObjectURL(fichier);
    const lien = document.createElement('a');
    lien.href = adresse;
    lien.download = nomFichier;
    document.body.append(lien);
    lien.click();
    lien.remove();
    // On libère la mémoire un peu plus tard, une fois le téléchargement parti.
    setTimeout(() => URL.revokeObjectURL(adresse), 10000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lit le texte d'un fichier importé et vérifie son format AVANT tout remplacement.
 * Ne modifie rien. Renvoie :
 *   { ok: false, code: 'importErreurLecture' | 'importErreurFormat' | 'importErreurVersion' }
 *   { ok: true, exercices, nombre, dateExport }
 */
export function analyserFichierImport(texte) {
  let donnees;
  try {
    donnees = JSON.parse(texte);
  } catch {
    return { ok: false, code: 'importErreurLecture' };
  }
  if (typeof donnees !== 'object' || donnees === null || donnees.format !== FORMAT_FICHIER) {
    return { ok: false, code: 'importErreurFormat' };
  }
  if (donnees.version !== VERSION_FICHIER) {
    return { ok: false, code: 'importErreurVersion' };
  }
  if (typeof donnees.exercices !== 'object' || donnees.exercices === null || Array.isArray(donnees.exercices)) {
    return { ok: false, code: 'importErreurFormat' };
  }
  const exercices = nettoyer(donnees.exercices);
  return {
    ok: true,
    exercices,
    nombre: Object.keys(exercices).length,
    dateExport: typeof donnees.dateExport === 'string' ? donnees.dateExport : ''
  };
}

/** Remplace tout le travail par celui d'un fichier déjà vérifié. Renvoie true si écrit sur l'ordinateur. */
export function remplacerProgression(exercices) {
  travail = nettoyer(exercices);
  return ecrireStockage();
}
