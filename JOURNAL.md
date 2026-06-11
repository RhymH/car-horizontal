# Journal de développement — CarHorizontal

> Notes succinctes de ce qu'on ajoute, session par session.
> Pour chaque entrée : **ce qui a été fait** + **comment y accéder / le tester**.
> Le plus récent en haut.

---

## 2026-06-11 — Phase 1 : Socle "plugins" (capabilities par organisation)

**Fonctionnalité**
Base du fonctionnement par plugins : chaque module (leasing, ventes, promotions, recommandation d'articles, portail client…) est une **capability** activable **par organisation**. Source de vérité unique : le registre `Capabilities` (Domain). Activation persistée dans `OrganizationFeature` (absence de ligne = défaut de la capability, OFF par défaut = opt-in/vendable).

**Comment y accéder / tester**
- Lire l'état effectif des plugins de l'org : `GET /api/me/capabilities` → liste `{ key, label, description, enabled }`. Les fronts s'en serviront pour afficher/masquer les modules.
- Activer/désactiver (Owner/Admin) : `PUT /api/organizations/capabilities/{key}` body `{ "enabled": true|false }`. Capability inconnue → 404.
- Gating d'un endpoint : décorer avec `[RequireCapability(Capabilities.Leasing)]` → 403 `application/problem+json` si le plugin n'est pas activé (sera utilisé dès le module Leasing).
- Capabilities connues : `leasing`, `sales`, `promotions`, `article-recommendations`, `client-portal`.

---

## 2026-06-07 — P1-C : Décodage VIN → remplissage auto du véhicule

**Fonctionnalité**
Décodeur de VIN **intégré et hors-ligne** (aucune API externe) pour réduire la saisie. À la création/édition d'un véhicule, un bouton **« Décoder »** à côté du champ VIN pré-remplit la **marque** et l'**année** (et affiche le pays). Derrière une abstraction `IVinDecoder` → on pourra brancher NHTSA / un SIV plus tard sans rien changer d'autre.

**Détails**
- Validation **structurelle** (17 caractères, charset ISO sans I/O/Q). Le check-digit nord-américain n'est **pas** exigé (souvent absent sur les VINs FR/EU — l'imposer rejetterait la plupart des Renault/Peugeot).
- Marque/pays via table WMI (constructeurs FR/EU + majeurs), année via position 10 désambiguïsée par la position 7.

**Comment y accéder / tester**
- Portal : Véhicules → « Nouveau véhicule » → saisir un VIN → bouton **« Décoder »** → marque + année se remplissent (toast récap). La marque n'est écrasée qu'en mode saisie libre ; l'année toujours.
- API : `POST /api/vehicles/decode-vin` body `{ "vin": "WVWZZZ1KZ8W000001" }` → `{ isValid, make, country, modelYear, wmi, error }`. VIN invalide → `isValid:false` + raison.

---

## 2026-06-07 — P1-B : Centre de notifications collaborateurs

**Fonctionnalité**
Inbox d'actions intelligentes pour le garage. Un générateur transforme les signaux déjà calculés en notifications contextualisées et actionnables :
- échéances Timeline dans les 30 jours ou en retard (entretien, contrôle technique, pneus, fin de garantie, opportunité de reprise) ;
- clients **inactifs depuis ≈12 mois** (opportunité de relance).
Chaque notification porte une sévérité (Urgent / À traiter / Opportunité / Info) et une **action « 1 clic »** (voir client, voir véhicule, planifier un RDV, envoyer un rappel). Génération **idempotente** (clé de déduplication) — rejouable sans doublon.

**Comment y accéder / tester**
- Portal : **cloche dans la barre du haut** (badge de non-lus, rafraîchi toutes les 60 s) + entrée **« Notifications »** dans la sidebar → page `/notifications` (onglets À traiter / Traitées / Ignorées, actions Traité / Ignorer).
- Génération auto : job Hangfire `daily-generate-notifications` (02h30, après la régénération Timeline). Dashboard `http://localhost:5080/hangfire`.
- Génération manuelle (Owner/Admin) : `POST /api/notifications/generate`.
- API : `GET /api/notifications`, `GET /api/notifications/unread-count`, `POST /api/notifications/{id}/read|done|dismiss`.
- Le filtrage multitenant est porté par le filtre global du DbContext.

**Correctif (même jour)** : la déduplication ne regardait que les notifications *ouvertes*, donc « Actualiser » recréait une notif déjà **traitée/ignorée**. Désormais la dédup considère tout le cycle de vie → une notif traitée ne ressort plus (seule une nouvelle échéance, nouvel id, en génère une).

---

## 2026-06-07 — P0-A : Envoi réel des messages (SMS/Email)

**Fonctionnalité**
Pipeline d'envoi de messages avec architecture propre : abstractions `IEmailSender` / `ISmsSender` / `IMessageDispatcher`, providers sélectionnés par configuration. Implémentations « log » (simulées, sans dépendance externe) pour le dev. Le statut d'un rappel reflète désormais le **vrai résultat** de l'envoi (fini le `Sent` mensonger) et chaque envoi écrit un `MessageLog` fidèle.

**Pourquoi**
Avant, les rappels étaient marqués `Sent` sans rien envoyer (dispatch NoOp). Toute la promesse « rappels automatiques » était non fonctionnelle.

**Comment y accéder / tester**
- Config : `Messaging:Email:Provider` / `Messaging:Sms:Provider` dans `appsettings.json` (défaut `log`). Un provider inconnu = erreur explicite au démarrage.
- Envoi automatique : job Hangfire `dispatch-due-reminders` (dashboard `http://localhost:5080/hangfire`).
- Envoi manuel : `POST /api/reminders/{id}/send-now` (ou bouton « Envoyer » côté portal).
- Vérif : les envois simulés apparaissent dans les logs API (`[SIMULATED EMAIL]` / `[SIMULATED SMS]`) et dans la table `message_logs` (colonne `ProviderMessageId` = `log-email:…`).
- Brancher un vrai opérateur plus tard = ajouter une impl `IEmailSender`/`ISmsSender` dans `Infrastructure/Messaging/` + changer la config. Rien d'autre à toucher.
