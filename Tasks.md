# 🚗 CarHorizontal — Plan de tâches d'implémentation

Plan d'implémentation découpé en tâches atomiques, ordonné pour qu'une IA (ou un développeur)
puisse les enchaîner sans ambiguïté. Chaque tâche précise : **objectif**, **fichiers**,
**implémentation**, **interactions UI** (boutons, modales, drawers, confirmations), **critères
d'acceptation**, **dépendances**.

> Convention de nommage : produit = **CarHorizontal** (CH). API = `CarHorizontal.Api`,
> projets EF = `CarHorizontal.Domain` / `CarHorizontal.Infrastructure`. Front = `portal`.
> Multitenant : un `User` peut appartenir à plusieurs `Organization` (= un garage). Toute
> entité métier porte `OrganizationId`.

---

## 📁 Structure cible du monorepo

```
CarHorizontal/
├── apps/
│   ├── api/
│   │   ├── CarHorizontal.Api/             # ASP.NET Core 10 — endpoints, DI, Hangfire
│   │   ├── CarHorizontal.Domain/          # Entités, value objects, interfaces de service
│   │   ├── CarHorizontal.Infrastructure/  # DbContext, EF Migrations, repos, providers
│   │   ├── CarHorizontal.Api.sln
│   │   ├── Dockerfile
│   │   └── docker-compose.yml             # Postgres local
│   └── portal/                            # Next.js 15 + ShadCN + Tailwind
│       ├── app/
│       ├── components/
│       ├── lib/
│       ├── Dockerfile
│       └── package.json
├── infrastructure/                        # Déploiement (cf. Aries/QSE)
│   ├── caddy/
│   ├── grafana/
│   ├── loki/
│   ├── promtail/
│   ├── prometheus/
│   ├── scripts/
│   ├── systemd/
│   └── docker-compose.yml
├── docker-build-publish.ps1
├── start-dev.ps1
├── CLAUDE.md
├── ProductDetails.md
├── TechStack.md
└── Tasks.md                               # ce fichier
```

---

## 🧱 Conventions transverses

### Backend (DDD modulaire)
- Un **module = un dossier** dans `CarHorizontal.Api/Modules/<Nom>/` regroupant :
  controller, service, DTOs (`<Action>RequestDto.cs` + `<Action>ResponseDto.cs`),
  validators (FluentValidation), mapper.
- Entités dans `CarHorizontal.Domain/Entities/<Module>/`. Bases :
  - `EntityBase` : `Id (Guid, PK)`, `CreatedAt`, `UpdatedAt`, `DeletedAt?`, `CreatedBy`, `UpdatedBy?`.
  - `OrganizationEntityBase : EntityBase` ajoute `OrganizationId`.
- DbContext : **un seul** `AppDbContext` dans `CarHorizontal.Infrastructure/Persistence/`.
  Configurations EF par entité dans `Persistence/Configurations/<Entity>Configuration.cs`.
- Migrations : **CLI uniquement** (`dotnet ef migrations add ...`). Aucune édition manuelle
  hors du fichier généré.
- BFF : endpoints `Dashboard`, `CustomerOverview`, `VehicleDetail` qui agrègent en un appel
  toutes les données d'une page.
- Soft delete via `DeletedAt`. Filtre global EF.
- Filtre multitenant via `OrganizationId` injecté depuis le JWT (claim `org_id`),
  appliqué via un `IQueryFilter` global EF.

### Frontend (Next.js App Router)
- Server Components par défaut, `"use client"` seulement quand nécessaire.
- **Toute action importante = modale** (création, édition, suppression, envoi de message).
- Validation : ReactHookForm + Zod, schémas dans `lib/schemas/<entity>.ts`.
- Notifications : `sonner` — toast vert succès, toast rouge erreur, toast info en cours.
- Tables : composant générique `<DataTable>` basé sur `@tanstack/react-table` + shadcn.
- Drawer (lecture détaillée) ou modale (édition) selon la quantité d'info.
- Skeletons pendant chargement, EmptyState avec CTA quand collection vide.
- API client : un module par feature dans `lib/api/<entity>.ts` avec TanStack Query.
- Auth : tokens stockés en cookies httpOnly via route handler Next, refresh transparent.
- i18n : démarrage **français uniquement** (cible : garages FR). Préparer la clé `next-intl`
  mais sans l'activer.

### Scripts PowerShell racine (à mirror sur Aries/QSE)
- `start-dev.ps1` : up Postgres → run API → run portal en consoles séparées.
- `docker-build-publish.ps1` : params `-Service api|portal|all`, `-Action build|publish|both`,
  `-Tag latest`.

---

# 🚀 PHASES & TÂCHES

Chaque tâche est préfixée par un identifiant `T###`. Les dépendances utilisent ces ID.

---

## PHASE 0 — Bootstrap (squelettes, outillage)

### T001 — Initialiser le monorepo et `.gitignore`
- **Goal** : poser l'arborescence vide `apps/api`, `apps/portal`, `infrastructure`, README à la racine.
- **Files** : `apps/`, `apps/api/.keep`, `apps/portal/.keep`, `infrastructure/.keep`, `README.md` (1 paragraphe), `.gitignore` (combiné .NET + Node + IDE).
- **Acceptance** : `git init` propre, structure visible.
- **Depends on** : —

### T002 — Bootstrap solution .NET
- **Goal** : créer la solution et les 3 projets.
- **Implémentation** :
  - `dotnet new sln -n CarHorizontal.Api -o apps/api`
  - `dotnet new webapi -n CarHorizontal.Api -o apps/api/CarHorizontal.Api --use-controllers`
  - `dotnet new classlib -n CarHorizontal.Domain -o apps/api/CarHorizontal.Domain`
  - `dotnet new classlib -n CarHorizontal.Infrastructure -o apps/api/CarHorizontal.Infrastructure`
  - Référencer Domain ← Infrastructure ← Api.
  - Ajouter packages : `Microsoft.EntityFrameworkCore.Design`, `Npgsql.EntityFrameworkCore.PostgreSQL`, `Microsoft.AspNetCore.Identity.EntityFrameworkCore`, `Microsoft.AspNetCore.Authentication.JwtBearer`, `FluentValidation.AspNetCore`, `Hangfire.AspNetCore`, `Hangfire.PostgreSql`, `Serilog.AspNetCore`, `Swashbuckle.AspNetCore`, `OpenTelemetry.Extensions.Hosting`, `OpenTelemetry.Exporter.Prometheus.AspNetCore`.
- **Acceptance** : `dotnet build` OK depuis `apps/api/`.
- **Depends on** : T001

### T003 — Bootstrap portal Next.js
- **Goal** : initialiser Next.js 15 + Tailwind + ShadCN.
- **Implémentation** :
  - `npx create-next-app@latest portal --ts --app --tailwind --eslint --src-dir=false --import-alias "@/*"` dans `apps/`.
  - `npx shadcn@latest init` (style : New York, base color : neutral, RSC : oui).
  - Installer composants ShadCN initiaux : `button`, `dialog`, `dropdown-menu`, `form`, `input`, `label`, `select`, `table`, `tabs`, `toast`, `sonner`, `card`, `badge`, `avatar`, `sheet`, `separator`, `skeleton`, `tooltip`, `command`, `popover`, `alert-dialog`, `textarea`, `checkbox`, `switch`, `calendar`, `date-picker`, `scroll-area`.
  - Installer : `react-hook-form`, `zod`, `@hookform/resolvers`, `@tanstack/react-query`, `@tanstack/react-table`, `axios`, `chart.js`, `react-chartjs-2`, `echarts`, `echarts-for-react`, `lucide-react`, `sonner`, `date-fns`, `clsx`, `tailwind-merge`.
- **Acceptance** : `npm run dev` lance le portal sur :3000, page d'accueil par défaut visible.
- **Depends on** : T001

### T004 — Postgres local via docker-compose
- **Goal** : lancer Postgres pour le dev.
- **Files** : `apps/api/docker-compose.yml` (service `db_carhorizontal`, port 5432, volume nommé), `apps/api/.dockerignore`, README mini.
- **Acceptance** : `docker-compose up -d` démarre Postgres, `psql` peut s'y connecter.
- **Depends on** : T001

