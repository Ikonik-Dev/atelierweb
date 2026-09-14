/*
 * moteur-exercices.js — Le moteur générique des exercices.
 *
 * Pour TOUS les types d'exercices, c'est ce fichier (et lui seul) qui gère :
 *   1. le délai anti-précipitation (champ "tempsMinimumSecondes") ;
 *   2. le verrouillage : pas de correction avant d'avoir répondu et validé ;
 *   3. l'enregistrement de la réponse (via progression.js) AVANT la correction ;
 *   4. l'affichage de la correction et son annonce aux lecteurs d'écran.
 *
 * Déroulé d'un exercice :
 *   afficher la question → attendre le délai et une réponse → « Valider ma réponse »
 *   → réponse enregistrée, champs bloqués → « Voir la correction » → correction.
 *
 * IMPORTANT — ce verrouillage est un garde-fou pédagogique contre la précipitation,
 * PAS une protection informatique. Les réponses sont lisibles dans les fichiers JSON
 * publics et le travail enregistré peut être modifié avec les outils du navigateur.
 * Ne pas chercher à le durcir sans nouvelle décision (voir CLAUDE.md, D-002).
 *
 * Point clé : la bonne réponse et l'explication ne sont insérées dans la page
 * qu'au clic sur « Voir la correction ». Elles ne sont pas seulement cachées :
 * un lecteur d'écran ne peut donc pas les lire avant.
 */

import { creer, ajouterTexteRiche } from './outils.js';
import { obtenirType } from './types/registre.js';
import { lireExercice, enregistrerExercice } from './progression.js';

/**
 * Affiche un exercice dans un conteneur.
 * Paramètres :
 *   exercice    : l'objet exercice lu dans le JSON (déjà vérifié)
 *   conteneur   : l'élément HTML où construire l'exercice
 *   textes      : le contenu de content/interface.json
 *   annoncer    : fonction qui fait lire un message par les lecteurs d'écran
 *   auChangement: fonction appelée quand l'état de l'exercice change (pour mettre à jour le plan)
 *   auProblemeSauvegarde : fonction appelée si la réponse n'a pas pu être écrite sur l'ordinateur
 * Renvoie { arreter } : à appeler quand on quitte l'écran (arrête le minuteur).
 */
