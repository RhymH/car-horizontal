# Journal de développement — CarHorizontal

> Notes succinctes de ce qu'on ajoute, session par session.
> Pour chaque entrée : **ce qui a été fait** + **comment y accéder / le tester**.
> Le plus récent en haut.

---

## 2026-06-13 — Saisie kilométrage par le client (portail)

**Fonctionnalité**
Le client met à jour le kilométrage de **son** véhicule depuis son dashboard (bouton « Mettre à jour »). Backend `POST /api/portal/vehicles/{id}/mileage` (scopé `customer_id`) : enregistre un relevé `CustomerSelfReport`, met à jour le véhicule, **invalide l'estimation et régénère la timeline** → les échéances (ex. risque de dépassement du plafond km) se recalculent en direct. Garde-fous : km invalide/en recul → 409, véhicule d'un autre client → 404.

**Comment y accéder** : portail client (:3001) → dashboard → carte véhicule → « Mettre à jour ».

**Au passage** : correction d'une erreur d'hydratation côté client (lecture du localStorage déplacée hors du rendu).

---

## 2026-06-13 — Correctif : échéances leasing fantômes

Supprimer/terminer un contrat de leasing laissait son échéance « Fin de contrat » dans la timeline (donc visible côté client). Désormais, chaque création/màj/suppression **réconcilie** les événements `LeaseEnd`/`MileageCapRisk` du véhicule : ceux qui ne correspondent plus à un contrat **actif** passent en `Skipped`. Validé : le dashboard client n'affiche plus qu'une seule fin de leasing (celle du contrat actif).

---

## 2026-06-13 — Phase 3 (en cours) : Portail client — auth

**Fonctionnalité (livrée)**
Comptes clients finaux, en réutilisant ASP.NET Identity. Un compte est de type `Customer` (vs `Staff`) et rattaché à une fiche `Customer` (`AppUser.CustomerId`). Création **par invitation du garage** (pas d'auto-inscription).

**Flux**
- Staff : `POST /api/customers/{id}/portal-invite` → crée/ré-invite le compte client + génère un token (email via dispatcher P0-A ; lien renvoyé pour le dev).
- Client : `POST /api/portal/auth/accept-invite` (définit le mot de passe via le token) → session ; `POST /api/portal/auth/login` (email + mot de passe) → JWT client.

**Sécurité**
- JWT client : `user_type=Customer` + `customer_id`, **sans** `org_id` ni rôle.
- **Policy par défaut durcie** : toute route staff `[Authorize]` **refuse** un token client (403). Policy `CustomerOnly` pour les futures routes `/api/portal/*`. Validé : token client → 403 sur `/api/vehicles`, `/api/customers`, `/api/leasing-contracts`.

**Endpoints client (livrés)**
- `GET /api/portal/me` (profil du client) et `GET /api/portal/vehicles` (ses véhicules + prochaines échéances timeline). **Scopés par le `customer_id` du token** (jamais un id fourni), gardés par la policy `CustomerOnly`. Validé : données du client OK, token staff → 403.

**App client (livrée)** — nouvelle app **`apps/client`** (Next.js 16, port **3001**) :
- Pages **login** (email+mdp), **accept-invite** (définition du mot de passe via le lien d'invitation), **dashboard** (profil + véhicules + prochaines échéances), redirection d'accueil selon la session.
- Session persistée en localStorage (accès permanent), refresh transparent à 401, design simple/premium.
- CORS API étendu à `http://localhost:3001`.
- Validé navigateur : login `alice@example.com` → dashboard avec sa Renault Clio IV + échéances.

**Comment lancer le portail client** : `cd apps/client && npm install && npm run dev` → http://localhost:3001. (API sur :5080 requise.)

**Phase 3 — Portail client : terminée** (identité + auth + endpoints + app).

---

## 2026-06-12 — Réglages plugins (UI)

**Fonctionnalité**
Écran **Paramètres** (remplace le stub) avec une section **Modules (plugins)** : un interrupteur par capability (Leasing, Vente, Promotions, Reco articles, Portail client). État effectif lu via `/me/capabilities`, activation via `PUT /api/organizations/capabilities/{key}`. Réservé **Owner/Admin** (les autres voient l'état en lecture). Activer/désactiver un module affiche/masque ses écrans (ex. la section Leasing de la fiche véhicule).

**Comment y accéder** : sidebar **Paramètres** → carte « Modules (plugins) ».

---

## 2026-06-11 — Phase 2 (en cours) : Plugin Leasing — backend CRUD

**Fonctionnalité (livrée)**
Gestion des contrats de leasing (LOA/LLD) côté pro, **activable comme plugin** : entité `LeasingContract` (bailleur, mensualité, début/fin, plafond km, valeur de rachat, statut) rattachée véhicule+client. CRUD complet, **gaté par la capability `leasing`**.

**Comment y accéder / tester**
- Activer le plugin (Owner/Admin) : `PUT /api/organizations/capabilities/leasing` `{ "enabled": true }`. Tant qu'il est off, toutes les routes leasing renvoient **403**.
- CRUD : `GET/POST /api/leasing-contracts`, `GET/PATCH/DELETE /api/leasing-contracts/{id}`. Filtres liste : `vehicleId`, `customerId`, `status`. Le client est déduit du véhicule ; suppression = soft delete.

**Ajouté (Timeline + Notifications)**
- Règle Timeline `LeasingTimelineRule` : génère **fin de contrat** (échéance ~120 j) et **risque de dépassement du plafond km** (km projeté à l'échéance via l'estimation kilométrique). Créer/modifier un contrat **régénère la timeline du véhicule** → affichage immédiat.
- Ces événements alimentent le **centre de notifications** (fin de leasing = opportunité, risque km = à traiter), avec **remontée précoce** (visibles même si l'échéance est au-delà de la fenêtre 30 j habituelle).
- Validé end-to-end : création contrat → notification « Fin de leasing à anticiper » contextualisée.

**Front pro (ajouté)**
- Section **Leasing** sur la fiche véhicule (`/vehicles/[id]`) : liste des contrats + ajout/édition/suppression (modale RHF+Zod). **Gatée par la capability** (`useCapabilities`/`useCapability` → `/me/capabilities`) : invisible si le plugin est off.
- Les jalons (fin de contrat, risque km) restent affichés dans la **timeline** du véhicule ; la relance passe par les **notifications**.
- Validé navigateur : section visible, 2 contrats listés (Arval, DIAC), modale fonctionnelle.

**Règle métier** : un véhicule ne peut avoir **qu'un seul contrat de leasing actif à la fois** — la création/màj d'un contrat actif chevauchant un autre renvoie **409** (`ConflictException`).

**Phase 2 — Leasing : terminée.** Reste (hors Phase 2) : un écran de **réglages plugins** pour activer/désactiver les capabilities depuis l'UI (aujourd'hui via l'API `PUT /api/organizations/capabilities/{key}`).

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