### T005 — Scripts racine `start-dev.ps1` et `docker-build-publish.ps1`
- **Goal** : reprendre les patterns d'Aries/QSE.
- **Files** : `start-dev.ps1`, `docker-build-publish.ps1`.
- **Implémentation** :
  - `start-dev.ps1` : `docker-compose up -d` Postgres → `dotnet run` API en nouvelle console → `npm run dev` portal en nouvelle console. Affiche URLs (API, Swagger, Hangfire, Portal).
  - `docker-build-publish.ps1` : params `-Service`, `-Action`, `-Tag`, registry à confirmer (placeholder `registry.gitlab.com/<group>/carhorizontal`).
- **Acceptance** : `./start-dev.ps1` ouvre les 2 consoles + Postgres up.
- **Depends on** : T002, T003, T004

### T006 — CLAUDE.md racine
- **Goal** : documenter l'archi pour les sessions IA futures.
- **Files** : `CLAUDE.md` (overview, commandes dev, architecture API/portal, conventions DTO, multitenant, env vars).
- **Acceptance** : un nouveau dev/IA peut démarrer en lisant ce seul fichier.
- **Depends on** : T002, T003

---

## PHASE 1 — Modèle de domaine & EF Core

### T010 — Bases d'entités (`EntityBase`, `OrganizationEntityBase`)
- **Goal** : poser les classes de base.
- **Files** : `Domain/Common/EntityBase.cs`, `Domain/Common/OrganizationEntityBase.cs`, `Domain/Common/IAuditable.cs`, `Domain/Common/ISoftDeletable.cs`.
- **Implémentation** : champs cités en convention. `EntityBase` : ctor protégé qui set `Id = Guid.NewGuid()`, `CreatedAt = DateTime.UtcNow`.
- **Acceptance** : compile, héritages cohérents.
- **Depends on** : T002

### T011 — Entités Organization & User
- **Files** : `Domain/Entities/Organizations/Organization.cs`, `Domain/Entities/Identity/AppUser.cs`, `Domain/Entities/Identity/UserOrganization.cs` (table de liaison N..N + rôle), `Domain/Entities/Identity/RefreshToken.cs`.
- **Champs `Organization`** : `Id, Name, Slug (unique), CreatedAt, UpdatedAt, DeletedAt, LogoFileId?, DefaultLocale = "fr-FR", Timezone = "Europe/Paris", PhoneCountryCode = "+33"`.
- **Champs `AppUser`** : hérite `IdentityUser<Guid>`, ajoute `FullName, CreatedAt, UpdatedAt, LastLoginAt?`.
- **`UserOrganization`** : `UserId, OrganizationId, Role (Owner|Admin|Mechanic|Viewer), JoinedAt`.
- **`RefreshToken`** : `Id, UserId, TokenHash, OrganizationId?, ExpiresAt, RevokedAt?, ReplacedByTokenId?, CreatedByIp, UserAgent`.
- **Acceptance** : compile, naming conventions respectées.
- **Depends on** : T010

### T012 — Entités métier MVP
- **Files** :
  - `Domain/Entities/Customers/Customer.cs`
  - `Domain/Entities/Vehicles/Vehicle.cs`
  - `Domain/Entities/Maintenance/MaintenanceRecord.cs`
  - `Domain/Entities/Timeline/TimelineEvent.cs`
  - `Domain/Entities/Reminders/Reminder.cs`
  - `Domain/Entities/Appointments/Appointment.cs`
  - `Domain/Entities/Messaging/MessageLog.cs`
  - `Domain/Entities/Messaging/MessageTemplate.cs`
  - `Domain/Entities/Files/StoredFile.cs` (+ `FileFolder.cs`, `FileMetadata.cs`)
  - `Domain/Entities/Customers/CustomerInteraction.cs`
- **Champs clés** :
  - **Customer** : `Id, OrganizationId, FullName, Email?, Phone?, Address?, City?, PostalCode?, Notes?, AcquiredAt, Status (Active|Inactive|Lost), Tags (string[])`.
  - **Vehicle** : `Id, OrganizationId, CustomerId, Make, Model, Year, Vin?, LicensePlate, CurrentMileage, MileageUpdatedAt, EngineType (Gasoline|Diesel|Hybrid|Electric|LPG), TransmissionType?, PurchasedAt?, Color?, PhotoFileId?`.
  - **MaintenanceRecord** : `Id, OrganizationId, VehicleId, PerformedAt, MileageAtService, Type (Oil|Tires|Brakes|FullService|TechnicalInspection|Custom), Description, Cost?, NextDueAt?, NextDueMileage?, MechanicName?`.
  - **TimelineEvent** : `Id, OrganizationId, VehicleId, CustomerId, Kind (Maintenance|TechnicalInspection|TireSwap|TradeInOpportunity|WarrantyExpiry|Custom), DueAt?, DueMileage?, Status (Pending|Triggered|Done|Skipped), Source (AutoGenerated|Manual), GeneratedFromRule?, Title, Description?`.
  - **Reminder** : `Id, OrganizationId, TimelineEventId?, CustomerId, VehicleId?, Channel (Sms|Email|Both|None), ScheduledAt, SentAt?, Status (Scheduled|Sent|Failed|Cancelled|Snoozed), TemplateId?, ResolvedSubject?, ResolvedBody?, FailureReason?`.
  - **Appointment** : `Id, OrganizationId, CustomerId, VehicleId?, ScheduledAt, DurationMinutes, Subject, Notes?, Status (Pending|Confirmed|Cancelled|Done), CreatedFromReminderId?`.
  - **MessageLog** : `Id, OrganizationId, CustomerId, ReminderId?, Channel, Recipient, Subject?, Body, Status, ProviderMessageId?, SentAt, ErrorMessage?`.
  - **MessageTemplate** : `Id, OrganizationId, Code (string), Channel, Subject?, Body, Variables (JSON), Active`.
  - **StoredFile** : `Id, OrganizationId, FolderId, OriginalFileName, ContentType, SizeBytes, BinaryContent (bytea), Sha256`.
  - **CustomerInteraction** : `Id, OrganizationId, CustomerId, Type (Call|Visit|Sms|Email|Note), OccurredAt, Summary, AuthorUserId`.
- **Acceptance** : compile, relations clés étrangères posées (sans navigation properties superflues).
- **Depends on** : T010, T011

### T013 — `AppDbContext`, configurations EF, filtres globaux
- **Files** : `Infrastructure/Persistence/AppDbContext.cs`, `Infrastructure/Persistence/Configurations/*.cs` (un par entité), `Infrastructure/Persistence/Interceptors/AuditInterceptor.cs`, `Infrastructure/Persistence/Interceptors/SoftDeleteInterceptor.cs`.
- **Implémentation** :
  - `AppDbContext` hérite `IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>`.
  - Filtre global : `modelBuilder.Entity<X>().HasQueryFilter(e => e.DeletedAt == null && e.OrganizationId == _currentOrgId)` pour tout `OrganizationEntityBase`.
  - `ICurrentUserService` injecté pour fournir `OrganizationId` courant + `UserId`.
  - Audit interceptor : remplit `CreatedAt/UpdatedAt/CreatedBy/UpdatedBy` via `SaveChangesAsync`.
  - SoftDelete interceptor : intercepte `EntityState.Deleted` sur `ISoftDeletable` → met `DeletedAt`.
  - Index utiles : `Customer(OrganizationId, FullName)`, `Vehicle(OrganizationId, LicensePlate)` unique scoped, `Reminder(OrganizationId, Status, ScheduledAt)`.
- **Acceptance** : `dotnet ef migrations add Initial -p CarHorizontal.Infrastructure -s CarHorizontal.Api` génère une migration complète sans erreur.
- **Depends on** : T011, T012

### T014 — Génération et application de la migration `Initial`
- **Goal** : créer la migration et la passer.
- **Implémentation** :
  - Migration via CLI uniquement.
  - Au démarrage de l'API : `await dbContext.Database.MigrateAsync()` (option configurable).
- **Acceptance** : `dotnet run` API → tables présentes en base.
- **Depends on** : T013

### T015 — Seed de développement
- **Files** : `Infrastructure/Persistence/Seed/DevSeeder.cs`.
- **Implémentation** : seed conditionnel (env Development) — 1 organisation "Garage Démo", 1 owner `demo@carhorizontal.fr` / mot de passe configurable, 5 clients avec 1 véhicule chacun, quelques `MaintenanceRecord` rétroactifs, quelques `TimelineEvent` futurs.
- **Acceptance** : après reset DB + run API, login démo fonctionne, données visibles.
- **Depends on** : T014, T024

---

## PHASE 2 — Auth, Multitenancy, Sécurité

