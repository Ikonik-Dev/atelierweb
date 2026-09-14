/*
 * qcm-unique.js — Type d'exercice "qcm_unique" : une seule bonne réponse.
 *
 * Rappel du contrat (voir CLAUDE.md, section 3.3, et README) :
 * un type d'exercice ne gère NI le délai, NI le verrouillage de la correction,
 * NI la sauvegarde. C'est le moteur (moteur-exercices.js) qui s'en occupe.
 */

import { verifierTexteObligatoire } from '../outils.js';
import { verifierQuestionEtOptions, construireQcm, valeursCochees, recocher, texteOption } from './commun-qcm.js';

export default {
  // Valeur du champ "type" dans le JSON
  type: 'qcm_unique',

  // Vérifie que l'exercice est complet. Renvoie une liste d'erreurs (vide si tout va bien).
  verifierStructure(exercice) {
    const erreurs = [];
    const identifiants = verifierQuestionEtOptions(exercice, erreurs);
    verifierTexteObligatoire(exercice, 'reponseCorrecte', erreurs);
    if (typeof exercice.reponseCorrecte === 'string' && identifiants.size > 0 && !identifiants.has(exercice.reponseCorrecte)) {
      erreurs.push({ champ: 'reponseCorrecte', code: 'reponseInexistante', valeur: exercice.reponseCorrecte });
    }
    verifierTexteObligatoire(exercice, 'explicationCorrection', erreurs);
    return erreurs;
  },

  // Construit la question et les boutons radio, SANS la correction.
  afficher(exercice, conteneur, textes) {
    construireQcm(exercice, conteneur, 'radio', textes.consigne);
  },

  // Renvoie l'id de l'option choisie, ou null si rien n'est choisi.
  lireReponse(conteneur) {
    return valeursCochees(conteneur)[0] ?? null;
  },

  // Remet à l'écran une réponse déjà enregistrée (après un rechargement de la page).
  restaurerReponse(conteneur, reponse) {
    recocher(conteneur, [reponse]);
  },

  // true si la réponse est correcte, false sinon.
  estCorrecte(exercice, reponse) {
    return reponse === exercice.reponseCorrecte;
  },

  // Décrit le détail de la correction. Le moteur se charge de l'afficher.
  decrireCorrection(exercice, reponse, textes) {
    const juste = reponse === exercice.reponseCorrecte;
    const lignes = [{ etat: juste ? 'juste' : 'faux', libelle: textes.votreReponse, texte: texteOption(exercice, reponse) }];
    if (!juste) {
      lignes.push({ etat: 'juste', libelle: textes.bonneReponse, texte: texteOption(exercice, exercice.reponseCorrecte) });
    }
    return lignes;
  }
};
