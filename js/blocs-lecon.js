/*
 * blocs-lecon.js — Affichage des parties « à lire » d'une étape.
 *
 * Dans le JSON, chaque étape a une liste "blocs". Chaque bloc a un "type" :
 *   paragraphe, sous_titre, liste, definitions, encadre, illustration, tableau.
 * Le détail des champs de chaque bloc est dans le README.
 *
 * Aucun exercice ni aucune correction n'est affiché ici.
 */

import {
  creer, ajouterTexteRiche,
  verifierTexteObligatoire, verifierTexteFacultatif, verifierListeDeTextes, estObjet, estTexteNonVide
} from './outils.js';

const STYLES_ENCADRE = ['info', 'attention', 'astuce'];

/* ------------------------------------------------------------------
 * Vérification des blocs
 * ------------------------------------------------------------------ */

const verificateurs = {
  paragraphe(bloc, erreurs, p) {
    verifierTexteObligatoire(bloc, 'texte', erreurs, p);
  },
  sous_titre(bloc, erreurs, p) {
    verifierTexteObligatoire(bloc, 'texte', erreurs, p);
  },
  liste(bloc, erreurs, p) {
    verifierListeDeTextes(bloc, 'elements', erreurs, { prefixe: p });
  },
  definitions(bloc, erreurs, p) {
    if (!Array.isArray(bloc.elements)) {
      erreurs.push({ champ: `${p}elements`, code: bloc.elements === undefined ? 'champManquant' : 'typeListe' });
      return;
    }
    bloc.elements.forEach((element, index) => {
      const prefixe = `${p}elements[${index + 1}].`;
      verifierTexteObligatoire(element, 'terme', erreurs, prefixe);
      verifierTexteObligatoire(element, 'definition', erreurs, prefixe);
    });
  },
  encadre(bloc, erreurs, p) {
    const style = bloc.style ?? 'info';
    if (!STYLES_ENCADRE.includes(style)) {
      erreurs.push({ champ: `${p}style`, code: 'valeurNonAutorisee', valeur: style, valeurs: STYLES_ENCADRE.join(', ') });
    }
    verifierTexteFacultatif(bloc, 'titre', erreurs, p);
    verifierTexteFacultatif(bloc, 'texte', erreurs, p);
    verifierListeDeTextes(bloc, 'elements', erreurs, { obligatoire: false, prefixe: p });
    if (!estTexteNonVide(bloc.texte) && !Array.isArray(bloc.elements)) {
      erreurs.push({ champ: `${p}texte`, code: 'champManquant' });
    }
  },
  illustration(bloc, erreurs, p) {
    verifierTexteObligatoire(bloc, 'fichier', erreurs, p);
    // "alt" est obligatoire, mais peut être vide ("") pour une image décorative.
    if (typeof bloc.alt !== 'string') {
      erreurs.push({ champ: `${p}alt`, code: bloc.alt === undefined ? 'champManquant' : 'typeTexte' });
    }
    verifierTexteFacultatif(bloc, 'legende', erreurs, p);
    if (bloc.transcription !== undefined) {
      if (!estObjet(bloc.transcription)) {
        erreurs.push({ champ: `${p}transcription`, code: 'typeObjet' });
      } else {
        verifierTexteFacultatif(bloc.transcription, 'titre', erreurs, `${p}transcription.`);
        verifierListeDeTextes(bloc.transcription, 'elements', erreurs, { prefixe: `${p}transcription.` });
      }
    }
  },
  tableau(bloc, erreurs, p) {
    verifierTexteObligatoire(bloc, 'legende', erreurs, p);
    verifierListeDeTextes(bloc, 'entetes', erreurs, { prefixe: p });
    if (!Array.isArray(bloc.lignes)) {
      erreurs.push({ champ: `${p}lignes`, code: bloc.lignes === undefined ? 'champManquant' : 'typeListe' });
      return;
    }
    bloc.lignes.forEach((ligne, index) => {
      if (!Array.isArray(ligne)) erreurs.push({ champ: `${p}lignes[${index + 1}]`, code: 'typeListe' });
    });
  }
};