### T020 — Configuration ASP.NET Identity + JWT
- **Files** : `Api/Modules/Auth/AuthModule.cs` (extensions DI), `Api/Modules/Auth/JwtTokenService.cs`, `Api/Modules/Auth/RefreshTokenService.cs`, `Api/Modules/Auth/PasswordHasherOptions.cs`.
- **Implémentation** :
  - `AddIdentity<AppUser, IdentityRole<Guid>>()` avec `Password.RequireDigit/Lower/Upper/NonAlphanumeric/MinLength=10`, lockout, options email confirmation off (MVP).
  - JWT : claims `sub (userId)`, `email`, `org_id` (organisation active), `role`, `jti`. Expiration 15 min. Signing key via configuration.
  - Refresh tokens : opaque, stockés hashés, rotation automatique à chaque refresh, révocation cascade.
  - `appsettings` : section `Jwt` (Issuer, Audience, Key, AccessMinutes, RefreshDays).
- **Acceptance** : DI valide, tests unitaires basiques de `JwtTokenService` (génération + validation).
- **Depends on** : T013

### T021 — Endpoints Auth
- **Files** : `Api/Modules/Auth/AuthController.cs`, `Api/Modules/Auth/Dtos/*.cs`, `Api/Modules/Auth/AuthService.cs`.
- **Endpoints** :
  - `POST /api/auth/register` → crée user + org "Mon Garage" + membre Owner, renvoie tokens.
  - `POST /api/auth/login` → `email + password + organizationId?`, renvoie tokens.
  - `POST /api/auth/refresh` → `refreshToken` → nouveaux tokens (rotation).
  - `POST /api/auth/logout` → révoque le refresh token courant.
  - `POST /api/auth/switch-org` → ré-émet un access token avec un autre `org_id` (parmi les orgs auxquelles l'user appartient).
  - `GET /api/auth/me` → user + liste de ses orgs + org active.
- **DTO grouping** : `RegisterRequestDto/RegisterResponseDto`, etc.
- **Acceptance** : tests d'intégration cycle register → login → refresh → switch-org → logout.
- **Depends on** : T020

### T022 — Middleware multitenant
- **Files** : `Api/Middleware/CurrentOrganizationMiddleware.cs`, `Api/Services/CurrentUserService.cs`.
- **Implémentation** :
  - Lit `org_id` du JWT, valide que l'user en est membre, expose via `ICurrentUserService`.
  - Si endpoint marqué `[AllowAnonymous]` ou `[NoTenant]`, skip.
  - Erreur 403 si JWT a un `org_id` auquel l'user n'appartient plus.
- **Acceptance** : un user A avec orgX ne voit jamais les données d'orgY (test d'intégration).
- **Depends on** : T021, T013

### T023 — Pipeline middleware Api (CORS, Swagger, Serilog, error handler)
- **Files** : `Api/Program.cs`, `Api/Middleware/ExceptionHandlingMiddleware.cs`, `Api/Extensions/SerilogConfig.cs`.
- **Implémentation** :
  - CORS strict : origin = `Cors:AllowedOrigins` (tableau).
  - Serilog : console + fichier rotatif `logs/api-.log`, enrichers (`FromLogContext`, `WithMachineName`, `WithEnvironmentName`).
  - Exception handler : transforme exceptions en `ProblemDetails` JSON RFC 7807. Map `ValidationException` → 400, `UnauthorizedAccessException` → 403, `KeyNotFoundException` → 404.
  - Swagger en Dev avec auth Bearer.
- **Acceptance** : `/swagger` accessible en dev, erreurs renvoient `application/problem+json`.
- **Depends on** : T022

### T024 — Bootstrap d'une organisation par défaut au register
- **Goal** : à l'inscription, créer auto une organisation et y rattacher l'user comme Owner.
- **Files** : `Api/Modules/Organizations/OrganizationService.cs`.
- **Implémentation** : transaction `register user → create org "<FullName>'s Garage" → create UserOrganization Owner`. Slug généré dérivé du nom (kebab-case + suffixe aléatoire).
- **Acceptance** : après `/auth/register`, `/auth/me` renvoie 1 org avec rôle Owner.
- **Depends on** : T021

---

## PHASE 3 — Fondations UI Front

### T030 — Configuration globale du portal (Tailwind, theme, fonts)
- **Files** : `app/layout.tsx`, `app/globals.css`, `tailwind.config.ts`.
- **Implémentation** :
  - Police Inter (Google Fonts via `next/font`).
  - Theme tokens shadcn + variables CSS : background, foreground, muted, accent, primary (bleu garage moderne `oklch` ou hex), destructive.
  - Mode clair par défaut, dark mode prêt mais désactivé MVP.
  - Toaster `<Sonner />` global.
- **Acceptance** : page d'accueil temporaire stylée, sonner toast démo fonctionne.
- **Depends on** : T003

### T031 — Client API typé + intercepteur auth
- **Files** : `lib/api/client.ts`, `lib/api/types.ts`, `lib/auth/tokens.ts`, `lib/auth/refresh-flow.ts`.
- **Implémentation** :
  - Wrapper axios avec baseURL = `process.env.NEXT_PUBLIC_API_URL`.
  - Intercepteur request : injecte `Authorization: Bearer <token>` (lu d'un cookie httpOnly via Server Action ou d'un context côté client).
  - Intercepteur response : sur 401, tente un refresh une fois, replay l'appel.
  - Gestion `org_id` : header `X-Organization-Id` optionnel pour les use-cases d'override (sinon JWT).
- **Acceptance** : appel d'un endpoint protégé fonctionne avec refresh transparent.
- **Depends on** : T021, T023, T030

