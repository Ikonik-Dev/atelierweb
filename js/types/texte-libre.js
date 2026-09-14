/*
 * texte-libre.js — Type d'exercice "texte_libre" : le stagiaire écrit sa réponse.
 *
 * Deux modes, au choix dans le JSON avec le champ "mode" :
 *   - "modele" (par défaut) : pas de note. La correction affiche une réponse modèle.
 *   - "comparaison" : la réponse est comparée à la liste "reponsesAcceptees".
 *     La comparaison ignore les majuscules, les accents, les espaces en trop
 *     et la ponctuation finale. Elle accepte quelques fautes de frappe
 *     (champ "fautesAcceptees", 1 par défaut). Les réponses de moins de
 *     4 caractères doivent être exactes (sinon ".fr" et ".de" seraient confondus).
 *
 * Comme pour tous les types : pas de délai, pas de verrouillage,
 * pas de sauvegarde ici. Le moteur s'en occupe.
 */

import {
  creer, ajouterTexteRiche, identifiantUnique,
  verifierTexteObligatoire, verifierTexteFacultatif, estTexteNonVide
} from '../outils.js';

const MODES = ['modele', 'comparaison'];
const FAUTES_PAR_DEFAUT = 1;
const LONGUEUR_MINIMUM_POUR_FAUTES = 4;

/** Met un texte sous une forme comparable : minuscules, sans accents, espaces simplifiés. */
function normaliser(texte) {
  return String(texte)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // enlève les accents
    .toLowerCase()
    .replace(/[«»"“”]/g, '')                             // enlève les guillemets
    .replace(/[’‘]/g, "'")                               // apostrophes typographiques
    .replace(/\s+/g, ' ')                                // espaces multiples
    .trim()
    .replace(/[.!?;:,]+$/, '')                           // ponctuation finale
    .trim();
}

/** Nombre minimum de lettres à changer pour passer d'un mot à l'autre (distance de Levenshtein). */
function distance(a, b) {
  const precedente = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonale = precedente[0];
    precedente[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temporaire = precedente[j];
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      precedente[j] = Math.min(precedente[j] + 1, precedente[j - 1] + 1, diagonale + cout);
      diagonale = temporaire;
    }
  }
  return precedente[b.length];
}

function modeDe(exercice) {
  return exercice.mode ?? 'modele';
}

export default {
  type: 'texte_libre',

  verifierStructure(exercice) {
    const erreurs = [];
    verifierTexteObligatoire(exercice, 'question', erreurs);
    verifierTexteObligatoire(exercice, 'reponseModele', erreurs);
    verifierTexteFacultatif(exercice, 'explicationCorrection', erreurs);

    const mode = modeDe(exercice);
    if (!MODES.includes(mode)) {
      erreurs.push({ champ: 'mode', code: 'valeurNonAutorisee', valeur: mode, valeurs: MODES.join(', ') });
    }
    if (mode === 'comparaison') {
      const acceptees = exercice.reponsesAcceptees;
      if (!Array.isArray(acceptees) || acceptees.length === 0) {
        erreurs.push({ champ: 'reponsesAcceptees', code: 'reponsesAccepteesManquantes' });
      } else {
        acceptees.forEach((reponse, index) => {
          if (!estTexteNonVide(reponse)) erreurs.push({ champ: `reponsesAcceptees[${index + 1}]`, code: 'typeTexte' });
        });
      }
    }
    const fautes = exercice.fautesAcceptees;
    if (fautes !== undefined && !(Number.isInteger(fautes) && fautes >= 0)) {
      erreurs.push({ champ: 'fautesAcceptees', code: 'typeEntierPositif' });
    }
    return erreurs;
  },

  // Construit la question et la zone de saisie, SANS la correction.
  afficher(exercice, conteneur, textes) {
    const mode = modeDe(exercice);
    const idChamp = identifiantUnique(`reponse-${exercice.id}`);
    const idConsigne = identifiantUnique('consigne');

    const libelle = ajouterTexteRiche(creer('label', { for: idChamp, classe: 'question' }), exercice.question);
    const consigne = creer('p', {
      classe: 'consigne',
      id: idConsigne,
      texte: mode === 'comparaison' ? textes.consigneComparaison : textes.consigneModele
    });
    // Réponse courte attendue : une ligne. Réponse modèle : plusieurs lignes.
    const champ = mode === 'comparaison'
      ? creer('input', { type: 'text', id: idChamp, 'aria-describedby': idConsigne, autocomplete: 'off', spellcheck: 'false' })
      : creer('textarea', { id: idChamp, rows: '5', 'aria-describedby': idConsigne });

    conteneur.append(creer('div', { classe: 'texte-libre' }, [libelle, consigne, champ]));
  },

  // Renvoie le texte écrit, ou null si la case est vide.
  lireReponse(conteneur) {
    const champ = conteneur.querySelector('input, textarea');
    const valeur = champ ? champ.value.trim() : '';
    return valeur === '' ? null : valeur;
  },

  restaurerReponse(conteneur, reponse) {
    const champ = conteneur.querySelector('input, textarea');
    if (champ) champ.value = typeof reponse === 'string' ? reponse : '';
  },

  // Mode "modele" : null (pas de note). Mode "comparaison" : true ou false.
  estCorrecte(exercice, reponse) {
    if (modeDe(exercice) !== 'comparaison') return null;
    const donnee = normaliser(reponse);
    const fautesMax = exercice.fautesAcceptees ?? FAUTES_PAR_DEFAUT;
    return exercice.reponsesAcceptees.some((acceptee) => {
      const attendue = normaliser(acceptee);
      if (donnee === attendue) return true;
      if (attendue.length < LONGUEUR_MINIMUM_POUR_FAUTES) return false;
      return distance(donnee, attendue) <= fautesMax;
    });
  },

  decrireCorrection(exercice, reponse, textes) {
    const note = this.estCorrecte(exercice, reponse);
    const etat = note === null ? 'neutre' : (note ? 'juste' : 'faux');
    const libelleModele = modeDe(exercice) === 'comparaison' ? textes.reponseAttendue : textes.reponseModele;
    return [
      { etat, libelle: textes.votreReponse, texte: reponse },
      { etat: 'neutre', libelle: libelleModele, texte: exercice.reponseModele }
    ];
  }
};