/** Vérifie une liste de blocs. Ajoute les erreurs trouvées dans "erreurs". */
export function verifierBlocs(blocs, erreurs, prefixe) {
  if (!Array.isArray(blocs)) {
    erreurs.push({ champ: `${prefixe}blocs`, code: blocs === undefined ? 'champManquant' : 'typeListe' });
    return;
  }
  blocs.forEach((bloc, index) => {
    const p = `${prefixe}blocs[${index + 1}].`;
    if (!estObjet(bloc)) {
      erreurs.push({ champ: `${prefixe}blocs[${index + 1}]`, code: 'typeObjet' });
      return;
    }
    const verificateur = verificateurs[bloc.type];
    if (!verificateur) {
      erreurs.push({ champ: `${p}type`, code: 'typeInconnu', valeur: String(bloc.type), valeurs: Object.keys(verificateurs).join(', ') });
      return;
    }
    verificateur(bloc, erreurs, p);
  });
}

/* ------------------------------------------------------------------
 * Affichage des blocs
 * ------------------------------------------------------------------ */

function construireListe(elements, numerotee) {
  const liste = creer(numerotee ? 'ol' : 'ul');
  for (const element of elements) liste.append(ajouterTexteRiche(creer('li'), element));
  return liste;
}

const constructeurs = {
  paragraphe(bloc) {
    return ajouterTexteRiche(creer('p'), bloc.texte);
  },
  sous_titre(bloc) {
    return ajouterTexteRiche(creer('h3'), bloc.texte);
  },
  liste(bloc) {
    return construireListe(bloc.elements, bloc.numerotee === true);
  },
  definitions(bloc) {
    const liste = creer('dl', { classe: 'definitions' });
    for (const element of bloc.elements) {
      liste.append(
        ajouterTexteRiche(creer('dt'), element.terme),
        ajouterTexteRiche(creer('dd'), element.definition)
      );
    }
    return liste;
  },
  encadre(bloc, textes) {
    const style = bloc.style ?? 'info';
    // role="note" : un encadré complémentaire, sans créer de nouvelle zone de navigation.
    const encadre = creer('div', { classe: `encadre encadre-${style}`, role: 'note' });
    if (bloc.titre) {
      encadre.append(creer('p', { classe: 'encadre-titre' }, [
        creer('span', { classe: 'icone', 'aria-hidden': 'true', texte: textes.icones[style] }),
        ajouterTexteRiche(creer('strong'), bloc.titre)
      ]));
    }
    if (bloc.texte) encadre.append(ajouterTexteRiche(creer('p'), bloc.texte));
    if (Array.isArray(bloc.elements)) encadre.append(construireListe(bloc.elements, bloc.numerotee === true));
    return encadre;
  },
  illustration(bloc) {
    // Le chemin du fichier est relatif (obligatoire pour GitHub Pages).
    const image = creer('img', { src: bloc.fichier, alt: bloc.alt, loading: 'lazy', decoding: 'async' });
    const figure = creer('figure', { classe: 'illustration' }, [image]);
    if (bloc.legende) figure.append(ajouterTexteRiche(creer('figcaption'), bloc.legende));
    // Le contenu écrit de l'image existe aussi en texte dans la page.
    if (bloc.transcription) {
      const transcription = creer('div', { classe: 'transcription' });
      if (bloc.transcription.titre) {
        transcription.append(ajouterTexteRiche(creer('p', { classe: 'transcription-titre' }), bloc.transcription.titre));
      }
      transcription.append(construireListe(bloc.transcription.elements, bloc.transcription.numerotee === true));
      figure.append(transcription);
    }
    return figure;
  },
  tableau(bloc) {
    const table = creer('table');
    table.append(ajouterTexteRiche(creer('caption'), bloc.legende));
    const entete = creer('tr');
    for (const titre of bloc.entetes) entete.append(ajouterTexteRiche(creer('th', { scope: 'col' }), titre));
    table.append(creer('thead', {}, [entete]));
    const corps = creer('tbody');
    for (const ligne of bloc.lignes) {
      const rangee = creer('tr');
      ligne.forEach((cellule, index) => {
        // La première colonne sert de titre à la ligne.
        const balise = index === 0 ? creer('th', { scope: 'row' }) : creer('td');
        rangee.append(ajouterTexteRiche(balise, cellule));
      });
      corps.append(rangee);
    }
    table.append(corps);
    // Sur un petit écran, le tableau peut défiler horizontalement dans son cadre.
    return creer('div', { classe: 'tableau-defilant', tabindex: '0', role: 'region', 'aria-label': bloc.legende }, [table]);
  }
};

/** Affiche une liste de blocs (déjà vérifiés) dans un conteneur. */
export function afficherBlocs(blocs, conteneur, textes) {
  for (const bloc of blocs) {
    conteneur.append(constructeurs[bloc.type](bloc, textes));
  }
}
