# Backlog — CarHorizontal (orientation CRM leasing + portail client)

> Document **partagé** (versionné) de la suite à faire, pour que toute l'équipe
> travaille sur les mêmes tâches. Le détail de ce qui a été livré est dans
> [JOURNAL.md](JOURNAL.md). Vision/architecture : voir aussi `ProductDetails.md`.
> Convention : **simple, évolutif, sécurisé, commenté ; un commit par unité logique ;
> ne jamais laisser un dev à moitié fait** (build vert à chaque commit).

## Où on en est (fait & validé)
- **Socle plugins (capabilities)** : activation par organisation. Registre `Capabilities` (Domain), `OrganizationFeature`, `GET /api/me/capabilities`, toggle `PUT /api/organizations/capabilities/{key}`, attribut `[RequireCapability]`, écran **Paramètres → Modules** (portal).
- **Plugin Leasing** : `LeasingContract` + CRUD `/api/leasing-contracts` (gaté), règle Timeline (`LeaseEnd`, `MileageCapRisk`), notifications, section Leasing sur la fiche véhicule (portal), règle « 1 seul contrat actif/véhicule » (409), réconciliation des échéances à la suppression.
- **Portail client** (`apps/client`, Next 16, port **3001**) : comptes client **par invitation du garage** (`AppUser.UserType=Customer`+`CustomerId`), auth email+mdp (`/api/portal/auth/*`), policies `StaffOnly`/`CustomerOnly`, endpoints `/api/portal/me` + `/api/portal/vehicles`, dashboard (profil + véhicules + échéances), **saisie kilométrage**, **bannière d'alerte dépassement plafond km leasing**.

## Comment lancer
1. Docker Desktop lancé, puis `./start-dev.ps1` (Postgres + API :5080 + portal :3000).
2. Portail client : `cd apps/client && npm install && npm run dev` → http://localhost:3001.
3. Comptes de test : **staff** `demo@carhorizontal.fr` / `DemoUser!2026` ; **client** `alice@example.com` / `ClientPass!2026`.
- API Swagger : http://localhost:5080/swagger · Jobs : /hangfire.

---

## À faire (priorisé)

### 1. Chatbot / « Contacter mon garage » (client) — PRIORITAIRE
**Objectif** : contacts simples et rapides depuis le portail client (prendre RDV entretien/pneus, être rappelé).
**Approche MVP** (réutilise le centre de notifications P1-B, pas de calendrier self-service) :
- Back : `POST /api/portal/requests` (policy `CustomerOnly`, scopé `customer_id`) → crée une **`Notification`** staff (nouveau `NotificationKind` ex. `CustomerRequest`) + une **`CustomerInteraction`** sur la fiche.
- Front (`apps/client`) : panneau « Contacter mon garage » sur le dashboard avec intentions guidées + message libre.
**Validation** : le client envoie une demande → le commercial la voit dans le centre de notifications (portal) en 1 clic.

### 2. Recommandation d'articles (pro)
**Objectif** : suggérer des produits pertinents par véhicule (huile, kit d'entretien). Capability `article-recommendations`.
**Approche** : entité `Product` (catalogue) + règles de pertinence (type moteur/modèle/km) ; affichage sur la fiche véhicule (portal), gaté par la capability.

### 3. Architecture plugins « propre »
**Objectif** : chaque module porte sa logique et s'intègre/désintègre proprement sur **tous** ses points de contact (routes API, écrans, sidebar, **timeline**, **notifications**, dashboard) à l'activation/désactivation.
**Constat actuel** : seul `leasing` est gaté (CRUD front+back) ; désactiver un plugin **ne masque pas** ses signaux timeline/notifs déjà générés. Cible : un contrat de plugin uniforme + hooks d'activation/désactivation.

### 4. Vrais providers SMS / Email
Remplacer le sender simulé « log » (P0-A) par des implémentations réelles (SMTP/MailKit, opérateur SMS) derrière `IEmailSender`/`ISmsSender` + config `Messaging:{Email,Sms}:Provider`. Nécessaire au lancement (invitations client, rappels).

### 5. Modèle 3D du véhicule (client) — nice-to-have
Viewer type `<model-viewer>`/three.js sur le dashboard client. Sourcing des assets par modèle à cadrer.

### 6. Outillage / dette
- Intégrer **`apps/client`** à `start-dev.ps1` (lancer aussi le portail client).
- **Dockerfiles** manquants (`apps/api`, `apps/portal`, `apps/client`) → `docker-build-publish.ps1` non opérationnel ; `infrastructure/` vide.
- **Tests automatisés** : aucun pour l'instant (xUnit API + Playwright E2E à mettre en place).
- DRY : `ResolveMessageAsync` dupliqué entre `DispatchDueRemindersJob` et `RemindersService`.
- 401 transitoire au 1er appel protégé après login (intercepteur axios) — optimisable.

## Conventions techniques utiles
- DB : tables **snake_case**, colonnes **PascalCase**. Migrations EF via CLI uniquement (jamais éditées à la main), puis revue du fichier généré.
- Soft delete (jamais de DELETE SQL). Multitenant via filtre global du `DbContext` (le client est scopé par `customer_id`, jamais `org_id`).
- Front : Next.js 16 (lire `apps/portal/node_modules/next/dist/docs/` en cas de doute) ; calquer les composants existants. Each commit : `dotnet build` + `tsc --noEmit` verts.
