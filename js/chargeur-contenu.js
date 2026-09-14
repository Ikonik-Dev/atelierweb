/*
 * chargeur-contenu.js — Chargement et contrôle des fichiers JSON du dossier content/.
 *
 * 1. Charge content/interface.json (textes de l'interface, liste des séances).
 * 2. Charge chaque fichier de séance.
 * 3. Vérifie chaque séance en détail. Si un fichier a un problème, la séance
 *    concernée est marquée « indisponible », avec la liste précise des erreurs
 *    (fichier, élément, champ). Les autres séances restent utilisables.
 *
 * Rappel : le format JSON n'accepte ni commentaires, ni virgule après
 * le dernier élément d'une liste.
 */

import { obtenirType, nomsDesTypes } from './types/registre.js';
import { verifierBlocs } from './blocs-lecon.js';
import {
  verifierTexteObligatoire, verifierListeDeTextes, estObjet
} from './outils.js';

const DOSSIER_CONTENU = 'content/';
const VERSIONS_SEANCE = [1];
const DIFFICULTES = ['facile', 'moyen', 'difficile'];
const FORME_ID_EXERCICE = /^s\d+-e\d+$/;

/**
 * Charge un fichier JSON.
 * Renvoie { ok: true, donnees } ou { ok: false, code, detail }.
 */
export async function chargerJson(fichier) {
  let reponse;
  try {
    // "no-cache" : le navigateur vérifie toujours si le fichier a changé,
    // pour que les modifications du formateur apparaissent tout de suite.
    reponse = await fetch(DOSSIER_CONTENU + fichier, { cache: 'no-cache' });
  } catch (erreur) {
    return { ok: false, code: 'fichierIntrouvable', detail: String(erreur) };
  }
  if (!reponse.ok) return { ok: false, code: 'fichierIntrouvable', detail: String(reponse.status) };

  const texte = await reponse.text();
  try {
    return { ok: true, donnees: JSON.parse(texte) };
  } catch (erreur) {
    return { ok: false, code: 'jsonInvalide', detail: erreur.message };
  }
}

/** Vérifie les champs communs à tous les exercices, puis les champs propres à son type. */
function verifierExercice(exercice, idsUtilises, fichier) {
  const erreurs = [];
  const id = typeof exercice.id === 'string' ? exercice.id : '';

  verifierTexteObligatoire(exercice, 'id', erreurs);
  if (id) {
    if (!FORME_ID_EXERCICE.test(id)) erreurs.push({ champ: 'id', code: 'formatIdExercice', valeur: id });
    if (idsUtilises.has(id)) erreurs.push({ champ: 'id', code: 'idEnDouble', valeur: `${id} — ${idsUtilises.get(id)}` });
  }

  const type = obtenirType(exercice.type);
  if (exercice.type === undefined) {
    erreurs.push({ champ: 'type', code: 'champManquant' });
  } else if (!type) {
    erreurs.push({ champ: 'type', code: 'typeInconnu', valeur: String(exercice.type), valeurs: nomsDesTypes().join(', ') });
  }

  if (exercice.difficulte !== undefined && !DIFFICULTES.includes(exercice.difficulte)) {
    erreurs.push({ champ: 'difficulte', code: 'valeurNonAutorisee', valeur: String(exercice.difficulte), valeurs: DIFFICULTES.join(', ') });
  }
  const temps = exercice.tempsMinimumSecondes;
  if (temps !== undefined && !(Number.isInteger(temps) && temps >= 0)) {
    erreurs.push({ champ: 'tempsMinimumSecondes', code: 'typeEntierPositif' });
  }

  // Vérifications propres au type (question, options, réponses...)
  if (type) erreurs.push(...type.verifierStructure(exercice));

  if (id && !idsUtilises.has(id)) idsUtilises.set(id, fichier);
  return erreurs.map((erreur) => ({ ...erreur, id: id || '?' }));
}

