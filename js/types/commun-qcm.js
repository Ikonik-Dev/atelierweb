/*
 * commun-qcm.js — Morceaux partagés par les types "qcm_unique" et "qcm_multiple".
 *
 * Ce fichier n'est pas un type d'exercice : il évite seulement d'écrire
 * deux fois le même code.
 */

import { creer, ajouterTexteRiche, identifiantUnique, verifierTexteObligatoire, estObjet } from '../outils.js';

/** Vérifie la question et la liste des options { id, texte }. */
export function verifierQuestionEtOptions(exercice, erreurs) {
  verifierTexteObligatoire(exercice, 'question', erreurs);

  const options = exercice.options;
  if (options === undefined) {
    erreurs.push({ champ: 'options', code: 'champManquant' });
    return new Set();
  }
  if (!Array.isArray(options)) {
    erreurs.push({ champ: 'options', code: 'typeListe' });
    return new Set();
  }
  if (options.length < 2) erreurs.push({ champ: 'options', code: 'optionsInsuffisantes' });

  const identifiants = new Set();
  options.forEach((option, index) => {
    const prefixe = `options[${index + 1}].`;
    if (!estObjet(option)) {
      erreurs.push({ champ: `options[${index + 1}]`, code: 'typeObjet' });
      return;
    }
    verifierTexteObligatoire(option, 'id', erreurs, prefixe);
    verifierTexteObligatoire(option, 'texte', erreurs, prefixe);
    if (typeof option.id === 'string') {
      if (identifiants.has(option.id)) erreurs.push({ champ: `${prefixe}id`, code: 'idOptionEnDouble', valeur: option.id });
      identifiants.add(option.id);
    }
  });
  return identifiants;
}

/**
 * Construit le formulaire accessible d'un QCM :
 * <fieldset> + <legend> pour la question, un <input> + <label> par option.
 * typeChamp vaut 'radio' (une seule réponse) ou 'checkbox' (plusieurs).
 * La correction n'est JAMAIS construite ici.
 */
export function construireQcm(exercice, conteneur, typeChamp, consigne) {
  const idConsigne = identifiantUnique('consigne');
  const groupe = creer('fieldset', { classe: 'qcm', 'aria-describedby': idConsigne });
  const legende = ajouterTexteRiche(creer('legend', { classe: 'question' }), exercice.question);
  groupe.append(legende, creer('p', { classe: 'consigne', id: idConsigne, texte: consigne }));

  const nomGroupe = identifiantUnique(`reponse-${exercice.id}`);
  for (const option of exercice.options) {
    const idChamp = identifiantUnique(`option-${exercice.id}`);
    const champ = creer('input', { type: typeChamp, id: idChamp, name: nomGroupe, value: option.id });
    const libelle = ajouterTexteRiche(creer('label', { for: idChamp }), option.texte);
    groupe.append(creer('div', { classe: 'option' }, [champ, libelle]));
  }
  conteneur.append(groupe);
}

/** Renvoie les valeurs des cases cochées. */
export function valeursCochees(conteneur) {
  return [...conteneur.querySelectorAll('input:checked')].map((champ) => champ.value);
}

/** Recoche les cases correspondant à une réponse enregistrée. */
export function recocher(conteneur, valeurs) {
  for (const champ of conteneur.querySelectorAll('input')) {
    champ.checked = valeurs.includes(champ.value);
  }
}

/** Retrouve le texte d'une option à partir de son id. */
export function texteOption(exercice, idOption) {
  return exercice.options.find((option) => option.id === idOption)?.texte ?? idOption;
}
