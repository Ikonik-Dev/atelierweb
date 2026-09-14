/*
 * app.js — Démarrage de l'application et navigation entre les écrans.
 *
 * Organisation générale :
 *   - content/*.json     : TOUT le contenu et tous les textes (modifiables par le formateur)
 *   - chargeur-contenu.js: charge et vérifie les JSON
 *   - blocs-lecon.js     : affiche les parties « à lire »
 *   - moteur-exercices.js: gère délai, validation, verrouillage et correction
 *   - progression.js     : sauvegarde dans le navigateur, export et import
 *   - app.js (ce fichier): construit la page et passe d'un écran à l'autre
 *
 * Les écrans sont repérés par l'adresse après le "#" :
 *   #/                      → accueil
 *   #/seance-2              → présentation de la séance 2
 *   #/seance-2/s2-etape-3   → étape (partie à lire)
 *   #/seance-2/s2-e04       → exercice
 */

import { formater, creer, ajouterTexteRiche } from './outils.js';
import { chargerContenu } from './chargeur-contenu.js';
import { afficherBlocs } from './blocs-lecon.js';
import { afficherExercice } from './moteur-exercices.js';
import {
  initialiserProgression, lireExercice, compterFaits, nombreTotalFaits,
  exporterProgression, analyserFichierImport, remplacerProgression
} from './progression.js';

let textes = null;          // contenu de content/interface.json
let seances = [];           // séances chargées (avec leurs erreurs éventuelles)
let ecranActif = null;      // permet d'arrêter le minuteur de l'exercice quand on change d'écran
let premierAffichage = true;

const $ = (id) => document.getElementById(id);

/* ==================================================================
 * Démarrage
 * ================================================================== */

async function demarrer() {
  try {
    const { disponible } = initialiserProgression();
    const contenu = await chargerContenu();
    if (!contenu.ok) {
      afficherEchecDemarrage(contenu.detail);
      return;
    }
    textes = contenu.textes;
    seances = contenu.seances.map(preparerSeance);

    $('message-demarrage')?.remove();
    construireGabarit(disponible);
    window.addEventListener('hashchange', afficherRoute);
    afficherRoute();
  } catch (erreur) {
    afficherEchecDemarrage(String(erreur));
  }
}

/** Montre le message de secours écrit dans index.html (quand les JSON ne se chargent pas). */
function afficherEchecDemarrage(detail) {
  const message = $('message-demarrage');
  if (!message) return;
  message.classList.add('visible');
  const zoneDetail = $('detail-demarrage');
  if (zoneDetail) zoneDetail.textContent = detail;
}