/** Vérifie un fichier de séance complet. Renvoie la liste des erreurs (vide si tout va bien). */
function verifierSeance(seance, fichier, idsUtilises) {
  const erreurs = [];
  const ajouter = (liste, id) => liste.forEach((erreur) => erreurs.push({ fichier, id: erreur.id ?? id, ...erreur }));

  if (!estObjet(seance)) {
    ajouter([{ champ: '-', code: 'typeObjet' }], '-');
    return erreurs;
  }

  const generales = [];
  if (!VERSIONS_SEANCE.includes(seance.version)) {
    generales.push({ champ: 'version', code: 'versionInconnue', valeur: String(seance.version), valeurs: VERSIONS_SEANCE.join(', ') });
  }
  verifierTexteObligatoire(seance, 'id', generales);
  verifierTexteObligatoire(seance, 'titre', generales);
  verifierListeDeTextes(seance, 'objectifs', generales, { obligatoire: false });
  if (typeof seance.id === 'string') {
    if (idsUtilises.has(seance.id)) generales.push({ champ: 'id', code: 'idEnDouble', valeur: seance.id });
    else idsUtilises.set(seance.id, fichier);
  }
  ajouter(generales, seance.id ?? '-');

  if (!Array.isArray(seance.etapes)) {
    ajouter([{ champ: 'etapes', code: seance.etapes === undefined ? 'champManquant' : 'typeListe' }], seance.id ?? '-');
    return erreurs;
  }
  if (seance.etapes.length === 0) ajouter([{ champ: 'etapes', code: 'listeVide' }], seance.id ?? '-');

  seance.etapes.forEach((etape, indexEtape) => {
    const nomEtape = `etapes[${indexEtape + 1}]`;
    if (!estObjet(etape)) {
      ajouter([{ champ: nomEtape, code: 'typeObjet' }], seance.id ?? '-');
      return;
    }
    const idEtape = typeof etape.id === 'string' ? etape.id : nomEtape;
    const erreursEtape = [];
    verifierTexteObligatoire(etape, 'id', erreursEtape);
    verifierTexteObligatoire(etape, 'titre', erreursEtape);
    if (typeof etape.id === 'string') {
      if (idsUtilises.has(etape.id)) erreursEtape.push({ champ: 'id', code: 'idEnDouble', valeur: etape.id });
      else idsUtilises.set(etape.id, fichier);
    }
    verifierBlocs(etape.blocs, erreursEtape, '');
    ajouter(erreursEtape, idEtape);

    if (etape.exercices === undefined) return;
    if (!Array.isArray(etape.exercices)) {
      ajouter([{ champ: 'exercices', code: 'typeListe' }], idEtape);
      return;
    }
    etape.exercices.forEach((exercice, indexExercice) => {
      if (!estObjet(exercice)) {
        ajouter([{ champ: `exercices[${indexExercice + 1}]`, code: 'typeObjet' }], idEtape);
        return;
      }
      ajouter(verifierExercice(exercice, idsUtilises, fichier), idEtape);
    });
  });
  return erreurs;
}

/**
 * Charge tout le contenu.
 * Renvoie :
 *   { ok: false, detail }  si content/interface.json est absent ou illisible
 *   { ok: true, textes, seances: [{ fichier, numero, donnees, erreurs }] }
 */
export async function chargerContenu() {
  const interfaceJson = await chargerJson('interface.json');
  if (!interfaceJson.ok) return { ok: false, detail: `content/interface.json : ${interfaceJson.code} ${interfaceJson.detail}` };

  const textes = interfaceJson.donnees;
  if (!estObjet(textes) || !Array.isArray(textes.seances)) {
    return { ok: false, detail: 'content/interface.json : "seances"' };
  }

  const fichiers = textes.seances.filter((fichier) => typeof fichier === 'string');
  const chargements = await Promise.all(fichiers.map((fichier) => chargerJson(fichier)));

  // Les identifiants doivent être uniques dans tout le projet : on les suit d'un fichier à l'autre.
  const idsUtilises = new Map();
  const seances = chargements.map((resultat, index) => {
    const fichier = `content/${fichiers[index]}`;
    const numero = index + 1;
    if (!resultat.ok) {
      const modele = textes.erreurs[resultat.code];
      return { fichier, numero, donnees: null, erreurs: [{ fichier, message: modele, detail: resultat.detail }] };
    }
    const erreurs = verifierSeance(resultat.donnees, fichier, idsUtilises);
    return { fichier, numero, donnees: erreurs.length === 0 ? resultat.donnees : null, erreurs, titreBrut: resultat.donnees?.titre };
  });

  return { ok: true, textes, seances };
}