export function afficherExercice({ exercice, conteneur, textes, annoncer, auChangement = () => {}, auProblemeSauvegarde = () => {} }) {
  const type = obtenirType(exercice.type);
  const textesType = textes.types[exercice.type] ?? {};
  const t = textes.exercice;

  // --- 1. La question (construite par le type d'exercice, sans correction) ---
  const zoneQuestion = creer('div', { classe: 'zone-question' });
  type.afficher(exercice, zoneQuestion, textesType);

  // --- 2. Les actions (construites par le moteur) ---
  const message = creer('p', { classe: 'message-etat', id: `message-${exercice.id}`, tabindex: '-1' });
  const avertissement = creer('p', { classe: 'avertissement-definitif', texte: t.avertissementDefinitif });
  const boutonValider = creer('button', {
    type: 'button',
    classe: 'bouton bouton-principal',
    texte: t.boutonValider,
    'aria-describedby': message.id
  });
  const boutonCorrection = creer('button', {
    type: 'button',
    classe: 'bouton bouton-secondaire',
    texte: t.boutonVoirCorrection
  });
  const zoneBoutons = creer('div', { classe: 'zone-boutons' }, [boutonValider, boutonCorrection]);
  const zoneActions = creer('div', { classe: 'zone-actions' }, [message, avertissement, zoneBoutons]);

  // --- 3. La zone de correction : VIDE tant que la correction n'est pas demandée ---
  const zoneCorrection = creer('div', { classe: 'zone-correction' });

  conteneur.append(zoneQuestion, zoneActions, zoneCorrection);

  let minuteur = null;
  let delaiEcoule = true;

  /** Active ou désactive un bouton sans le retirer du parcours clavier (aria-disabled). */
  function rendreActif(bouton, actif) {
    bouton.setAttribute('aria-disabled', actif ? 'false' : 'true');
  }

  /** Bloque les champs de réponse : la réponse validée ne peut plus changer. */
  function verrouillerChamps() {
    zoneQuestion.querySelectorAll('input, textarea, select, button').forEach((champ) => { champ.disabled = true; });
  }

  /** Met à jour le bouton « Valider » et le message d'aide selon la situation. */
  function mettreAJourAvantValidation() {
    const reponse = type.lireReponse(zoneQuestion);
    const pret = delaiEcoule && reponse !== null;
    rendreActif(boutonValider, pret);
    if (!delaiEcoule) message.textContent = t.messageDelai;
    else if (reponse === null) message.textContent = t.messageRepondre;
    else message.textContent = t.messagePret;
  }

  /** Construit et insère la correction. Appelé seulement quand l'exercice est validé. */
  function afficherCorrection({ deplacerFocus }) {
    const enregistre = lireExercice(exercice.id);
    if (!enregistre?.valide) return; // Sécurité : jamais de correction sans validation.

    zoneCorrection.replaceChildren();
    const idTitre = `correction-${exercice.id}`;
    const titre = creer('h3', { id: idTitre, tabindex: '-1', texte: t.titreCorrection });

    const libelles = { juste: t.resultatJuste, faux: t.resultatFaux, non_note: t.resultatNonNote };
    const etats = { juste: 'juste', faux: 'faux', non_note: 'neutre' };
    const etat = etats[enregistre.resultat];
    const resultat = creer('p', { classe: `resultat resultat-${etat}` }, [
      creer('span', { classe: 'icone', 'aria-hidden': 'true', texte: textes.icones[etat] }),
      creer('strong', { texte: libelles[enregistre.resultat] })
    ]);

    const bloc = creer('section', { classe: `correction correction-${etat}`, 'aria-labelledby': idTitre }, [titre, resultat]);
    if (enregistre.resultat === 'faux') bloc.append(creer('p', { texte: t.encouragementFaux }));

    // Détail fourni par le type d'exercice, mis en forme par le moteur
    const lignes = type.decrireCorrection(exercice, enregistre.reponse, textesType);
    const liste = creer('ul', { classe: 'detail-correction' });
    for (const ligne of lignes) {
      const element = creer('li', { classe: `ligne-${ligne.etat}` }, [
        creer('span', { classe: 'icone', 'aria-hidden': 'true', texte: textes.icones[ligne.etat] }),
        creer('span', { classe: 'libelle', texte: `${ligne.libelle} ` })
      ]);
      ajouterTexteRiche(element, ligne.texte);
      liste.append(element);
    }
    bloc.append(liste);

    if (exercice.explicationCorrection) {
      bloc.append(
        creer('h4', { texte: t.titreExplication }),
        ajouterTexteRiche(creer('p', { classe: 'explication' }), exercice.explicationCorrection)
      );
    }
    zoneCorrection.append(bloc);
    boutonCorrection.hidden = true;

    if (deplacerFocus) {
      titre.focus();
      annoncer(libelles[enregistre.resultat]);
    }
  }

  /** Affiche l'état « déjà validé » : champs bloqués, bouton Valider retiré. */
  function passerEnModeValide() {
    verrouillerChamps();
    boutonValider.hidden = true;
    avertissement.hidden = true;
    rendreActif(boutonCorrection, true);
    boutonCorrection.removeAttribute('aria-describedby');
  }

  // --- Clic sur « Valider ma réponse » ---
  boutonValider.addEventListener('click', () => {
    if (boutonValider.getAttribute('aria-disabled') === 'true') {
      // Bouton inactif : on redit simplement pourquoi.
      annoncer(message.textContent);
      return;
    }
    const reponse = type.lireReponse(zoneQuestion);
    if (reponse === null) return;

    const note = type.estCorrecte(exercice, reponse);
    const resultat = note === null ? 'non_note' : (note ? 'juste' : 'faux');

    // La réponse est enregistrée AVANT que la correction ne puisse être affichée.
    const ecrite = enregistrerExercice(exercice.id, {
      reponse,
      valide: true,
      correctionVue: false,
      resultat,
      date: new Date().toISOString()
    });
    if (!ecrite) auProblemeSauvegarde();

    passerEnModeValide();
    message.textContent = ecrite ? t.messageReponseEnregistree : t.messageReponseNonSauvegardee;
    message.focus();
    auChangement();
  });

  // --- Clic sur « Voir la correction » ---
  boutonCorrection.addEventListener('click', () => {
    if (boutonCorrection.getAttribute('aria-disabled') === 'true' || !lireExercice(exercice.id)?.valide) {
      annoncer(t.messageCorrectionVerrouillee);
      return;
    }
    const ecrite = enregistrerExercice(exercice.id, { correctionVue: true });
    if (!ecrite) auProblemeSauvegarde();
    afficherCorrection({ deplacerFocus: true });
    auChangement();
  });

  // --- État de départ ---
  const enregistre = lireExercice(exercice.id);
  if (enregistre?.valide) {
    // Exercice déjà validé (par exemple après un rechargement de la page)
    type.restaurerReponse(zoneQuestion, enregistre.reponse);
    passerEnModeValide();
    message.textContent = t.messageDejaValide;
    if (enregistre.correctionVue) afficherCorrection({ deplacerFocus: false });
  } else {
    // Exercice pas encore validé : la correction reste verrouillée.
    rendreActif(boutonCorrection, false);
    boutonCorrection.setAttribute('aria-describedby', message.id);

    const secondes = exercice.tempsMinimumSecondes ?? 0;
    if (secondes > 0) {
      // Le délai démarre à l'affichage. Il n'est pas sauvegardé : il repart de zéro
      // si la page est rechargée. Aucun compte à rebours n'est affiché ni annoncé.
      delaiEcoule = false;
      minuteur = setTimeout(() => {
        delaiEcoule = true;
        minuteur = null;
        mettreAJourAvantValidation();
        annoncer(t.annonceDelaiTermine); // Une seule annonce, polie.
      }, secondes * 1000);
    }
    zoneQuestion.addEventListener('input', mettreAJourAvantValidation);
    zoneQuestion.addEventListener('change', mettreAJourAvantValidation);
    mettreAJourAvantValidation();
  }

  return {
    arreter() {
      if (minuteur) clearTimeout(minuteur);
      minuteur = null;
    }
  };
}