### T032 — Pages Login & Register
- **Files** : `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `lib/schemas/auth.ts`, `components/auth/LoginForm.tsx`, `components/auth/RegisterForm.tsx`.
- **UI** :
  - Layout split-screen : illustration/cite à gauche, formulaire à droite.
  - LoginForm : email, password, bouton "Se connecter", lien "Créer un compte", sonner toast en cas d'erreur.
  - RegisterForm : nom complet, email, mot de passe (avec strength meter visuel), nom du garage (optionnel — par défaut prend `"Garage de <Prénom>"`), bouton "Créer mon compte".
  - Validation Zod + RHF, messages en français.
  - Redirige vers `/dashboard` au succès.
- **Acceptance** : flux complet inscription → login → dashboard accessible.
- **Depends on** : T031

### T033 — Layout authentifié (sidebar + header)
- **Files** : `app/(app)/layout.tsx`, `components/layout/Sidebar.tsx`, `components/layout/Topbar.tsx`, `components/layout/OrgSwitcher.tsx`, `components/layout/UserMenu.tsx`, `components/layout/MobileNav.tsx`.
- **UI** :
  - **Sidebar gauche** (desktop, fixe, ~256px) avec sections : Tableau de bord, Clients, Véhicules, Timeline, Rappels, Rendez-vous, Historique, Fidélisation, Paramètres. Icônes lucide. Item actif souligné, hover subtil.
  - **Topbar** : breadcrumbs, recherche globale (`Cmd+K`), `OrgSwitcher` (popover liste des orgs), `UserMenu` (avatar → profil, paramètres, déconnexion).
  - **MobileNav** : Sheet shadcn déclenché par hamburger sur < md.
  - Garde d'auth : middleware Next redirige vers `/login` si pas de token.
- **Acceptance** : navigation entre toutes les pages de squelette fonctionne, mobile responsive.
- **Depends on** : T032

### T034 — Composants génériques réutilisables
- **Files** :
  - `components/ui/PageHeader.tsx` (titre, description, actions à droite — slot).
  - `components/ui/DataTable.tsx` (basé `@tanstack/react-table` + shadcn Table : tri colonnes, pagination, recherche, sélection multi, slot d'actions par ligne).
  - `components/ui/EmptyState.tsx` (icône, titre, description, bouton CTA).
  - `components/ui/ConfirmDialog.tsx` (AlertDialog shadcn, props `title, description, confirmLabel, variant, onConfirm`).
  - `components/ui/FormDialog.tsx` (Dialog shadcn générique avec footer Cancel/Submit, état loading).
  - `components/ui/DetailDrawer.tsx` (Sheet shadcn côté droit, header + sections).
  - `components/ui/SectionCard.tsx` (Card avec header + contenu).
  - `components/ui/StatusBadge.tsx` (Badge avec variants color-coded).
  - `components/ui/RowActions.tsx` (DropdownMenu icône `…` avec items View/Edit/Delete personnalisables).
  - `components/ui/AsyncButton.tsx` (Button avec loader pendant promise).
- **Acceptance** : Storybook pas requis mais chaque composant est utilisé dans au moins une page.
- **Depends on** : T030

### T035 — TanStack Query provider + helpers
- **Files** : `app/providers.tsx`, `lib/query/queryClient.ts`, `lib/query/keys.ts`.
- **Implémentation** : `QueryClientProvider`, `staleTime: 30s`, `refetchOnWindowFocus: false`, devtools activés en dev. Hub central des query keys (`customers.all`, `customers.detail(id)`, etc.) pour invalidations cohérentes.
- **Acceptance** : DevTools visibles en dev.
- **Depends on** : T030

---

## PHASE 4 — Module Clients

### T040 — API Clients (CRUD + recherche)
- **Files** : `Api/Modules/Customers/CustomersController.cs`, `CustomerService.cs`, `Dtos/*.cs`, `Validators/*.cs`.
- **Endpoints** :
  - `GET /api/customers?search=&status=&page=&pageSize=&sortBy=&sortDir=` → paginated list avec count véhicules par client.
  - `GET /api/customers/{id}` → détail + véhicules + 5 dernières interactions.
  - `POST /api/customers` → création.
  - `PATCH /api/customers/{id}` → mise à jour partielle.
  - `DELETE /api/customers/{id}` → soft delete (cascade soft sur véhicules ? non, on garde les véhicules avec leur status).
  - `POST /api/customers/{id}/interactions` → ajout interaction manuelle.
- **DTO Request** : `CreateCustomerRequestDto`, `UpdateCustomerRequestDto`, `CustomersListRequestDto`, `AddInteractionRequestDto`.
- **DTO Response** : `CustomerListItemDto`, `CustomerDetailDto`, `CustomerInteractionDto`.
- **Validation** : email format, phone E.164, FullName 2..150 chars.
- **Acceptance** : tous endpoints couverts par tests d'intégration ; multitenancy vérifié.
- **Depends on** : T022, T013

### T041 — Page liste Clients
- **Files** : `app/(app)/customers/page.tsx`, `components/customers/CustomersTable.tsx`, `lib/api/customers.ts`, `lib/schemas/customer.ts`.
- **UI explicite** :
  - **PageHeader** : titre "Clients", description "Tous les clients de votre garage", bouton primaire **"+ Nouveau client"** à droite (ouvre `CustomerCreateDialog`).
  - **Barre de filtres** : input de recherche (debounce 300ms), select "Statut" (Tous / Actif / Inactif / Perdu), bouton "Réinitialiser".
  - **DataTable colonnes** : Nom, Email, Téléphone, Véhicules (count), Statut (StatusBadge), Acquis le, Actions (`RowActions` : 👁 Voir, ✏ Modifier, 🗑 Supprimer).
  - **Sélection multi** + barre d'actions groupées (apparait quand sélection > 0) : "Supprimer la sélection" (ouvre ConfirmDialog), "Exporter CSV".
  - **EmptyState** quand 0 client : icône, "Aucun client pour le moment", bouton "Ajouter votre premier client".
  - **Skeleton** pendant le chargement (5 lignes squelettes).
  - **Pagination** : 25/50/100 par page, sélecteur en bas.
  - **Toast sonner** sur chaque action (succès/erreur).
- **Acceptance** : tous les boutons sont opérationnels, recherche fonctionne, suppression demande confirmation.
- **Depends on** : T040, T034, T035

### T042 — Modale création/édition Client
- **Files** : `components/customers/CustomerFormDialog.tsx` (mode `create | edit`), `components/customers/CustomerForm.tsx`.
- **UI** :
  - Modale shadcn 600px width.
  - Champs en 2 colonnes responsive : Nom complet*, Email, Téléphone, Date d'acquisition*, Adresse, Ville, Code postal, Notes (textarea), Tags (input multi-tag).
  - Footer : "Annuler" (ferme), "Créer" / "Enregistrer" (soumet, AsyncButton).
  - Validation Zod en temps réel, messages sous chaque champ.
  - À la création réussie → invalide query liste + toast vert + ferme.
  - En édition → préremplit, à la sauvegarde invalide query détail + liste.
- **Acceptance** : créer et éditer un client fonctionnent ; erreurs serveur affichées proprement.
- **Depends on** : T041

### T043 — Drawer/page détail Client
- **Files** : `app/(app)/customers/[id]/page.tsx`, `components/customers/CustomerDetailHeader.tsx`, `components/customers/CustomerVehiclesSection.tsx`, `components/customers/CustomerInteractionsSection.tsx`, `components/customers/AddInteractionDialog.tsx`.
- **UI** :
  - **Header** : retour, nom client + StatusBadge, boutons "✏ Modifier" (ouvre `CustomerFormDialog` mode edit), "🗑 Supprimer" (ConfirmDialog), "+ Interaction" (ouvre `AddInteractionDialog`), "+ Véhicule" (ouvre `VehicleFormDialog` préremplit `customerId`).
  - **3 cartes** :
    1. **Informations** : email/tel/adresse, bouton "Copier" à côté du tel.
    2. **Véhicules** : grid de cartes véhicule (photo, marque/modèle, plaque, km), clic → détail véhicule.
    3. **Historique interactions** : timeline verticale d'icônes (Call/Visit/Sms/Email/Note), filtre par type, pagination "Charger plus".
  - **Tab "Timeline"** secondaire : événements à venir et passés liés à ce client.
- **Acceptance** : toutes les CTA fonctionnent, navigation fluide.
- **Depends on** : T040, T042, T052 (vehicles)

### T044 — Recherche globale (Topbar Cmd+K)
- **Files** : `components/layout/GlobalSearch.tsx`.
- **Implémentation** : Command shadcn, raccourci `⌘K` / `Ctrl+K`. Recherche Customers + Vehicles via endpoint `GET /api/search?q=`. Item → navigue vers détail.
- **API associée** : `Api/Modules/Search/SearchController.cs` qui requête en parallèle.
- **Acceptance** : tape "dup" → "Dupont" apparaît, Enter navigue.
- **Depends on** : T040

---

## PHASE 5 — Module Véhicules

### T050 — API Véhicules
- **Files** : `Api/Modules/Vehicles/VehiclesController.cs`, service, DTOs.
- **Endpoints** :
  - `GET /api/vehicles?search=&customerId=&engineType=&page=&pageSize=`
  - `GET /api/vehicles/{id}` → détail + customer + entretiens + timeline events
  - `POST /api/vehicles` (corps inclut `customerId`)
  - `PATCH /api/vehicles/{id}`
  - `DELETE /api/vehicles/{id}`
  - `POST /api/vehicles/{id}/mileage` → mise à jour kilométrage (logge interaction + recalcule timeline)
  - `POST /api/vehicles/{id}/photo` (multipart)
- **Validation** : LicensePlate obligatoire, Year 1950..(currentYear+1), Mileage >= 0.
- **Acceptance** : multitenancy vérifié, plate unique par org.
- **Depends on** : T040

### T051 — Page liste Véhicules
- **Files** : `app/(app)/vehicles/page.tsx`, `components/vehicles/VehiclesTable.tsx`.
- **UI** : équivalent T041 — PageHeader avec **"+ Nouveau véhicule"**, filtres (recherche, type moteur, année), DataTable colonnes (Photo mini, Marque/Modèle, Année, Plaque, Client (lien), Km, Type moteur, Actions). EmptyState. Skeleton. Pagination.
- **Acceptance** : actions Voir/Modifier/Supprimer opérationnelles.
- **Depends on** : T050, T034

### T052 — Modale création/édition Véhicule
- **Files** : `components/vehicles/VehicleFormDialog.tsx`, `components/vehicles/VehicleForm.tsx`, `components/vehicles/CustomerCombobox.tsx`.
- **UI** :
  - Modale 720px.
  - Champs : Client* (Combobox shadcn avec recherche async, ou prérempli si ouvert depuis fiche client), Marque*, Modèle*, Année*, Immatriculation*, VIN, Couleur, Type moteur* (Select), Boîte (Select), Date d'achat, Kilométrage actuel*.
  - Bloc photo : drag&drop ou bouton "Choisir une photo", aperçu, bouton "Retirer".
  - Footer : Annuler / Créer-Enregistrer.
- **Acceptance** : création depuis page liste OU depuis fiche client (préremplit) OK.
- **Depends on** : T051

### T053 — Page détail Véhicule
- **Files** : `app/(app)/vehicles/[id]/page.tsx`, `components/vehicles/VehicleHeader.tsx`, `components/vehicles/VehicleSummaryCard.tsx`, `components/vehicles/VehicleTimelineSection.tsx`, `components/vehicles/VehicleMaintenanceSection.tsx`, `components/vehicles/UpdateMileageDialog.tsx`.
- **UI** :
  - **Header** : retour, photo + marque/modèle/plaque, boutons "✏ Modifier", "🗑 Supprimer", "📏 Mettre à jour kilométrage" (UpdateMileageDialog), "+ Entretien" (MaintenanceFormDialog préremplit vehicleId).
  - **Carte Résumé** : Client (lien), Année, VIN, Couleur, Type moteur, Boîte, Acheté le, Km (badge "MAJ il y a X jours").
  - **Section Timeline** : événements à venir (chronologique), chaque item a actions "Marquer fait", "Reporter", "Envoyer un rappel".
  - **Section Historique entretien** : table chronologique inverse, colonnes Date, Type, Description, Km, Coût, Mécanicien, Actions (✏ Modifier, 🗑 Supprimer).
- **Acceptance** : toutes les CTA opérationnelles.
- **Depends on** : T050, T060 (maintenance)

---

## PHASE 6 — Historique d'entretien

### T060 — API Maintenance
- **Files** : `Api/Modules/Maintenance/MaintenanceController.cs`, service, DTOs.
- **Endpoints** :
  - `GET /api/vehicles/{vehicleId}/maintenance` (paginated)
  - `POST /api/vehicles/{vehicleId}/maintenance`
  - `PATCH /api/maintenance/{id}`
  - `DELETE /api/maintenance/{id}`
- **Logique** : à la création/modif d'un MaintenanceRecord avec `NextDueAt` ou `NextDueMileage`, créer automatiquement un `TimelineEvent` correspondant.
- **Acceptance** : un entretien créé génère bien un événement timeline si "prochaine échéance" renseignée.
- **Depends on** : T050, T070

### T061 — Modale création/édition Entretien
- **Files** : `components/maintenance/MaintenanceFormDialog.tsx`.
- **UI** :
  - Modale 600px.
  - Champs : Date* (date picker), Type* (Select : Vidange / Pneus / Freins / Révision complète / Contrôle technique / Autre), Description (textarea), Kilométrage* (préremplit avec Vehicle.CurrentMileage), Coût (€), Mécanicien.
  - Bloc "Prochaine échéance" (collapsible) : date, kilométrage.
  - Footer : Annuler / Enregistrer.
- **Acceptance** : modale réutilisable depuis fiche véhicule.
- **Depends on** : T060

---

## PHASE 7 — Timeline Engine (cœur différenciant)

### T070 — Moteur de règles Timeline
- **Files** :
  - `Domain/Timeline/Rules/IRule.cs` + `RuleContext.cs`.
  - `Domain/Timeline/Rules/SixMonthMaintenanceRule.cs`
  - `Domain/Timeline/Rules/AnnualTechnicalInspectionRule.cs` (à partir de la 5e année si véhicule particulier en France)
  - `Domain/Timeline/Rules/TireSwapRule.cs` (saisonnier oct/avr)
  - `Domain/Timeline/Rules/MileageBasedServiceRule.cs` (tous les 15 000 km)
  - `Domain/Timeline/Rules/TradeInOpportunityRule.cs` (3 ans après achat)
  - `Domain/Timeline/Rules/WarrantyExpiryRule.cs`
  - `Infrastructure/Timeline/TimelineEngine.cs` (orchestre les règles).
- **Implémentation** :
  - Chaque règle implémente `bool Applies(Vehicle v)` + `IEnumerable<TimelineEvent> Generate(Vehicle v, DateTime now)`.
  - Règles activables/désactivables par organisation (table `OrganizationTimelineRule(OrganizationId, RuleCode, Enabled)`).
  - Engine appelé : (1) à la création/modif d'un Vehicle, (2) après ajout d'un MaintenanceRecord, (3) périodiquement par job Hangfire.
  - Idempotence : on ne recrée pas un event s'il existe déjà avec même `Kind` + `DueAt` ± 7j.
- **Acceptance** : tests unitaires par règle (cas véhicule récent, ancien, électrique, etc.).
- **Depends on** : T013

### T071 — API Timeline
- **Files** : `Api/Modules/Timeline/TimelineController.cs`.
- **Endpoints** :
  - `GET /api/timeline?vehicleId=&customerId=&from=&to=&status=`
  - `POST /api/timeline` (création manuelle)
  - `PATCH /api/timeline/{id}` (édition titre/date)
  - `POST /api/timeline/{id}/complete`
  - `POST /api/timeline/{id}/skip`
  - `POST /api/timeline/{id}/snooze` (`days` en body)
  - `POST /api/timeline/regenerate` (admin) → relance l'engine pour toute l'org.
- **Acceptance** : suite cohérente, sécurité OK.
- **Depends on** : T070

### T072 — Page Timeline globale
- **Files** : `app/(app)/timeline/page.tsx`, `components/timeline/TimelineList.tsx`, `components/timeline/TimelineEventCard.tsx`, `components/timeline/CreateTimelineEventDialog.tsx`.
- **UI** :
  - PageHeader : titre "Timeline", description, bouton **"+ Événement manuel"**.
  - Filtres : période (segmented control "Cette semaine / Ce mois / 3 mois / 6 mois / Personnalisé"), type (multi-select badges), client/véhicule (combobox).
  - Vue liste groupée par mois avec sticky headers.
  - Chaque carte : icône type, titre, sous-titre (véhicule + client cliquable), date/échéance km, badge statut, **actions inline** : "✓ Marquer fait", "💤 Reporter", "📣 Envoyer rappel maintenant", "✏ Modifier", "🗑 Supprimer", menu `…` pour actions secondaires.
  - Vue alternative "calendrier" (toggle haut droit) → mois grille.
- **Acceptance** : actions opérationnelles, EmptyState présent.
- **Depends on** : T071

---

## PHASE 8 — Rappels Automatiques

### T080 — API Reminders
- **Files** : `Api/Modules/Reminders/RemindersController.cs`, service, DTOs.
- **Endpoints** :
  - `GET /api/reminders?status=&channel=&from=&to=&page=`
  - `GET /api/reminders/{id}`
  - `POST /api/reminders` (création manuelle, optionnellement liée à un TimelineEvent)
  - `PATCH /api/reminders/{id}` (édition canal, date, contenu résolu)
  - `POST /api/reminders/{id}/cancel`
  - `POST /api/reminders/{id}/send-now` (force l'envoi)
  - `POST /api/reminders/{id}/snooze`
  - `POST /api/reminders/from-timeline/{timelineEventId}` (génère depuis event)
- **Acceptance** : statuts cohérents, transitions verrouillées (un Sent ne se Cancel pas).
- **Depends on** : T071

### T081 — Création automatique de Reminders depuis Timeline
- **Files** : `Infrastructure/Reminders/AutoReminderScheduler.cs` + Hangfire job `EnsureRemindersJob`.
- **Implémentation** :
  - Pour chaque TimelineEvent `Pending` dont la `DueAt` est dans < 30 jours et qui n'a pas déjà un Reminder, créer un Reminder `Scheduled` avec `ScheduledAt = DueAt - LeadTimeForKind`.
  - Lead times configurables par organisation : maintenance 14j, contrôle technique 21j, etc.
- **Acceptance** : job s'exécute quotidiennement, idempotent.
- **Depends on** : T080, T100

### T082 — Page Rappels
- **Files** : `app/(app)/reminders/page.tsx`, `components/reminders/RemindersTable.tsx`, `components/reminders/ReminderFormDialog.tsx`, `components/reminders/SendNowDialog.tsx`.
- **UI** :
  - PageHeader : titre "Rappels", bouton **"+ Nouveau rappel"**.
  - Filtres : statut (Programmés / Envoyés / Échoués / Annulés), canal (SMS / Email / Tous), période.
  - DataTable colonnes : Date prévue, Client (lien), Véhicule, Canal (icône), Sujet/Aperçu, Statut, Actions (`👁 Aperçu`, `✉ Envoyer maintenant`, `✏ Modifier`, `💤 Reporter`, `❌ Annuler`).
  - Sélection multi + actions groupées : "Envoyer maintenant", "Annuler".
  - **Aperçu modale** : montre exactement le SMS/email résolu (template + variables substituées).
  - Tab/onglet "Programmés" / "Envoyés" / "Échoués" en haut.
- **Acceptance** : flux send-now fonctionne, statut MAJ en temps réel après refetch.
- **Depends on** : T080

---

## PHASE 9 — Messaging (SMS / Email)

### T090 — Abstraction `IEmailSender` et `ISmsSender`
- **Files** :
  - `Domain/Messaging/IEmailSender.cs`, `Domain/Messaging/ISmsSender.cs`.
  - `Infrastructure/Messaging/Email/ResendEmailSender.cs` (default).
  - `Infrastructure/Messaging/Email/NoOpEmailSender.cs` (logge en console, défaut dev sans clé).
  - `Infrastructure/Messaging/Sms/TwilioSmsSender.cs` (default).
  - `Infrastructure/Messaging/Sms/NoOpSmsSender.cs`.
- **Implémentation** :
  - Sélection du sender via configuration (`Messaging:Email:Provider = Resend|NoOp`, idem SMS).
  - Resend : SDK officiel ou HTTP client.
  - Twilio : SDK officiel.
  - Tous les envois passent par `MessageDispatchService` qui crée d'abord un `MessageLog` `Pending`, puis appelle le sender, puis met à jour le statut.
- **Acceptance** : en dev avec NoOp, on voit le log en console et `MessageLog` créé en base.
- **Depends on** : T013

### T091 — Templates de messages
- **Files** : `Api/Modules/Messaging/TemplatesController.cs`, service, DTOs, seed templates par défaut.
- **Endpoints** :
  - `GET /api/message-templates?channel=`
  - `POST /api/message-templates`
  - `PATCH /api/message-templates/{id}`
  - `DELETE /api/message-templates/{id}`
  - `POST /api/message-templates/{id}/preview` (body: `customerId, vehicleId?`) → renvoie le rendu.
- **Templates seed** :
  - `reminder.maintenance.email/sms`
  - `reminder.technical-inspection.email/sms`
  - `reminder.tire-swap.email/sms`
  - `reminder.appointment-confirmation.email/sms`
  - `lifecycle.welcome.email`
  - `lifecycle.trade-in-opportunity.email`
- **Variables disponibles** : `{{customer.firstName}}`, `{{vehicle.make}}`, `{{vehicle.licensePlate}}`, `{{event.dueAt|date}}`, `{{org.name}}`, `{{org.phone}}`, etc. Moteur de rendu : Scriban ou Handlebars.NET.
- **Acceptance** : preview renvoie le texte rendu correctement.
- **Depends on** : T080

### T092 — Page Paramètres → onglet Templates
- **Files** : `app/(app)/settings/templates/page.tsx`, `components/templates/TemplatesList.tsx`, `components/templates/TemplateEditorDialog.tsx`, `components/templates/TemplatePreviewDialog.tsx`.
- **UI** :
  - Liste segmentée par canal (tabs Email / SMS).
  - Chaque template : carte avec code, sujet (si email), aperçu première ligne, badge Active/Inactive, boutons "✏ Modifier", "👁 Aperçu", "Activer/Désactiver".
  - **TemplateEditorDialog** : sujet (email), body (textarea monospace avec sidebar à droite listant les variables disponibles, clic → insère au curseur), bouton "Aperçu" (ouvre PreviewDialog).
  - **TemplatePreviewDialog** : combobox client + véhicule de test → affiche le rendu final.
- **Acceptance** : édition + aperçu en temps réel.
- **Depends on** : T091

### T093 — Préférences messaging par organisation
- **Files** : `Api/Modules/Organizations/OrganizationSettingsController.cs`, page front `app/(app)/settings/messaging/page.tsx`.
- **UI** : champs "Nom expéditeur email", "Email expéditeur", "Nom expéditeur SMS (sender ID)", switch "Activer SMS", switch "Activer Email", clés API (masquées, "Modifier" → modale).
- **Acceptance** : sauvegarde validée.
- **Depends on** : T092

---

## PHASE 10 — Hangfire & jobs en arrière-plan

### T100 — Configuration Hangfire
- **Files** : `Api/Extensions/HangfireConfig.cs`, `Api/Jobs/*.cs`.
- **Implémentation** :
  - `AddHangfire(...).UsePostgreSqlStorage(connStr)`. Dashboard sur `/hangfire` protégé par auth admin.
  - Jobs récurrents (à enregistrer au boot) :
    - `daily-timeline-regeneration` (cron `0 2 * * *`) → regénère timeline pour tous véhicules actifs.
    - `daily-ensure-reminders` (cron `0 3 * * *`) → T081.
    - `every-5-min-dispatch-due-reminders` → envoie les `Scheduled` dont `ScheduledAt <= now`.
    - `weekly-loyalty-recompute` → précalcule métriques fidélisation par org.
- **Acceptance** : `/hangfire` accessible, jobs visibles, déclenchables manuellement.
- **Depends on** : T013

### T101 — Job de dispatch des rappels
- **Files** : `Api/Jobs/DispatchDueRemindersJob.cs`.
- **Implémentation** : sélectionne `Reminder.Scheduled` arrivés à échéance, par org → résout template avec contexte client/véhicule → appelle `MessageDispatchService` → met à jour `Reminder.Status` (Sent/Failed) + `MessageLog`.
- **Acceptance** : test d'intégration de bout en bout avec NoOp sender.
- **Depends on** : T100, T091

---

## PHASE 11 — Dashboard (BFF + UI)

### T110 — Endpoint BFF Dashboard
- **Files** : `Api/Modules/Dashboard/DashboardController.cs`, `DashboardService.cs`, `Dtos/DashboardOverviewResponseDto.cs`.
- **Goal** : un seul appel renvoie tout ce qu'il faut pour la page d'accueil.
- **Réponse** :
  - `KPIs`: clients actifs, clients à relancer (>180 jours sans contact), véhicules suivis, rappels envoyés (30 derniers jours), rappels en attente, taux de retour atelier (12 derniers mois).
  - `UpcomingReminders[]` : 10 prochains.
  - `OverdueTimeline[]` : événements en retard.
  - `RecentInteractions[]` : 10 dernières interactions multi-clients.
  - `RemindersChartSeries` : envois par jour 30 derniers jours.
  - `LoyaltyTrend` : retour clients par mois 12 derniers mois.
- **Acceptance** : un seul round-trip alimente toute la page.
- **Depends on** : T080, T120

### T111 — Page Dashboard
- **Files** : `app/(app)/dashboard/page.tsx`, `components/dashboard/KpiCard.tsx`, `components/dashboard/UpcomingRemindersWidget.tsx`, `components/dashboard/OverdueTimelineWidget.tsx`, `components/dashboard/RemindersChart.tsx`, `components/dashboard/LoyaltyChart.tsx`, `components/dashboard/QuickActions.tsx`.
- **UI explicite** :
  - **PageHeader** : "Bonjour <Prénom> 👋", date du jour, bouton **QuickActions** dropdown (+ Client, + Véhicule, + Rappel manuel, + Rendez-vous).
  - **Ligne 1 (KPIs)** : 4 KpiCard (gros chiffre, label, mini-trend ▲▼, lien "voir tous").
  - **Ligne 2** :
    - Carte "Rappels à venir" (UpcomingRemindersWidget) : liste 5 items, bouton "Voir tous" + actions inline "Envoyer maintenant".
    - Carte "Événements en retard" (rouge, mêmes interactions).
  - **Ligne 3** :
    - Graphique chartJS bar "Rappels envoyés par jour".
    - Graphique chartJS line "Retour clients par mois".
  - **Ligne 4** : "Activité récente" — timeline d'icônes interactions.
  - Skeletons pleins pendant loading.
- **Acceptance** : tout est cliquable, graphes responsives.
- **Depends on** : T110

---

## PHASE 12 — Rendez-vous (légère)

### T115 — API Appointments
- **Files** : `Api/Modules/Appointments/AppointmentsController.cs`, service, DTOs.
- **Endpoints** :
  - `GET /api/appointments?from=&to=&customerId=&status=`
  - `POST /api/appointments`
  - `PATCH /api/appointments/{id}` (reschedule, status)
  - `POST /api/appointments/{id}/confirm`
  - `POST /api/appointments/{id}/cancel`
  - `POST /api/appointments/{id}/done`
- **Auto** : à la création, programme un Reminder de confirmation (24h avant) si email/tel client renseignés.
- **Acceptance** : flux complet OK.
- **Depends on** : T080

### T116 — Page Rendez-vous
- **Files** : `app/(app)/appointments/page.tsx`, `components/appointments/AppointmentCalendar.tsx`, `components/appointments/AppointmentList.tsx`, `components/appointments/AppointmentFormDialog.tsx`.
- **UI** :
  - PageHeader : titre "Rendez-vous", bouton **"+ Nouveau RDV"**.
  - Toggle "Liste" / "Calendrier" (semaine ou mois).
  - **Vue calendrier** : grille jours, slots horaires, clic vide → ouvre form dialog avec date/heure prérempli, clic sur RDV → DetailDrawer.
  - **DetailDrawer** : infos client/véhicule, sujet, notes, boutons "✓ Confirmer", "✓ Marquer effectué", "❌ Annuler", "✏ Modifier", "🗑 Supprimer".
  - StatusBadge couleur par statut.
- **Acceptance** : tous les flux opérationnels.
- **Depends on** : T115

---

## PHASE 13 — Suivi Fidélisation

### T120 — Service de calcul Fidélisation
- **Files** : `Domain/Loyalty/LoyaltyMetricsService.cs`, `Api/Modules/Loyalty/LoyaltyController.cs`.
- **Métriques** :
  - **Taux de rétention 12 mois** : clients qui sont revenus dans les 12 derniers mois ÷ clients existants il y a 12 mois.
  - **Clients perdus** : aucun contact > 18 mois ET au moins une interaction passée.
  - **Fréquence retour** : moyenne d'intervalle entre interactions par client actif.
  - **Cohort retention** : tableau cohortes par mois d'acquisition.
- **Endpoints** :
  - `GET /api/loyalty/overview` (KPIs)
  - `GET /api/loyalty/cohorts`
  - `GET /api/loyalty/at-risk-customers?limit=`
  - `GET /api/loyalty/lost-customers`
- **Job Hangfire hebdo** précalcule pour ne pas recalculer à chaque requête (table `LoyaltySnapshot`).
- **Acceptance** : valeurs cohérentes sur jeu de seed.
- **Depends on** : T040

### T121 — Page Fidélisation
- **Files** : `app/(app)/loyalty/page.tsx`, `components/loyalty/CohortHeatmap.tsx`, `components/loyalty/AtRiskList.tsx`, `components/loyalty/LostCustomersList.tsx`, `components/loyalty/RetentionTrendChart.tsx`.
- **UI** :
  - PageHeader : titre "Fidélisation", description, bouton **"Lancer une campagne de relance"** (ouvre BulkRelaunchDialog : sélectionne template + clients à risque + canal).
  - **KPI Row** : 4 cartes (Taux de rétention 12m, Clients revenus, Clients perdus, Fréquence moyenne).
  - **CohortHeatmap** (Echarts) : x = mois cohorte, y = mois écoulé, couleur = % retour.
  - **À risque** : liste clients sans contact depuis 12-18 mois, action inline "📣 Relancer".
  - **Perdus** : liste avec dernière visite, action "Marquer comme perdu" / "Réactiver".
- **Acceptance** : campagne de relance crée N reminders d'un coup avec confirmation.
- **Depends on** : T120, T091

---

## PHASE 14 — Stockage de fichiers

### T130 — API Files
- **Files** : `Api/Modules/Files/FilesController.cs`, service, `Infrastructure/Files/DbFileStorage.cs` (impl `IFileStorage`), `Infrastructure/Files/CloudflareR2FileStorage.cs` (placeholder à activer plus tard via config).
- **Endpoints** :
  - `POST /api/files` (multipart, `folder` query) → renvoie `fileId`.
  - `GET /api/files/{id}` → renvoie binaire avec content-type.
  - `DELETE /api/files/{id}`.
- **Implémentation** : table `FileFolder` (Customers, Vehicles, OrganizationLogos, etc.), `FileMetadata`, `StoredFile`. Hash SHA256 pour dédoublonnage. Limite taille 10 MB MVP.
- **Acceptance** : upload + récupération fonctionne, limites respectées.
- **Depends on** : T013

### T131 — Composant ImageUploader
- **Files** : `components/ui/ImageUploader.tsx`.
- **UI** : zone drag&drop avec aperçu, bouton "Retirer", indicateur progress, erreurs (taille, type) en sonner.
- **Réutilisé** par : photo véhicule, logo organisation, avatar user.
- **Acceptance** : intégré au moins dans VehicleFormDialog.
- **Depends on** : T130, T034

---

## PHASE 15 — Paramètres & Profil

### T140 — Page Paramètres (layout + onglets)
- **Files** : `app/(app)/settings/layout.tsx`, `app/(app)/settings/page.tsx` (redirige vers `/settings/organization`).
- **Onglets gauche** : Organisation, Membres, Templates de messages, Messaging (providers), Règles Timeline, Préférences personnelles.
- **Acceptance** : navigation fonctionne.
- **Depends on** : T033

### T141 — Onglet Organisation
- **Files** : `app/(app)/settings/organization/page.tsx`, `components/settings/OrganizationGeneralForm.tsx`, `components/settings/DangerZone.tsx`.
- **UI** :
  - Form : Nom, Slug (lecture seule + bouton "Régénérer" qui ouvre ConfirmDialog), Logo (ImageUploader), Fuseau, Locale, Téléphone, Adresse.
  - DangerZone : "Supprimer l'organisation" (ConfirmDialog avec saisie du nom pour confirmer).
- **Acceptance** : tous les champs persistent.
- **Depends on** : T140, T024

### T142 — Onglet Membres
- **Files** : `app/(app)/settings/members/page.tsx`, `components/settings/InviteMemberDialog.tsx`, `components/settings/MembersTable.tsx`.
- **UI** :
  - Table : Avatar, Nom, Email, Rôle (select inline si Owner), Dernière connexion, Actions (✏ Changer rôle, 🚪 Retirer).
  - Bouton **"+ Inviter un membre"** → modale email + rôle → envoie email d'invitation (ou crée user + token d'invitation pour MVP).
- **API associée** : `POST /api/organizations/{id}/invitations`, `GET /api/organizations/{id}/members`, `PATCH /api/organizations/{id}/members/{userId}`, `DELETE …`.
- **Acceptance** : flux complet.
- **Depends on** : T140, T024

### T143 — Onglet Règles Timeline
- **Files** : `app/(app)/settings/timeline-rules/page.tsx`.
- **UI** : liste des règles avec switch on/off, paramètres editables (lead time, intervalle km, etc.).
- **Acceptance** : désactiver une règle empêche la génération des events correspondants.
- **Depends on** : T070

### T144 — Onglet Préférences personnelles
- **UI** : Nom complet, email (verrouillé, "Demander un changement"), changer mot de passe (modale), avatar, notifications in-app.
- **Acceptance** : changement de mot de passe fonctionne avec ancien+nouveau.
- **Depends on** : T021

---

## PHASE 16 — Notifications in-app

### T150 — Centre de notifications
- **Files** : `Api/Modules/Notifications/NotificationsController.cs`, entité `UserNotification`, hub SignalR optionnel ou polling.
- **Front** : icône cloche dans Topbar avec badge, popover liste des notifications, marquer lu, lien vers entité concernée.
- **Évents émis** : rappel envoyé, rappel échoué, RDV à venir dans 1h, etc.
- **Acceptance** : badge se met à jour, clic marque comme lu.
- **Depends on** : T101

---

## PHASE 17 — Observabilité & santé

### T160 — Health checks + Prometheus
- **Files** : `Api/HealthChecks/*.cs`, configuration `/health/live`, `/health/ready`, `/metrics` (Prometheus).
- **Includes** : Postgres connectivity, Hangfire workers, providers email/SMS (ping).
- **Acceptance** : `/metrics` expose des compteurs custom (rappels envoyés, échoués, latency endpoints).
- **Depends on** : T100

### T161 — Logging structuré + correlation ID
- **Files** : middleware `RequestIdMiddleware`, enricher Serilog `WithCorrelationId`.
- **Acceptance** : un appel en erreur permet de retrouver tous les logs liés via `X-Correlation-Id`.
- **Depends on** : T023

---

## PHASE 18 — Infrastructure de déploiement (mirror Aries/QSE)

### T170 — Dockerfiles
- **Files** : `apps/api/Dockerfile` (multi-stage SDK→runtime), `apps/portal/Dockerfile` (multi-stage node→standalone).
- **Acceptance** : `docker build` passe pour chaque service.
- **Depends on** : T002, T003

### T171 — `infrastructure/docker-compose.yml`
- **Goal** : stack prod = api + portal + postgres + caddy + watchtower + grafana + loki + promtail + prometheus.
- **Files** : `infrastructure/docker-compose.yml`, `infrastructure/.env.example`.
- **Acceptance** : `docker compose up -d` démarre toute la stack sur un VPS Ubuntu propre.
- **Depends on** : T170

### T172 — Caddyfile
- **Files** : `infrastructure/caddy/Caddyfile`.
- **Implémentation** : reverse proxy `app.<domaine>` → portal:3000, `api.<domaine>` → api:8080, HTTPS auto Let's Encrypt.
- **Acceptance** : config validée.
- **Depends on** : T171

### T173 — Grafana / Loki / Promtail / Prometheus
- **Files** : `infrastructure/grafana/provisioning/`, `infrastructure/loki/loki-config.yml`, `infrastructure/promtail/promtail-config.yml`, `infrastructure/prometheus/prometheus.yml`, dashboards JSON.
- **Implémentation** : reprend les configs Aries/QSE, scrape `/metrics` de l'API, ingère logs Docker via Loki/Promtail. Dashboard "API health", "Reminders dispatch", "DB activity".
- **Acceptance** : dashboards accessibles sur Grafana et peuplés.
- **Depends on** : T160, T171

### T174 — Watchtower
- **Files** : service dans `infrastructure/docker-compose.yml`.
- **Implémentation** : poll registry GitLab toutes les 5 min, restart auto sur nouvelle image.
- **Acceptance** : push d'une image → conteneur redémarré.
- **Depends on** : T171

### T175 — Scripts d'opération
- **Files** : `infrastructure/scripts/bootstrap.sh`, `db-dump.sh`, `db-restore.sh`, `deploy.sh`.
- **Bootstrap** : prépare un VPS Ubuntu (docker, ufw, swap, user, fetch repo). Inspiré directement de Aries/QSE.
- **Acceptance** : peut bootstrap un VPS clean en < 15 min.
- **Depends on** : T171

### T176 — `RUNBOOK.md`
- **Goal** : procédure d'incident, rollback, redémarrage, restauration backup, rotation de secrets.
- **Acceptance** : un nouvel ops peut intervenir avec ce seul doc.
- **Depends on** : T175

---

## PHASE 19 — Polish, qualité, accessibilité

### T180 — Empty states & loading skeletons partout
- **Goal** : passer toutes les pages en revue, vérifier qu'aucune liste vide n'affiche un blanc, qu'aucun chargement ne montre un état figé.
- **Acceptance** : checklist par page validée.
- **Depends on** : toutes les pages

### T181 — Mobile responsive complet
- **Goal** : sidebar → bottom nav sur mobile, modales en sheet plein écran, tables scrollables horizontalement avec colonne nom sticky.
- **Acceptance** : test manuel sur iPhone SE width (375px) — toutes pages utilisables.
- **Depends on** : toutes les pages

### T182 — Accessibilité (a11y)
- **Goal** : focus trap sur modales, labels aria, contraste AA, navigation clavier complète sur tables, raccourcis annoncés.
- **Outils** : axe DevTools, Lighthouse a11y.
- **Acceptance** : score Lighthouse a11y >= 95 sur dashboard, customers, vehicles.
- **Depends on** : toutes les pages

### T183 — Tests E2E critiques (Playwright)
- **Files** : `apps/portal/e2e/*.spec.ts`.
- **Scenarios** :
  1. Register → onboarding → ajout client → ajout véhicule → voir timeline générée.
  2. Création reminder manuel → envoi (NoOp) → vérification dans MessageLog.
  3. Modification mileage véhicule → recalcul timeline.
  4. Multitenancy : switch d'org isole les données.
- **Acceptance** : passent en CI.
- **Depends on** : toutes les phases métier

### T184 — Tests d'intégration API (xUnit + Testcontainers)
- **Files** : `apps/api/tests/CarHorizontal.Api.Tests/*`.
- **Scenarios** : auth complet, CRUD chaque entité, multitenancy isolation, génération timeline, dispatch rappels.
- **Acceptance** : couverture > 70% sur services.
- **Depends on** : toutes les phases API

### T185 — Performance
- **Goal** : profiler les pages liste (clients, véhicules, rappels) avec 10 000 lignes seed, vérifier qu'on reste sous 1s TTI.
- **Optimisations** : index DB, pagination serveur stricte, virtualization tanstack-table.
- **Acceptance** : benchmarks documentés.
- **Depends on** : T183

### T186 — Documentation utilisateur
- **Files** : `docs/user-guide/` (markdown servable depuis `/help` dans le portal — page simple qui rend le markdown).
- **Sections** : démarrage rapide (créer son premier client en 30s), comprendre la timeline, configurer ses templates, lancer une campagne de relance.
- **Acceptance** : onboarding utilisateur testable.
- **Depends on** : toutes les phases

---

# 📋 Récapitulatif des interactions UI à ne pas oublier

Pour chaque entité (Customer, Vehicle, MaintenanceRecord, TimelineEvent, Reminder, Appointment,
Template, Member), la checklist UX minimale est :

- [ ] **Bouton "+ Nouveau …"** sur la page liste (PageHeader, à droite).
- [ ] **Modale de création** avec validation Zod, footer Annuler/Créer.
- [ ] **Action "Voir"** sur chaque ligne (drawer ou page détail).
- [ ] **Action "Modifier"** sur chaque ligne et dans le détail (rouvre la modale en mode edit).
- [ ] **Action "Supprimer"** avec **ConfirmDialog** (texte explicite, variant destructif).
- [ ] **Sélection multi-lignes** quand pertinent (clients, rappels) avec barre d'actions groupées.
- [ ] **Recherche / filtres** au-dessus de la table.
- [ ] **Pagination** serveur en bas.
- [ ] **EmptyState** avec CTA quand collection vide.
- [ ] **Skeleton** pendant chargement initial.
- [ ] **Toast Sonner** pour chaque action (succès, erreur, info "envoi en cours").
- [ ] **Invalidation TanStack Query** des bonnes clés après mutation.
- [ ] **Gestion d'erreur serveur** affichée dans la modale (champs en rouge si erreur de validation, banner global pour erreurs inattendues).
- [ ] **Loading state** sur le bouton de soumission (AsyncButton).
- [ ] **Échap ferme la modale**, **Cmd+Enter soumet** (raccourci clavier).
- [ ] **Versions mobile** : modales en plein écran (Sheet bottom-up).

Pour chaque entité avec un détail :
- [ ] **Header** avec breadcrumb retour, titre, badges, bouton Modifier, bouton Supprimer, autres CTA contextuels.
- [ ] **Cartes de sections** clairement séparées (informations, relations, historique).
- [ ] **Sous-actions inline** dans les sous-listes (ex. "Marquer fait" dans Timeline).

Pour la navigation :
- [ ] **Sidebar** desktop avec item actif souligné.
- [ ] **Bottom nav** ou Sheet mobile.
- [ ] **Topbar** avec recherche globale Cmd+K, OrgSwitcher, UserMenu.
- [ ] **Breadcrumbs** sur toute page profonde.
- [ ] **404** custom (`app/not-found.tsx`).
- [ ] **Erreur** custom (`app/error.tsx`).

---

# 🎯 Ordre d'exécution recommandé pour une IA

1. **Bootstrap** : T001 → T006
2. **Domaine + DB** : T010 → T015
3. **Auth + multitenancy** : T020 → T024
4. **Fondations UI** : T030 → T035
5. **Premier vertical métier** (Clients) : T040 → T044
6. **Deuxième vertical** (Véhicules) : T050 → T053
7. **Maintenance** : T060 → T061
8. **Cœur différenciant** : T070 → T072 (Timeline), T080 → T082 (Reminders)
9. **Messaging** : T090 → T093
10. **Jobs Hangfire** : T100 → T101
11. **Dashboard** : T110 → T111
12. **Rendez-vous** : T115 → T116
13. **Fidélisation** : T120 → T121
14. **Files** : T130 → T131
15. **Paramètres** : T140 → T144
16. **Notifications in-app** : T150
17. **Observabilité** : T160 → T161
18. **Infra déploiement** : T170 → T176
19. **Polish & QA** : T180 → T186

Chaque tâche doit être validée (build vert + manipulation manuelle) avant de passer à la suivante.

---

# ⚠️ Hors scope MVP (à ne PAS faire)

- Facturation / devis / factures.
- Comptabilité.
- Gestion stock pièces détachées avancée.
- Planning atelier multi-baies / gestion temps mécaniciens.
- Intégrations DMS tiers.
- App mobile native.
- IA prédictive (phase 3 future).