/** Ajoute à chaque séance son identifiant d'adresse et la liste ordonnée de ses écrans. */
function preparerSeance(seance) {
  const routeId = seance.fichier.replace(/^content\//, '').replace(/\.json$/, '');
  if (!seance.donnees) return { ...seance, routeId, disponible: false };

  const ecrans = [{ genre: 'intro', id: '' }];
  const idsExercices = [];
  seance.donnees.etapes.forEach((etape, index) => {
    const numeroEtape = index + 1;
    ecrans.push({ genre: 'etape', id: etape.id, etape, numeroEtape });
    for (const exercice of etape.exercices ?? []) {
      idsExercices.push(exercice.id);
      ecrans.push({ genre: 'exercice', id: exercice.id, etape, numeroEtape, exercice, numeroExercice: idsExercices.length });
    }
  });
  return {
    ...seance,
    routeId,
    disponible: true,
    ecrans,
    idsExercices,
    totalEtapes: seance.donnees.etapes.length,
    totalExercices: idsExercices.length
  };
}

/* ==================================================================
 * Gabarit commun à tous les écrans (en-tête, menu, sauvegarde, pied de page)
 * ================================================================== */

function construireGabarit(sauvegardePossible) {
  const nav = textes.navigation;
  document.documentElement.lang = 'fr';

  // Lien d'évitement : il ne doit pas changer l'adresse (sinon le routeur réagirait).
  const lienEvitement = $('lien-evitement');
  lienEvitement.textContent = nav.lienEvitement;
  lienEvitement.hidden = false;
  lienEvitement.addEventListener('click', (evenement) => {
    evenement.preventDefault();
    $('contenu').focus();
  });

  $('lien-accueil-titre').textContent = textes.application.titre;
  $('sous-titre').textContent = textes.application.sousTitre;
  $('menu-seances').setAttribute('aria-label', nav.menuSeances);

  const liste = $('liste-seances');
  liste.append(creer('li', {}, [creer('a', { href: '#/', 'data-route': '', texte: nav.accueil })]));
  for (const seance of seances) {
    liste.append(creer('li', {}, [
      creer('a', { href: `#/${seance.routeId}`, 'data-route': seance.routeId, texte: formater(nav.seanceCourte, { numero: seance.numero }) })
    ]));
  }

  // Zone de sauvegarde, visible en permanence
  const s = textes.sauvegarde;
  $('titre-sauvegarde').textContent = s.titre;
  const avertissement = $('avertissement-sauvegarde');
  avertissement.textContent = sauvegardePossible ? s.avertissement : s.avertissementIndisponible;
  avertissement.classList.toggle('alerte', !sauvegardePossible);
  $('bouton-exporter').textContent = s.boutonExporter;
  $('bouton-importer').textContent = s.boutonImporter;
  $('bouton-exporter').addEventListener('click', exporter);
  $('bouton-importer').addEventListener('click', () => $('champ-import').click());
  $('champ-import').addEventListener('change', importer);

  $('bouton-confirmer').textContent = s.importConfirmer;
  $('bouton-annuler').textContent = s.importAnnuler;
  $('titre-dialogue').textContent = s.importTitre;

  $('texte-pied').textContent = textes.piedDePage;

  for (const id of ['entete', 'sauvegarde', 'pied']) $(id).hidden = false;
}

/** Fait lire un message par les lecteurs d'écran (zone aria-live polie). */
function annoncer(message) {
  const zone = $('annonces');
  zone.textContent = '';
  setTimeout(() => { zone.textContent = message; }, 100);
}

/** Affiche un message dans la zone de sauvegarde (role="status"). */
function afficherStatutSauvegarde(message) {
  const statut = $('statut-sauvegarde');
  statut.textContent = '';
  setTimeout(() => { statut.textContent = message; }, 100);
}

/** Appelé si une réponse n'a pas pu être écrite sur l'ordinateur. */
function signalerProblemeSauvegarde() {
  const avertissement = $('avertissement-sauvegarde');
  avertissement.textContent = textes.sauvegarde.avertissementEchecEcriture;
  avertissement.classList.add('alerte');
}

/* ==================================================================
 * Export et import du travail
 * ================================================================== */

function exporter() {
  const s = textes.sauvegarde;
  const nom = formater(s.nomFichierExport, { date: new Date().toISOString().slice(0, 10) });
  const reussi = exporterProgression(nom);
  afficherStatutSauvegarde(reussi ? formater(s.messageExportOk, { nom }) : s.messageExportErreur);
}

async function importer(evenement) {
  const s = textes.sauvegarde;
  const champ = evenement.target;
  const fichier = champ.files?.[0];
  champ.value = ''; // permet de choisir à nouveau le même fichier plus tard
  if (!fichier) return;

  let texte;
  try {
    texte = await fichier.text();
  } catch {
    afficherStatutSauvegarde(s.importErreurLecture);
    return;
  }

  // 1. Vérification du fichier AVANT de toucher au travail actuel
  const analyse = analyserFichierImport(texte);
  if (!analyse.ok) {
    afficherStatutSauvegarde(s[analyse.code]);
    $('bouton-importer').focus();
    return;
  }

  // 2. Demande de confirmation
  const idsConnus = new Set(seances.flatMap((seance) => seance.idsExercices ?? []));
  const inconnus = Object.keys(analyse.exercices).filter((id) => !idsConnus.has(id)).length;
  const zoneTexte = $('texte-dialogue');
  zoneTexte.replaceChildren(creer('p', { texte: formater(s.importResume, { nombre: analyse.nombre }) }));
  if (analyse.dateExport) {
    const date = new Date(analyse.dateExport);
    if (!Number.isNaN(date.getTime())) {
      zoneTexte.append(creer('p', { texte: formater(s.importDate, { date: date.toLocaleDateString(textes.application.langueDates) }) }));
    }
  }
  if (inconnus > 0) zoneTexte.append(creer('p', { texte: formater(s.importInconnus, { nombre: inconnus }) }));
  zoneTexte.append(
    creer('p', { classe: 'alerte', texte: formater(s.importAvertissement, { nombre: nombreTotalFaits() }) }),
    creer('p', {}, [creer('strong', { texte: s.importQuestion })])
  );

  const dialogue = $('dialogue-import');
  dialogue.returnValue = '';
  dialogue.addEventListener('close', () => {
    // 3. Remplacement seulement si le stagiaire a confirmé
    if (dialogue.returnValue === 'confirmer') {
      const ecrit = remplacerProgression(analyse.exercices);
      if (!ecrit) signalerProblemeSauvegarde();
      afficherRoute();
      afficherStatutSauvegarde(s.importOk);
    } else {
      afficherStatutSauvegarde(s.importAnnule);
    }
    $('bouton-importer').focus();
  }, { once: true });
  dialogue.showModal();
  $('bouton-annuler').focus(); // Par prudence, le choix proposé d'abord est « garder mon travail ».
}

/* ==================================================================
 * Navigation entre les écrans
 * ================================================================== */

function lireRoute() {
  const morceaux = decodeURIComponent(window.location.hash.replace(/^#\/?/, '')).split('/').filter(Boolean);
  return { routeSeance: morceaux[0] ?? '', routeEcran: morceaux[1] ?? '', enTrop: morceaux.length > 2 };
}

function afficherRoute() {
  if (ecranActif) ecranActif.arreter();
  ecranActif = null;

  const { routeSeance, routeEcran, enTrop } = lireRoute();
  const main = $('contenu');
  main.replaceChildren();

  if (!routeSeance) {
    afficherAccueil(main);
    finaliserEcran({ routeSeance: '', repere: [textes.navigation.repereAccueil] });
    return;
  }

  const seance = seances.find((element) => element.routeId === routeSeance);
  if (!seance || enTrop) {
    afficherIntrouvable(main);
    finaliserEcran({ routeSeance: '', repere: [] , titre: formater(textes.titrePage.erreur, { application: textes.application.titre }) });
    return;
  }

  if (!seance.disponible) {
    afficherSeanceIndisponible(main, seance);
    finaliserEcran({ routeSeance, repere: [formater(textes.navigation.repereSeance, { numero: seance.numero })] });
    return;
  }

  const index = seance.ecrans.findIndex((ecran) => ecran.id === routeEcran);
  if (index === -1) {
    afficherIntrouvable(main);
    finaliserEcran({ routeSeance, repere: [], titre: formater(textes.titrePage.erreur, { application: textes.application.titre }) });
    return;
  }
  afficherEcranSeance(main, seance, index);
}

/** Actions communes après l'affichage d'un écran : titre, menu, repère, focus. */
function finaliserEcran({ routeSeance, repere, titre, cibleFocus }) {
  const app = textes.application.titre;
  document.title = titre ?? formater(textes.titrePage.accueil, { application: app });

  for (const lien of $('liste-seances').querySelectorAll('a')) {
    if (lien.dataset.route === routeSeance) lien.setAttribute('aria-current', 'page');
    else lien.removeAttribute('aria-current');
  }

  // Repère toujours visible : le formateur voit d'un coup d'œil où en est le stagiaire.
  const zoneRepere = $('repere');
  zoneRepere.replaceChildren(creer('span', { classe: 'repere-libelle', texte: `${textes.navigation.repere} ` }));
  repere.forEach((morceau, position) => {
    if (position > 0) zoneRepere.append(creer('span', { classe: 'repere-separateur', 'aria-hidden': 'true', texte: ' › ' }), document.createTextNode(' '));
    zoneRepere.append(creer('strong', { texte: morceau }));
  });

  // Au premier chargement, on ne déplace pas le focus. Ensuite, il va sur le titre de l'écran.
  if (!premierAffichage) {
    window.scrollTo(0, 0);
    const cible = cibleFocus ?? $('contenu').querySelector('h1');
    if (cible) {
      cible.setAttribute('tabindex', '-1');
      cible.focus();
    }
  }
  premierAffichage = false;
}

function titreSeance(seance) {
  return formater(textes.navigation.seanceComplete, { numero: seance.numero, titre: seance.donnees?.titre ?? seance.titreBrut ?? '' });
}

/** Adresse de l'écran où reprendre une séance : premier exercice pas encore validé. */
function adresseReprise(seance) {
  const faits = compterFaits(seance.idsExercices);
  if (faits === 0) return `#/${seance.routeId}/${seance.ecrans[1]?.id ?? ''}`;
  const suivant = seance.ecrans.find((ecran) => ecran.genre === 'exercice' && !lireExercice(ecran.id)?.valide);
  return suivant ? `#/${seance.routeId}/${suivant.id}` : `#/${seance.routeId}`;
}

/** Crée un lien qui ressemble à un bouton. Le texte caché précise le lien pour les lecteurs d'écran. */
function lienBouton(adresse, texte, precision = '', classe = 'bouton bouton-principal') {
  const lien = creer('a', { href: adresse, classe, texte });
  if (precision) lien.append(creer('span', { classe: 'visuellement-cache', texte: ` (${precision})` }));
  return lien;
}

/* ------------------------------------------------------------------
 * Accueil
 * ------------------------------------------------------------------ */

function afficherAccueil(main) {
  const a = textes.accueil;
  const nav = textes.navigation;
  main.append(creer('h1', { texte: textes.application.titre }));
  for (const paragraphe of a.introduction) main.append(ajouterTexteRiche(creer('p'), paragraphe));

  const listeModeEmploi = creer('ol', { classe: 'mode-emploi' });
  for (const etape of a.modeEmploi) listeModeEmploi.append(ajouterTexteRiche(creer('li'), etape));
  main.append(
    creer('h2', { texte: a.titreModeEmploi }),
    listeModeEmploi,
    creer('div', { classe: 'encadre encadre-attention', role: 'note' }, [
      creer('p', {}, [
        creer('span', { classe: 'icone', 'aria-hidden': 'true', texte: textes.icones.attention }),
        creer('strong', { texte: a.attentionDefinitif })
      ])
    ]),
    creer('h2', { texte: a.titreSeances })
  );

  const cartes = creer('ul', { classe: 'cartes-seances' });
  for (const seance of seances) {
    const carte = creer('li', { classe: 'carte-seance' }, [creer('h3', { texte: titreSeance(seance) })]);
    if (!seance.disponible) {
      carte.append(
        creer('p', { classe: 'alerte', texte: textes.erreurs.texteSeanceIndisponible }),
        lienBouton(`#/${seance.routeId}`, textes.erreurs.titreSeanceIndisponible, formater(nav.seanceCourte, { numero: seance.numero }), 'bouton bouton-secondaire')
      );
    } else {
      const faits = compterFaits(seance.idsExercices);
      carte.append(creer('p', { texte: formater(a.progression, { faits, total: seance.totalExercices }) }));
      if (faits === seance.totalExercices && faits > 0) carte.append(creer('p', { texte: a.seanceTerminee }));
      const texteBouton = faits === 0 ? nav.commencerSeance : nav.continuerSeance;
      carte.append(lienBouton(adresseReprise(seance), texteBouton, formater(nav.seanceCourte, { numero: seance.numero })));
    }
    cartes.append(carte);
  }
  main.append(cartes);
}

/* ------------------------------------------------------------------
 * Écrans d'une séance
 * ------------------------------------------------------------------ */

function afficherEcranSeance(main, seance, index) {
  const nav = textes.navigation;
  const ecran = seance.ecrans[index];
  const titre = titreSeance(seance);
  const repere = [formater(nav.repereSeance, { numero: seance.numero })];
  let titreEcran;
  let cibleFocus;

  main.append(creer('h1', { classe: ecran.genre === 'intro' ? '' : 'titre-seance', texte: titre }));

  if (ecran.genre === 'intro') {
    repere.push(nav.repereIntro);
    afficherIntroSeance(main, seance);
  } else if (ecran.genre === 'etape') {
    titreEcran = formater(nav.etapeTitre, { numero: ecran.numeroEtape, titre: ecran.etape.titre });
    repere.push(formater(nav.repereEtape, { etape: ecran.numeroEtape, totalEtapes: seance.totalEtapes }));
    cibleFocus = creer('h2', { texte: titreEcran });
    main.append(cibleFocus);
    afficherBlocs(ecran.etape.blocs, main, textes);
  } else {
    titreEcran = formater(nav.exerciceTitre, { numero: ecran.numeroExercice, total: seance.totalExercices });
    repere.push(
      formater(nav.repereEtape, { etape: ecran.numeroEtape, totalEtapes: seance.totalEtapes }),
      formater(nav.repereExercice, { exercice: ecran.numeroExercice, totalExercices: seance.totalExercices })
    );
    main.append(creer('p', { classe: 'surtitre', texte: formater(nav.etapeTitre, { numero: ecran.numeroEtape, titre: ecran.etape.titre }) }));
    cibleFocus = creer('h2', { texte: titreEcran });
    const conteneur = creer('div', { classe: 'exercice' });
    main.append(cibleFocus, conteneur);
    ecranActif = afficherExercice({
      exercice: ecran.exercice,
      conteneur,
      textes,
      annoncer,
      auChangement: () => mettreAJourPlan(seance, index),
      auProblemeSauvegarde: signalerProblemeSauvegarde
    });
  }

  // Message de fin et boutons Précédent / Suivant
  const dernier = index === seance.ecrans.length - 1;
  if (dernier) main.append(creer('p', { classe: 'fin-seance', texte: nav.finSeance }));
  main.append(construireNavigationEcrans(seance, index));

  // Plan de la séance (repliable) sur les écrans d'étape et d'exercice
  if (ecran.genre !== 'intro') {
    const plan = creer('details', { classe: 'plan', id: 'plan-seance' }, [
      creer('summary', { texte: nav.planSeance }),
      construirePlan(seance, index)
    ]);
    main.append(plan);
  }

  finaliserEcran({
    routeSeance: seance.routeId,
    repere,
    cibleFocus,
    titre: titreEcran
      ? formater(textes.titrePage.ecran, { ecran: titreEcran, seance: titre, application: textes.application.titre })
      : formater(textes.titrePage.seance, { seance: titre, application: textes.application.titre })
  });
}

function afficherIntroSeance(main, seance) {
  const nav = textes.navigation;
  const donnees = seance.donnees;
  main.append(creer('h2', { texte: nav.presentation }));
  if (Array.isArray(donnees.objectifs) && donnees.objectifs.length > 0) {
    const liste = creer('ul');
    for (const objectif of donnees.objectifs) liste.append(ajouterTexteRiche(creer('li'), objectif));
    main.append(creer('p', { texte: nav.objectifs }), liste);
  }
  const faits = compterFaits(seance.idsExercices);
  main.append(
    creer('p', { texte: formater(textes.accueil.progression, { faits, total: seance.totalExercices }) }),
    creer('p', {}, [lienBouton(adresseReprise(seance), faits === 0 ? nav.commencerSeance : nav.continuerSeance)]),
    creer('h2', { texte: nav.planSeance }),
    construirePlan(seance, 0)
  );
}

/** Liste des étapes et des exercices, avec leur état (fait / à faire). */
function construirePlan(seance, indexActuel) {
  const nav = textes.navigation;
  const liste = creer('ol', { classe: 'plan-liste' });
  let sousListe = null;

  seance.ecrans.forEach((ecran, index) => {
    if (ecran.genre === 'intro') return;
    const actuel = index === indexActuel;
    const adresse = `#/${seance.routeId}/${ecran.id}`;
    let lien;
    const element = creer('li');

    if (ecran.genre === 'etape') {
      lien = creer('a', { href: adresse, texte: formater(nav.etapeTitre, { numero: ecran.numeroEtape, titre: ecran.etape.titre }) });
      element.append(lien);
      sousListe = creer('ul', { classe: 'plan-exercices' });
      element.append(sousListe);
      liste.append(element);
    } else {
      const fait = Boolean(lireExercice(ecran.id)?.valide);
      lien = creer('a', { href: adresse, texte: formater(nav.exerciceTitre, { numero: ecran.numeroExercice, total: seance.totalExercices }) });
      element.append(lien, creer('span', { classe: fait ? 'statut statut-fait' : 'statut statut-a-faire', texte: ` ${fait ? nav.exerciceFait : nav.exerciceAFaire}` }));
      sousListe?.append(element);
    }
    if (actuel) {
      lien.setAttribute('aria-current', 'page');
      lien.append(creer('span', { classe: 'statut-ici', texte: ` ${nav.ecranActuel}` }));
    }
  });
  // On retire les sous-listes vides (étapes sans exercice)
  liste.querySelectorAll('ul.plan-exercices:empty').forEach((vide) => vide.remove());
  return liste;
}

/** Après la validation d'un exercice, met à jour son état dans le plan. */
function mettreAJourPlan(seance, index) {
  const plan = $('plan-seance');
  if (!plan) return;
  plan.querySelector('.plan-liste')?.replaceWith(construirePlan(seance, index));
}

function construireNavigationEcrans(seance, index) {
  const nav = textes.navigation;
  const zone = creer('nav', { classe: 'navigation-ecrans', 'aria-label': nav.navigationEcrans });
  const precedent = seance.ecrans[index - 1];
  const suivant = seance.ecrans[index + 1];

  if (precedent) {
    zone.append(lienBouton(`#/${seance.routeId}/${precedent.id}`, nav.precedent, '', 'bouton bouton-secondaire'));
  }
  if (suivant) {
    zone.append(lienBouton(`#/${seance.routeId}/${suivant.id}`, nav.suivant));
  } else {
    const seanceSuivante = seances.find((element) => element.numero === seance.numero + 1);
    if (seanceSuivante) zone.append(lienBouton(`#/${seanceSuivante.routeId}`, nav.seanceSuivante));
    zone.append(lienBouton('#/', nav.retourAccueil, '', 'bouton bouton-secondaire'));
  }
  return zone;
}

/* ------------------------------------------------------------------
 * Écrans d'erreur (jamais d'écran blanc)
 * ------------------------------------------------------------------ */

function afficherSeanceIndisponible(main, seance) {
  const e = textes.erreurs;
  main.append(
    creer('h1', { texte: `${e.titreSeanceIndisponible} — ${formater(textes.navigation.seanceCourte, { numero: seance.numero })}` }),
    creer('p', { texte: e.texteSeanceIndisponible }),
    creer('p', { classe: 'alerte', texte: e.aideStagiaire }),
    creer('h2', { texte: e.titreContenu }),
    creer('p', { texte: e.aideFormateur })
  );
  const liste = creer('ul', { classe: 'erreurs-contenu' });
  for (const erreur of seance.erreurs) {
    let message;
    if (erreur.message) {
      message = formater(erreur.message, { fichier: erreur.fichier, detail: erreur.detail });
    } else {
      const emplacement = formater(e.emplacement, { fichier: erreur.fichier, id: erreur.id, champ: erreur.champ });
      const explication = formater(e.codes[erreur.code] ?? erreur.code, { valeur: erreur.valeur ?? '', valeurs: erreur.valeurs ?? '' });
      message = `${emplacement} ${explication}`;
    }
    liste.append(creer('li', { texte: message }));
  }
  main.append(liste, creer('p', {}, [lienBouton('#/', textes.navigation.retourAccueil)]));
  document.title = formater(textes.titrePage.seance, { seance: e.titreSeanceIndisponible, application: textes.application.titre });
}

function afficherIntrouvable(main) {
  const e = textes.erreurs;
  main.append(
    creer('h1', { texte: e.titrePageIntrouvable }),
    creer('p', { texte: e.textePageIntrouvable }),
    creer('p', {}, [lienBouton('#/', textes.navigation.retourAccueil)])
  );
}

demarrer();
