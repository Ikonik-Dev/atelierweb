/*
 * registre.js — Liste des types d'exercices connus.
 *
 * Pour créer un NOUVEAU type d'exercice (travail de développeur) :
 *   1. créer un fichier dans js/types/ qui respecte le contrat (voir README) ;
 *   2. l'importer ci-dessous et l'ajouter à la liste TYPES ;
 *   3. documenter ses champs JSON dans le README.
 *
 * Pour AJOUTER UN EXERCICE d'un type existant : ne touchez pas à ce fichier.
 * Modifiez seulement un fichier JSON du dossier content/.
 */

import qcmUnique from './qcm-unique.js';
import qcmMultiple from './qcm-multiple.js';
import texteLibre from './texte-libre.js';

const TYPES = [qcmUnique, qcmMultiple, texteLibre];

const typesParNom = new Map(TYPES.map((type) => [type.type, type]));

/** Renvoie le type d'exercice correspondant au champ "type" du JSON, ou null. */
export function obtenirType(nom) {
  return typesParNom.get(nom) ?? null;
}

/** Noms de tous les types connus (pour les messages d'erreur). */
export function nomsDesTypes() {
  return [...typesParNom.keys()];
}
