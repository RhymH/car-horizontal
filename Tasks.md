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

## 🎯 Vision produit non-négociable (lis-moi à chaque session)

CarHorizontal cible **les petits garages et concessions indépendants** qui n'ont
ni le temps ni l'envie de :
- consulter le manuel constructeur de chaque véhicule pour savoir quoi faire et quand,
- maintenir un tableau Excel des prochaines vidanges,
- relancer leurs clients un par un pour les faire revenir.

### Promesse produit
> **« Le logiciel sait. Le garage agit. »**
>
> 1. Le garage saisit un véhicule en 30 secondes (marque, modèle, année, km).
> 2. Le logiciel **anticipe automatiquement** ce qui doit être fait, **quand**, et **pourquoi**, en s'appuyant sur le programme d'entretien réel du constructeur (pas une moyenne générique).
> 3. Le logiciel **envoie au client le bon message au bon moment**, sans intervention du garage.
> 4. Le garage voit en un coup d'œil : "qui dois-je rappeler aujourd'hui ?" et "quoi faire sur ce véhicule la prochaine fois qu'il passe ?".

### Ce qui NE doit JAMAIS se retrouver dans le produit
- ❌ Une page de "configuration de règles" où le garagiste doit définir lui-même les intervalles d'entretien
- ❌ Des rappels génériques "votre véhicule a besoin d'un entretien" — toujours préciser quoi, pourquoi, basé sur quel km/mois
- ❌ Un onboarding qui demande à l'utilisateur de "comprendre" le moteur de timeline
- ❌ De la saisie redondante (typer "Renault Clio" en texte libre alors qu'on peut le sélectionner dans un catalogue)
- ❌ Des règles « tout le monde toutes les 15 000 km » : c'est le pire mensonge, et le garage le sait

### Anti-pattern à détecter à chaque revue de phase
**« Est-ce que cette feature ajoute de la charge mentale au garagiste, ou en retire ? »**
- Si elle ajoute de la charge → la repenser ou la couper.
- Si on a inventé une page de paramètres pour compenser un défaut d'intelligence du moteur → l'intelligence du moteur est insuffisante, pas la page de paramètres qui manque.

---

## ⚠️ Règle anti-oubli (cross-module wiring)

**Problème observé** : quand une tâche d'une phase amont (ex. T043 fiche client) référence
un composant d'une phase aval (ex. T052 `VehicleFormDialog`), la tendance est de stubber
la CTA avec un toast "*disponible en Phase X*" — et d'**oublier** de revenir le câbler
quand la phase aval est livrée.

**Conséquence** : des CTAs qui semblent fonctionner mais ne font rien, des sections
qui affichent du texte mort, des relations entité qui ne se déclenchent pas.

### Règle absolue

> **Quand on stubbe une CTA cross-module, on crée un commentaire `// TODO(T0XX): wire
> with <ce-qui-manque>` à l'endroit du stub, et on liste l'item dans la section
> "Cross-module backfill" de la phase qui livre la dépendance.**

### Audit obligatoire à chaque fin de phase

```powershell
# 1. Détecter les placeholders textuels
rg -i "Phase \d|disponible en Phase|coming soon|sera disponible|à venir|TODO.*Phase|planned in Phase|not yet available" `
    --glob "!Tasks.md" --glob "!ProductDetails.md" --glob "!*.lock*"

# 2. Détecter les TODO de wiring oubliés
rg -i "TODO\(T\d+\)|FIXME.*wire|stub.*until" --glob "!Tasks.md"

# 3. Détecter les toasts "info" suspects (souvent des stubs)
rg "toast\.info\(" apps/portal --glob "*.tsx"
```

Tout résultat non-attendu = à traiter avant de fermer la phase.

### Checklist par phase livrée

- [ ] Toutes les CTA listées dans la phase ouvrent réellement leur dialog/drawer cible
- [ ] Toutes les sections listées affichent réellement leurs données (pas de texte mort)
- [ ] Tous les `// TODO(TXXX)` qui pointaient sur cette phase ont été résolus
- [ ] Audit grep ci-dessus passe sans surprise
- [ ] Section "Cross-module backfill" de la phase n'a aucun item ouvert
- [ ] **Test "charge mentale"** : pour chaque nouvelle feature livrée, demander à voix haute :
  - "Est-ce que cette feature ajoute du travail au garagiste, ou en retire ?"
  - "Est-ce que le garagiste comprend en 5 secondes pourquoi elle est là ?"
  - "Est-ce que sans cette feature, le garagiste devrait quand même y penser ?"
  - Si réponses → ajout / non / oui : la feature ne tient pas la promesse produit, la repenser.

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

## PHASE 7 — Timeline Engine (squelette générique)

> ⚠️ **Cette phase pose seulement le squelette technique** (interface IRule, contexte, orchestration).
> La vraie intelligence métier vient de **Phase 7.5 (catalogue + ProgramExecutorRule)**.
> Les rules génériques listées ci-dessous deviennent des **fallback** quand un véhicule
> n'a pas de `VehicleModelId` lié au catalogue. Ne pas les développer plus que nécessaire.

### T070 — Moteur de règles Timeline (squelette)
- **Files** :
  - `Domain/Timeline/Rules/IRule.cs` + `RuleContext.cs`.
  - `Domain/Timeline/Rules/SixMonthMaintenanceRule.cs` 🔻 fallback uniquement (si pas de VehicleModelId)
  - `Domain/Timeline/Rules/AnnualTechnicalInspectionRule.cs` (légal FR — garder, pas dépendant du modèle)
  - `Domain/Timeline/Rules/TireSwapRule.cs` (saisonnier — garder)
  - `Domain/Timeline/Rules/MileageBasedServiceRule.cs` 🔻 fallback uniquement
  - `Domain/Timeline/Rules/TradeInOpportunityRule.cs` (commercial — garder)
  - `Domain/Timeline/Rules/WarrantyExpiryRule.cs` (commercial — garder)
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

## PHASE 7.1 — Audit & backfill cross-modules (Phases 0 → 7)

**But** : reprendre toutes les CTAs / sections / déclencheurs qui ont été stubbés
dans les phases précédentes parce que leur dépendance n'existait pas encore. À faire
**avant** de commencer Phase 8.

### Audit confirmé (gaps trouvés au scan code, mai 2026)

État au moment de l'audit :

| ID | Fichier | Symptôme | Cause |
|----|---------|----------|-------|
| **G1** | `apps/portal/components/customers/CustomerDetailView.tsx:99` | Bouton "+ Véhicule" du header → `toast.info("disponible en Phase 5")` | Stub jamais retiré après T052 |
| **G2** | `apps/portal/components/customers/CustomerDetailView.tsx:171` | Bouton "+ Véhicule" de la section véhicules → même toast | Idem |
| **G3** | `apps/portal/components/customers/CustomerDetailView.tsx:185` | Tab "Timeline" affiche "*activé en Phase 6*" (texte erroné, c'est Phase 7) | Stub à câbler maintenant |
| **G4** | `apps/api/CarHorizontal.Api/Modules/Vehicles/VehiclesController.cs:88-92` | `POST /api/vehicles/{id}/photo` renvoie 501 "*not yet available, planned in Phase 14*" | Backend non-impl, à traiter en T130/T131 (cross-ref ajouté ci-dessous) |

**Statut OK confirmé au scan** (pas d'action) :
- ✅ `MaintenanceService.SyncTimelineEventAsync` + `_timelineEngine.RunForVehicleAsync` câblés (T060 ↔ T070)
- ✅ `SearchController` indexe Customers + Vehicles (T044)
- ✅ `GlobalSearch.tsx` route vers `/clients/[id]` et `/vehicles/[id]`

### T7.1-A — Brancher "+ Véhicule" depuis la fiche client (G1, G2)

- **Goal** : ouvrir le `VehicleFormDialog` (T052) avec `customerId` pré-rempli, en réutilisant le composant existant.
- **Files** : `apps/portal/components/customers/CustomerDetailView.tsx`, `apps/portal/components/customers/CustomerVehiclesSection.tsx`.
- **Implémentation** :
  - Importer `VehicleFormDialog` depuis `@/components/vehicles/VehicleFormDialog`.
  - Ajouter un state `addVehicleOpen` dans `CustomerDetailView`.
  - Remplacer les 2 `toast.info(...)` (lignes ~99 et ~171) par `setAddVehicleOpen(true)`.
  - Monter `<VehicleFormDialog open={addVehicleOpen} onOpenChange={setAddVehicleOpen} mode={{ kind: "create", presetCustomerId: customer.id }} />`.
  - Vérifier que `VehicleFormDialog` accepte bien un `presetCustomerId` qui désactive ou présélectionne le `CustomerCombobox`. Si non, l'ajouter (props facultatif, fallback sur le comportement existant).
- **UI** :
  - Quand le dialog s'ouvre depuis la fiche client : combobox Client préremplie + en lecture seule (chip avec X pour le déverrouiller, mais pas obligatoire MVP).
  - Au succès : invalider `queryKeys.customers.detail(customer.id)` ET `queryKeys.vehicles.byCustomer(customer.id)` ET `queryKeys.vehicles.list()`.
  - Toast vert "Véhicule ajouté".
- **Acceptance** : créer un véhicule depuis fiche client → la section véhicules de la fiche se rafraîchit immédiatement, la liste globale `/vehicles` aussi.
- **Depends on** : T052

### T7.1-B — Brancher la section "Vehicles" de la fiche client sur la vraie liste

- **Goal** : la section véhicules de `CustomerDetailView` doit afficher tous les véhicules du client (pas seulement ceux retournés par le BFF detail s'il en limite).
- **Files** : `apps/portal/components/customers/CustomerVehiclesSection.tsx`, `apps/portal/lib/api/vehicles.ts`.
- **Implémentation** :
  - Le BFF `GET /api/customers/{id}` doit retourner la liste **complète** des véhicules non supprimés du client (vérifier `CustomerDetailDto.Vehicles`). Sinon ajouter un appel parallèle `vehiclesApi.listByCustomer(customerId)` côté front.
  - Chaque carte véhicule doit être cliquable et naviguer vers `/vehicles/[id]`.
  - EmptyState avec CTA "Ajouter le premier véhicule" si liste vide.
- **Acceptance** : ajouter 3 véhicules à un client → tous visibles sur la fiche client + tous cliquables.
- **Depends on** : T7.1-A, T053

### T7.1-C — Brancher la tab "Timeline" de la fiche client (G3)

- **Goal** : la tab Timeline de `CustomerDetailView` affiche les `TimelineEvent` du client.
- **Files** : `apps/portal/components/customers/CustomerDetailView.tsx`, nouveau `apps/portal/components/timeline/TimelineList.tsx` réutilisable (sera utilisé aussi par T072 et T053).
- **Implémentation** :
  - Appel `GET /api/timeline?customerId={id}&from=now-365d&to=now+365d`.
  - Composant `TimelineList` partagé (Phase 7) : chaque carte = 1 événement avec actions inline.
  - Filtre statut au-dessus (Tous / À venir / En retard / Faits).
  - Si Phase 8 livrée, l'action "Envoyer rappel" est active ; sinon, désactivée avec tooltip "Disponible quand les rappels seront activés" — **et entrée ajoutée dans la section Backfill de Phase 8**.
- **Acceptance** : un client avec véhicule + maintenance → événements générés visibles sur sa fiche.
- **Depends on** : T070, T071

### T7.1-D — Audit page détail Véhicule (`/vehicles/[id]`)

- **Goal** : vérifier que toutes les sections décrites dans T053 sont câblées (pas seulement listées).
- **Checklist** :
  - [ ] Bouton "✏ Modifier" → ouvre `VehicleFormDialog` mode edit avec données pré-remplies.
  - [ ] Bouton "🗑 Supprimer" → `ConfirmDialog` → soft delete → redirige vers `/vehicles`.
  - [ ] Bouton "📏 Mettre à jour kilométrage" → `UpdateMileageDialog` → POST `/api/vehicles/{id}/mileage` → invalide queries véhicule + timeline.
  - [ ] Bouton "+ Entretien" → `MaintenanceFormDialog` (T061) avec `vehicleId` pré-rempli.
  - [ ] Section "Historique entretien" affiche la liste réelle de `MaintenanceRecord` triée DESC, avec actions ✏/🗑 par ligne.
  - [ ] Section "Timeline" affiche les `TimelineEvent` du véhicule avec actions inline (Marquer fait, Reporter, Envoyer rappel — cette dernière conditionnelle Phase 8).
  - [ ] Pas de placeholder "Phase X" dans les composants `apps/portal/components/vehicles/`.
- **Goal** : si une case n'est pas cochée, créer un sous-ticket dans cette phase et corriger.
- **Depends on** : T053, T061, T071

### T7.1-E — Audit "+ Interaction" sur fiche client

- **Goal** : vérifier que `AddInteractionDialog` (T043) appelle bien `POST /api/customers/{id}/interactions` et que la liste se rafraîchit.
- **Implémentation** : tester end-to-end. Si bouton "Copier" tel/email : tester. Si filtre par type d'interaction : tester. Si pagination "Charger plus" : tester (sinon créer ticket).
- **Acceptance** : ajouter une interaction → apparaît immédiatement.
- **Depends on** : T043

### T7.1-F — Audit `dotnet ef` migrations à jour

- **Goal** : depuis Phase 1 (T014 `Initial`), des entités peuvent avoir été ajoutées (TimelineEvent rules config, MessageTemplate, etc.). Vérifier qu'aucune entité du domaine n'est sans configuration EF / sans table.
- **Implémentation** :
  - `dotnet ef migrations list -p CarHorizontal.Infrastructure -s CarHorizontal.Api`
  - `dotnet ef migrations has-pending-model-changes` (ou snapshot diff manuel) — si des changements sont pending, créer migration `Phase7Backfill`.
- **Acceptance** : `dotnet ef database update` ne fait rien (DB à jour avec le modèle).
- **Depends on** : T014

### T7.1-G — Sweep grep automatique

- **Goal** : zéro placeholder textuel dans le code applicatif.
- **Implémentation** : exécuter les 3 grep de la "Règle anti-oubli" en tête de ce document. Pour chaque résultat, soit le justifier (doc légitime, libellé d'UI, message d'erreur réel) soit créer un ticket de fix.
- **Livrable** : un commit "chore(7.1): audit complete" qui ajoute un fichier `docs/audits/2026-XX-XX-phase7.md` avec les résultats du sweep et les actions prises.
- **Acceptance** : second run du sweep ⇒ 0 résultat non-justifié.

---

## PHASE 7.5 — Catalogue véhicules & programmes constructeur 🚨 CŒUR DU PRODUIT

> **À faire AVANT de finir Phase 8.** C'est cette phase qui rend les rappels de Phase 8
> intelligents. Sans elle, les rappels seront génériques et le produit perdra sa
> différenciation. Tout le reste du système prend du sens grâce à ça.

### Diagnostic de l'état actuel (mai 2026)

L'implémentation Phase 7 actuelle est **trop générique** pour tenir la promesse produit :
- `Vehicle` ne stocke `Make`/`Model`/`Year` qu'en texte libre — aucun lien à un catalogue
- `MileageBasedServiceRule` déclenche un événement tous les 15 000 km **identiquement** pour tout véhicule
- `SixMonthMaintenanceRule` ajoute un événement tous les 6 mois **identiquement**
- Les libellés sont vagues ("Entretien semestriel recommandé", "Révision à 60 000 km")
- Aucune notion de gravité (vidange ≠ courroie de distribution ≠ contrôle freins)

**Résultat** : un garage qui reçoit ces rappels n'y croit pas, parce qu'il sait que sa
Clio IV diesel a des intervalles précis (vidange 20 000 km / 12 mois, filtre carburant
60 000 km, courroie 160 000 km/6 ans, etc.) — pas une moyenne arbitraire.

### Objectif Phase 7.5

**Le logiciel doit connaître nativement** que :
- Une Renault Clio IV 1.5 dCi 2018 nécessite : vidange + filtre huile @ 20 000 km/12 mois,
  filtre habitacle @ 30 000 km, filtre carburant @ 60 000 km, liquide de frein @ 2 ans,
  courroie distribution @ 160 000 km/6 ans, liquide refroidissement @ 4 ans/90 000 km, etc.
- Une Tesla Model 3 nécessite : vérification freins/liquide @ 2 ans, climatisation @ 6 ans,
  rotation pneus @ 10 000–15 000 km — pas de vidange.
- Une Peugeot 308 1.2 PureTech a son propre programme.

Et **projeter ces règles** sur l'historique réel de chaque véhicule pour générer des
événements timeline **précis** ("Vidange + filtre huile à 60 000 km — prévue dans 1 200 km").

### T7.5-A — Domaine : entités catalogue

- **Files** :
  - `Domain/Entities/Catalog/VehicleModel.cs` (entité partagée **sans `OrganizationId`** — réf. globale)
  - `Domain/Entities/Catalog/MaintenanceProgram.cs`
  - `Domain/Entities/Catalog/MaintenanceProgramItem.cs`
  - `Domain/Entities/Catalog/MaintenanceItemCode.cs` (énumération stable des codes : `oil_change`, `oil_filter`, `cabin_filter`, `air_filter`, `fuel_filter`, `brake_fluid`, `brake_pads_front`, `brake_pads_rear`, `brake_discs_front`, `brake_discs_rear`, `timing_belt`, `accessory_belt`, `coolant`, `spark_plugs`, `glow_plugs`, `transmission_fluid`, `differential_fluid`, `tire_rotation`, `tire_replacement`, `wipers`, `battery_check`, `ac_service`, `power_steering_fluid`, `dpf_regen`, etc.)
  - `Domain/Entities/Catalog/MaintenanceItemSeverity.cs` enum (`Critical` = sécurité, `Recommended`, `Optional`)
  - `Domain/Entities/Catalog/MaintenanceItemTrigger.cs` enum (`Earliest` — premier des deux, `Latest`, `TimeOnly`, `KmOnly`)
  - `Domain/Entities/Vehicles/VehicleProgramOverride.cs` (override par véhicule, OrganizationEntityBase)
- **Champs `VehicleModel`** :
  - `Id, Make, Model, Trim?, EngineCode?, EngineDisplayName, EngineType, FuelType, ProductionStartYear, ProductionEndYear?, MarketRegion (FR/EU/Global), DisplayName (computed), Slug (unique), Aliases (string[])`
- **Champs `MaintenanceProgram`** :
  - `Id, VehicleModelId, Name (e.g. "Standard", "Usage intensif"), IsDefault, Source (Manufacturer|Curated|Custom), SourceReference?, ValidFromMileage = 0, ValidToMileage?`
- **Champs `MaintenanceProgramItem`** :
  - `Id, ProgramId, Code (MaintenanceItemCode), Title, Description?, IntervalMonths?, IntervalKm?, FirstOccurrenceMonths?, FirstOccurrenceKm?, Trigger (Earliest|Latest|TimeOnly|KmOnly), Severity (Critical|Recommended|Optional), EstimatedDurationMinutes?, EstimatedCostMin?, EstimatedCostMax?, RequiredParts (string[])`
- **Champs `VehicleProgramOverride`** :
  - `Id, OrganizationId, VehicleId, ItemCode, OverrideIntervalMonths?, OverrideIntervalKm?, Disabled (bool), Reason?`
- **Acceptance** : compile, configurations EF posées, un VehicleModel peut avoir N programmes, chaque programme N items.
- **Depends on** : T070

### T7.5-B — Lier `Vehicle` au catalogue (refactor)

- **Files** : `Domain/Entities/Vehicles/Vehicle.cs`, configuration EF, migration `LinkVehicleToCatalog`.
- **Implémentation** :
  - Ajouter `Vehicle.VehicleModelId (Guid?)` — nullable pour rétrocompatibilité avec véhicules existants en texte libre
  - Garder `Make`, `Model`, `Year` mais les rendre **dénormalisés** depuis `VehicleModel` quand `VehicleModelId` est non-null (mis à jour à la création/modif)
  - Ajouter `Vehicle.SelectedProgramId (Guid?)` — quand un VehicleModel a plusieurs programmes, l'org choisit lequel
  - Migration CLI uniquement
- **Backfill données existantes** : commande seed `dotnet run -- relink-vehicles` qui tente de matcher les véhicules existants par `(Make, Model, Year)` fuzzy (Levenshtein) → écrit un rapport `e:/tmp/relink-report.csv` à valider, n'écrit rien tant que pas validé.
- **Acceptance** : un véhicule peut être créé soit avec `VehicleModelId` (préféré), soit avec saisie libre (legacy / modèle absent du catalogue).
- **Depends on** : T7.5-A

### T7.5-C — Seed du catalogue v1 (modèles courants en France)

- **Files** :
  - `apps/api/CarHorizontal.Infrastructure/Catalog/Seed/vehicle-models.json` (catalogue brut)
  - `apps/api/CarHorizontal.Infrastructure/Catalog/Seed/CatalogSeeder.cs` (loader idempotent)
- **Contenu MVP — au moins 50 modèles** couvrant ~80% du parc des petits garages FR :
  - **Renault** : Clio II/III/IV/V (essence + dCi), Megane III/IV, Captur I/II, Scenic III/IV, Kangoo II/III, Twingo II/III, Zoé
  - **Peugeot** : 207, 208 I/II, 308 II/III, 2008 I/II, 3008 II, 5008 II, Partner II/III, 508
  - **Citroën** : C3 II/III, C4 II/III, Berlingo II/III, C5, DS3, DS4
  - **Dacia** : Sandero I/II/III, Logan I/II, Duster I/II, Lodgy
  - **Volkswagen** : Polo IV/V/VI, Golf VI/VII/VIII, Passat B7/B8, Tiguan I/II
  - **Toyota** : Yaris III/IV, Corolla XII (hybride), Auris II, RAV4 IV/V
  - **Ford** : Fiesta VII/VIII, Focus III/IV, Kuga II/III, Transit Custom
  - **BMW** : Série 1 F20, Série 3 F30/G20, Série 5 F10/G30
  - **Audi** : A1, A3 8V/8Y, A4 B8/B9
  - **Tesla** : Model 3, Model Y
  - **Hybrides spécifiques** : Toyota Prius IV, Hyundai Ioniq, Renault Captur E-Tech
- **Programmes** : pour chaque modèle, programme **"Standard"** au minimum + **"Usage intensif"** quand pertinent (taxi, livraison)
- **Sources** :
  - Manuels constructeurs publics (PDF) — convertis en JSON manuellement pour la v1
  - Bases publiques tierces (GitHub `vehicle-maintenance-schedules`, NHTSA, sites grossistes pièces)
  - Validation par un mécanicien (à demander à l'utilisateur — un contact garage de confiance)
- **Format JSON** :
  ```json
  {
    "vehicleModels": [{
      "slug": "renault-clio-iv-15-dci-90-2018-2023",
      "make": "Renault", "model": "Clio IV", "trim": "1.5 dCi 90",
      "engineCode": "K9K-628", "engineDisplayName": "1.5 dCi 90 ch",
      "engineType": "Diesel", "fuelType": "Diesel",
      "productionStartYear": 2018, "productionEndYear": 2023,
      "marketRegion": "FR",
      "aliases": ["Clio IV dCi", "Clio 4 1.5 dCi"],
      "programs": [{
        "name": "Standard", "isDefault": true, "source": "Manufacturer",
        "items": [
          { "code": "oil_change",   "title": "Vidange + filtre huile", "intervalMonths": 12, "intervalKm": 20000, "trigger": "Earliest", "severity": "Critical" },
          { "code": "cabin_filter", "title": "Filtre habitacle",       "intervalKm": 30000, "trigger": "KmOnly", "severity": "Recommended" },
          { "code": "fuel_filter",  "title": "Filtre carburant",       "intervalKm": 60000, "trigger": "KmOnly", "severity": "Critical" },
          { "code": "air_filter",   "title": "Filtre à air",           "intervalKm": 60000, "trigger": "KmOnly", "severity": "Recommended" },
          { "code": "brake_fluid",  "title": "Liquide de frein",       "intervalMonths": 24, "trigger": "TimeOnly", "severity": "Critical" },
          { "code": "timing_belt",  "title": "Courroie de distribution","intervalMonths": 72, "intervalKm": 160000, "trigger": "Earliest", "severity": "Critical", "estimatedCostMin": 600, "estimatedCostMax": 1100 },
          { "code": "coolant",      "title": "Liquide de refroidissement","intervalMonths": 48, "intervalKm": 90000, "trigger": "Earliest", "severity": "Recommended" }
        ]
      }]
    }]
  }
  ```
- **Loader** : à chaque démarrage en dev, lit le JSON et upsert par `slug` (idempotent). En prod : commande explicite `dotnet run -- catalog-import path/to/file.json`.
- **Acceptance** : `SELECT count(*) FROM "VehicleModels"` ≥ 50 après seed dev. Le programme de la Clio IV dCi est bien chargé.
- **Depends on** : T7.5-A

### T7.5-D — Refactor `TimelineEngine` : `ProgramExecutorRule`

- **Files** :
  - `Domain/Timeline/Rules/ProgramExecutorRule.cs` (NOUVEAU)
  - `Domain/Timeline/Rules/SixMonthMaintenanceRule.cs` → **garder en fallback** quand `Vehicle.VehicleModelId == null`
  - `Domain/Timeline/Rules/MileageBasedServiceRule.cs` → **idem fallback**
  - `Infrastructure/Timeline/TimelineEngine.cs` (logique d'orchestration)
- **Implémentation `ProgramExecutorRule`** :
  - `Applies` : `Vehicle.VehicleModelId != null && Vehicle.SelectedProgramId != null`
  - `Generate` :
    1. Charge le `MaintenanceProgram` avec ses items
    2. Charge l'historique : tous les `MaintenanceRecord` du véhicule, indexés par `Code` (à condition qu'on ait ajouté un champ `Code` sur `MaintenanceRecord` — voir T7.5-E)
    3. Pour chaque `MaintenanceProgramItem` :
       - Trouve le dernier MaintenanceRecord avec ce `Code` → `lastDoneAt`, `lastDoneKm`
       - Calcule `nextDueAt` = `lastDoneAt + IntervalMonths` (si IntervalMonths)
       - Calcule `nextDueKm` = `lastDoneKm + IntervalKm` (si IntervalKm)
       - Selon `Trigger` (Earliest = celui qui arrive en premier après projection km), choisit l'échéance effective
       - Pour la **première occurrence** : utilise `FirstOccurrenceMonths` / `FirstOccurrenceKm` si fournis, sinon `IntervalMonths` / `IntervalKm` à partir de `Vehicle.PurchasedAt` ou `CreatedAt`
       - Crée un `TimelineEvent` avec :
         - `Title` = `"{ProgramItem.Title} — {VehicleModel.DisplayName}"` (ex. "Vidange + filtre huile — Clio IV 1.5 dCi 90 ch")
         - `Description` = phrase humaine ("Prévu à 60 000 km — vous êtes à 58 800 km, soit dans environ X jours / Y km")
         - `Severity` reportée (pour styling UI + priorisation des reminders)
         - `GeneratedFromRule` = `"Program:{ProgramId}:{ItemCode}"`
         - Idempotence : ne recrée pas si un event identique (même `(VehicleId, ItemCode, DueAt±7j)`) existe déjà
    4. Applique les `VehicleProgramOverride` quand présents (ignore items disabled, override intervals)
- **Acceptance** :
  - Test unitaire : véhicule Clio IV dCi avec 55 000 km et dernier filtre carburant à 0 km → `ProgramExecutorRule` génère un événement "Filtre carburant à 60 000 km" (severity Critical), pas un événement générique
  - Test unitaire : Tesla Model 3 → ne génère **pas** d'événement vidange (le programme n'en a pas)
  - Le job Hangfire `daily-timeline-regeneration` (T100) appelle bien le nouveau rule
- **Depends on** : T7.5-A, T7.5-B, T7.5-C

### T7.5-E — Lier `MaintenanceRecord` à un `ItemCode`

- **Files** : `Domain/Entities/Maintenance/MaintenanceRecord.cs`, migration `MaintenanceRecordItemCode`, mise à jour DTOs/validators du module Maintenance.
- **Implémentation** :
  - Ajouter `MaintenanceRecord.ItemCodes (string[])` — un entretien peut couvrir plusieurs items (ex. "Grande révision" = oil_change + cabin_filter + brake_fluid)
  - À la création/modif depuis `MaintenanceFormDialog`, **proposer une liste d'items** (cases à cocher pré-sélectionnées en fonction du `Type` choisi : "Vidange" → coche `oil_change` + `oil_filter` automatiquement, "Grande révision" → plusieurs cases)
  - Ces codes alimentent l'historique exploité par `ProgramExecutorRule`
- **Backfill données** : pour les `MaintenanceRecord` existants, mapper le champ `Type` (Oil/Tires/Brakes/...) vers les codes correspondants automatiquement (script de migration de données).
- **Acceptance** : créer une "Grande révision" → coche `oil_change`, `oil_filter`, `cabin_filter`, `air_filter`, `brake_fluid` par défaut, modifiable. Après save, `ProgramExecutorRule` re-projecte la timeline et les prochains items pour ces codes sont décalés.
- **Depends on** : T7.5-A, T7.5-D

### T7.5-F — UI : `VehicleModelPicker` dans `VehicleFormDialog`

- **Files** : `apps/portal/components/vehicles/VehicleModelPicker.tsx`, refactor `VehicleFormDialog.tsx`.
- **API associée** : `GET /api/catalog/vehicle-models?q=&make=&fuel=&yearAt=&page=` (paginé, recherche fuzzy sur make/model/aliases).
- **UI** :
  - Au lieu de 3 inputs free-text Make/Model/Year, un **gros bloc combobox unique** :
    - Étape 1 : tape "clio" → suggestions ("Renault Clio IV 1.5 dCi 90 ch — 2018-2023", "Renault Clio V 1.0 TCe 100 ch — 2019-...", etc.)
    - Étape 2 : sélection → la fiche véhicule auto-remplit Make/Model/Year, montre une carte de confirmation avec photo générique du modèle + résumé du programme constructeur (ex. "9 entretiens programmés — vidange tous les 20 000 km, courroie à 160 000 km, etc.")
  - Si plusieurs `MaintenanceProgram` disponibles (Standard / Intensif) → toggle juste en dessous
  - Lien discret "Mon modèle n'est pas dans la liste" → bascule en **mode legacy** (saisie texte libre + warning "les rappels seront génériques pour ce véhicule, mais vous pouvez quand même utiliser CarHorizontal")
- **Acceptance** :
  - Ajouter un véhicule avec modèle catalogue : 4 clics, programme auto-attaché
  - La timeline se peuple immédiatement avec les bons items
- **Depends on** : T7.5-C, T052

### T7.5-G — UI : section "Programme constructeur" sur `/vehicles/[id]`

- **Files** :
  - `apps/portal/components/vehicles/MaintenanceProgramSection.tsx`
  - `apps/portal/components/vehicles/ProgramItemCard.tsx`
  - `apps/portal/components/vehicles/ProgramOverrideDialog.tsx`
- **API associée** : `GET /api/vehicles/{id}/program-projection` → renvoie pour chaque item du programme :
  - `code, title, severity, lastDoneAt?, lastDoneKm?, nextDueAt?, nextDueKm?, status (Done|UpcomingSoon|Upcoming|Overdue|Future), kmRemaining?, daysRemaining?, estimatedCostRange?`
- **UI** :
  - **SectionCard "Programme d'entretien constructeur"** sous la section Résumé véhicule
  - Sous-titre : "Renault Clio IV 1.5 dCi 90 ch — Standard" + lien "Changer le programme"
  - **Vue par défaut** : 3 sous-listes Tabs : "À faire bientôt" / "Tout le programme" / "Historique"
  - Chaque `ProgramItemCard` montre :
    - Icône severity (🔴 Critique / 🟡 Recommandé / 🟢 Optionnel)
    - Titre item + dernière fois ("Fait il y a 18 mois @ 38 000 km" ou "Jamais effectué")
    - Prochaine échéance ("⏰ Dans 1 200 km" ou "📅 Dans 3 mois" ou "⚠️ En retard de 2 mois")
    - Coût estimé si dispo
    - Boutons : **"✓ Marquer comme fait"** (ouvre `MaintenanceFormDialog` avec `ItemCodes` pré-cochés), **"📣 Envoyer un rappel client"** (Phase 8), **"⚙️ Personnaliser pour ce véhicule"** (ouvre `ProgramOverrideDialog`)
  - Mention en bas : "Ces préconisations sont basées sur le programme constructeur Renault. Vous pouvez les ajuster pour ce véhicule en cliquant sur l'item."
- **Acceptance** :
  - Sur une Clio IV avec 55 000 km, l'utilisateur voit immédiatement : "Filtre carburant prévu à 60 000 km — dans 1 200 km", "Vidange faite il y a 8 mois @ 47 000 km — prochaine dans 4 mois ou 12 000 km".
  - Aucune saisie nécessaire, juste lecture.
- **Depends on** : T7.5-D, T7.5-E, T7.5-F

### T7.5-H — Wizard d'onboarding (réduction charge mentale)

- **Goal** : un nouveau garage doit être opérationnel en 5 minutes, sans lire de doc.
- **Files** : `apps/portal/app/(app)/onboarding/page.tsx`, composants `OnboardingStep1Garage.tsx`, `OnboardingStep2Customers.tsx`, `OnboardingStep3Vehicles.tsx`, `OnboardingStep4Messaging.tsx`, `OnboardingStep5Done.tsx`.
- **Trigger** : à la première connexion d'un Owner d'une org sans aucun client, redirige automatiquement vers `/onboarding`. Skippable mais ré-affichable depuis `/settings`.
- **Étapes** :
  1. **Garage** : nom (pré-rempli), téléphone, adresse rapide, logo (optionnel)
  2. **Clients** : "Importez votre fichier (CSV)" OU "Ajoutez votre premier client" (FormDialog) OU "Je le ferai plus tard"
  3. **Véhicules** : pour chaque client ajouté, propose "Ajouter le véhicule" (utilise `VehicleModelPicker` — montre la promesse "Le programme constructeur sera attaché automatiquement")
  4. **Messaging** : switch SMS / Email + un texte "Préférez-vous que CarHorizontal envoie les rappels automatiquement, ou simplement vous notifier en interne ?" (3 options : Auto / Notif puis manuel / Désactivé) + sender ID
  5. **Done** : "Vous êtes prêt. Voici votre tableau de bord." → résumé visuel ("3 véhicules suivis, 12 entretiens anticipés sur les 12 prochains mois")
- **Important** : à AUCUN moment l'utilisateur n'est exposé à la notion de "règle", "moteur", ou "configuration de timeline".
- **Acceptance** : un nouvel utilisateur arrive sur le dashboard avec sa data prête en moins de 5 minutes.
- **Depends on** : T7.5-F, T024

### T7.5-I — Repositionner `/settings/timeline-rules` (T143)

- **Goal** : le terme "règles timeline" est trop technique. Renommer + repositionner.
- **Implémentation** :
  - Renommer la page en **"Préférences d'entretien"**.
  - Contenu épuré : **uniquement** des switches métier exprimés en langage garage :
    - "Envoyer un rappel pour le contrôle technique légal (5 ans + tous les 2 ans)" : ON/OFF
    - "Détecter les opportunités de reprise après 3 ans d'usage" : ON/OFF
    - "Rappeler le changement de pneus saisonnier (octobre / avril)" : ON/OFF
    - "Délai de prévenance par défaut avant un entretien : [14] jours" (slider 7-30j)
  - **Pas** d'affichage des `MaintenanceProgramItem` ici (ils sont consultables sur la fiche véhicule).
  - **Pas** de notion de "rule code".
- **Depends on** : T143 (annule/remplace son contenu actuel)

### T7.5-J — Backfill côté Phase 8 (Reminders intelligents)

- **Goal** : les reminders générés par Phase 8 doivent être **contextuels** au programme.
- **Implémentation** :
  - Quand un `Reminder` est créé depuis un `TimelineEvent` issu de `ProgramExecutorRule`, il **embarque** le `ItemCode` et `Severity` dans son contenu.
  - La **priorité d'envoi** dépend de la severity : Critical envoyés en premier, plus tôt (lead time = 21j au lieu de 14j).
  - Le `Reminder.ResolvedSubject` et `ResolvedBody` utilisent un template **spécifique au code item** quand disponible (ex. `reminder.maintenance.timing_belt.email`), sinon fallback sur `reminder.maintenance.generic.email`.
- **Depends on** : T080, T091, T7.5-D

### T7.5-K — Templates par défaut enrichis (Phase 9)

- **Goal** : que les templates par défaut soient **immédiatement utiles** (le garage n'a rien à écrire).
- **Implémentation** : ajouter dans le seed templates (T091) **un template par `MaintenanceItemCode` critique** :
  - `reminder.maintenance.oil_change.sms` :
    > Bonjour {{customer.firstName}}, votre {{vehicle.modelDisplayName}} approche des {{event.dueMileage}} km : il est temps de programmer votre vidange + filtre huile. Souhaitez-vous prendre rendez-vous ? — {{org.name}}
  - `reminder.maintenance.timing_belt.email` :
    > Sujet : Courroie de distribution — votre {{vehicle.modelDisplayName}}
    > Bonjour {{customer.firstName}},
    > Votre véhicule approche des {{event.dueMileage}} km. Le constructeur préconise le remplacement de la courroie de distribution à cette échéance. C'est une intervention essentielle pour éviter une casse moteur.
    > Coût indicatif : {{event.estimatedCost}}.
    > Voulez-vous que nous vous prenions un créneau ? Réponse à ce mail ou appelez-nous au {{org.phone}}.
    > {{org.name}}
  - Idem pour : `brake_fluid`, `fuel_filter`, `cabin_filter`, `coolant`, `tire_replacement` (saisonnier), `technical_inspection` (légal FR)
- **Acceptance** : un garage qui n'a rien configuré reçoit déjà des messages **utiles et précis**.
- **Depends on** : T091, T7.5-D

### T7.5-M — Estimation kilométrique : domaine + service 🚨 BLOQUANT pour ProgramExecutorRule

> **Pourquoi c'est critique** : sans estimation, le système ne peut envoyer un rappel
> "filtre carburant @ 60 000 km" qu'au moment où le garage *saisit* manuellement les
> 60 000 km — donc *après* l'échéance. La promesse "le logiciel anticipe" ne tient pas.

- **Files** :
  - `Domain/Entities/Vehicles/VehicleMileageReading.cs` (table d'historique)
  - `Domain/Vehicles/MileageEstimate.cs` (record `EstimatedKm, Confidence, BasedOnReadings, DailyRate, AsOf`)
  - `Domain/Vehicles/MileageConfidence.cs` enum (`High|Medium|Low`)
  - `Domain/Vehicles/MileageReadingSource.cs` enum (`Manual|MaintenanceRecord|CustomerSelfReport|TechnicalInspection|Estimate|VinDecoder`)
  - `Domain/Vehicles/IMileageEstimationService.cs` interface
  - `Infrastructure/Vehicles/MileageEstimationService.cs` impl
- **Champs `VehicleMileageReading`** : `Id, VehicleId, Mileage (int), ObservedAt (UtcNow par défaut), Source, RecordedAt, RecordedBy?, Notes?`
- **Backfill au moment de la migration** :
  - À la création de la table : insérer un `VehicleMileageReading` par véhicule existant à partir de `Vehicle.CurrentMileage` + `MileageUpdatedAt` (source `Manual`)
  - Insérer un `VehicleMileageReading` par `MaintenanceRecord` existant (source `MaintenanceRecord`)
- **Hooks d'écriture** (à brancher dans les services existants) :
  - `VehicleService.UpdateMileageAsync` → crée un reading `Manual`
  - `MaintenanceService.CreateAsync` → crée un reading `MaintenanceRecord`
  - `Vehicle` création avec `CurrentMileage > 0` → crée un reading `Manual`
- **Algorithme `EstimateAtAsync(vehicleId, asOf)`** :
  ```
  readings = GetReadings(vehicleId).OrderBy(ObservedAt).ToList()
  
  if (readings.Count == 0):
      // Prior par défaut basé sur fuel/usage
      anchorDate = vehicle.PurchasedAt ?? vehicle.CreatedAt
      anchorKm = 0
      dailyRate = PriorDailyRate(vehicle.EngineType, vehicle.IsCommercial)
      confidence = Low
  
  elif (readings.Count == 1):
      anchorDate = readings[0].ObservedAt
      anchorKm = readings[0].Mileage
      dailyRate = PriorDailyRate(vehicle.EngineType, vehicle.IsCommercial)
      confidence = (asOf - anchorDate).Days < 30 ? High : (Days < 180 ? Medium : Low)
  
  else:
      // Régression pondérée : poids = exp(-(now - observed).days / 365)
      // dailyRate = sum(weight * delta_km) / sum(weight * delta_days)
      // ancrer sur le reading le plus récent
      mostRecent = readings.Last()
      anchorDate = mostRecent.ObservedAt
      anchorKm = mostRecent.Mileage
      dailyRate = WeightedRate(readings)  // entre 5 et 200 km/j, clamp
      ageOfMostRecent = (asOf - mostRecent.ObservedAt).Days
      confidence = ageOfMostRecent < 30 ? High : (ageOfMostRecent < 180 ? Medium : Low)
  
  estimated = anchorKm + (asOf - anchorDate).TotalDays * dailyRate
  // Cap : ne JAMAIS estimer en-dessous du dernier reading observé
  estimated = Max(estimated, readings.LastOrDefault()?.Mileage ?? 0)
  // Et un cap haut raisonnable : max 1 000 000 km (anti-divergence)
  estimated = Min(estimated, 1_000_000)
  
  return new MileageEstimate(estimated, confidence, readings.Count, dailyRate, asOf)
  ```
- **Constantes `PriorDailyRate`** :
  - Petrol particulier : 33 km/j (~12 000 km/an)
  - Diesel particulier : 47 km/j (~17 000 km/an)
  - Utility/Commercial : 70 km/j (~25 000 km/an)
  - Hybrid : 38 km/j
  - Electric : 36 km/j
  - LPG : 47 km/j
  - **Override par organisation** possible plus tard (T7.5-O), mais pas MVP.
- **Acceptance** :
  - Test : véhicule sans aucun reading → estimation linéaire à partir du `PurchasedAt` avec prior
  - Test : véhicule avec 2 readings (50 000 km @ J-180, 56 000 km @ J-30) → daily rate ~22 km/j, estimation à J+0 ≈ 56 660 km, confidence Medium
  - Test : véhicule électrique sans aucun reading → ne diverge pas
  - Test : appel `EstimateAtAsync` 1000x sur 10 000 véhicules < 5s (perf — utiliser un cache mémoire avec invalidation)
- **Depends on** : T7.5-A

### T7.5-N — Brancher l'estimation dans `ProgramExecutorRule` + politique de buffer

- **Files** : `Domain/Timeline/Rules/ProgramExecutorRule.cs`, `Infrastructure/Timeline/TimelineEngine.cs`.
- **Implémentation** :
  - Injecter `IMileageEstimationService`.
  - Pour chaque item km-based, calculer `currentEstimate = await _mileage.EstimateAtAsync(vehicle.Id, context.Now)`.
  - **Buffer de sécurité** par confidence (déclencher le `TimelineEvent` "à venir bientôt" un peu en avance) :
    - `High` confidence : buffer = **1 500 km** ou **30 jours** avant l'échéance
    - `Medium` : buffer = **3 000 km** ou **45 jours**
    - `Low` : buffer = **5 000 km** ou **60 jours**
  - Calculer également `estimatedDueAt` (date à laquelle, au rythme actuel, la voiture atteindra `dueKm`) — utile pour ordonner la timeline et pour le contenu des messages.
  - Stocker dans `TimelineEvent` : `EstimatedDueAt (DateTime?)`, `EstimatedKmRemaining (int?)`, `MileageConfidenceAtGeneration (string?)` — pour l'UI puisse l'afficher.
- **Idempotence** : si une nouvelle estimation décale `estimatedDueAt` de plus de 30 jours par rapport à l'event existant, mettre à jour l'event au lieu d'en créer un nouveau.
- **Job auto-refresh** (T100) : `daily-timeline-regeneration` recalcule **toutes les estimations** chaque nuit pour les véhicules actifs → invalidation propagée aux events existants.
- **Acceptance** :
  - Sur la Clio dCi de l'exemple (47 000 km @ J-90, ~58 km/j, filtre @ 60 000 km) → un `TimelineEvent` "Filtre carburant à venir" est généré dès aujourd'hui (estimation ~52 220 km, soit dans ~134 jours / ~7 800 km — déclenchement à `60 000 - 3 000 = 57 000` km soit dans ~83 jours).
  - Test : pour un véhicule avec confidence Low, le rappel se déclenche encore plus tôt (buffer 5 000 km).
- **Depends on** : T7.5-D, T7.5-M

### T7.5-O — Auto-refresh kilométrage : message client + UI fraîcheur

- **Files** :
  - `Api/Modules/Vehicles/MileageCheckController.cs` (endpoints publics signed-link)
  - `apps/portal/app/mileage-check/[token]/page.tsx` (page publique non-authentifiée)
  - `apps/portal/components/vehicles/MileageEstimateCard.tsx` (composant fiche véhicule)
  - `Api/Jobs/EnsureMileageFreshnessJob.cs` (Hangfire)
- **Mécaniques** :
  1. **Hangfire job hebdo** : balaye les véhicules actifs avec `confidence Low` (lecture > 180 jours) → planifie un `Reminder` SMS/email "Bonjour {firstName}, pour bien suivre votre {modelDisplayName}, pourriez-vous nous indiquer votre kilométrage actuel ? [Cliquer ici]" avec un signed-token URL valide 30 jours.
  2. **Page publique** `/mileage-check/[token]` : un seul champ "Mon kilométrage actuel" + bouton "Envoyer". Pas d'auth. Le token résout vehicleId + organizationId, vérifie expiration. POST → crée un `VehicleMileageReading` source `CustomerSelfReport`, recalcule la timeline, montre un message de confirmation chaleureux ("Merci ! Nous reviendrons vers vous au bon moment.").
  3. **Throttling** : un seul mileage-check par véhicule par 90 jours, et jamais si dernière lecture < 60 jours.
  4. **Préférence org** : switch dans Settings → "Demander automatiquement le kilométrage aux clients silencieux" (par défaut ON).
- **UI fiche véhicule** : composant `MileageEstimateCard` au-dessus du bouton "Mettre à jour kilométrage" :
  ```
  ┌─────────────────────────────────────────────────────┐
  │ Kilométrage estimé aujourd'hui                      │
  │ ~52 800 km   (confiance moyenne)                    │
  │                                                     │
  │ Vu à 47 000 km il y a 3 mois — ~58 km/jour          │
  │ [Mettre à jour] [Demander au client]                │
  └─────────────────────────────────────────────────────┘
  ```
  - "Demander au client" déclenche manuellement un mileage-check.
  - Badge couleur selon confidence : vert (High), jaune (Medium), orange (Low).
- **Acceptance** :
  - Un véhicule sans nouvelles depuis 7 mois → message envoyé auto, lien fonctionne, mise à jour propage aux events.
  - Pas de spam : un client ne reçoit pas plus d'1 mileage-check par 90 jours.
- **Depends on** : T7.5-M, T080 (reminders pour le canal d'envoi), T091 (template `lifecycle.mileage_check.sms/email`)

### T7.5-L — Dashboard : widget "Charge mentale évitée"

- **Goal** : montrer la valeur perçue.
- **Implémentation** : dans le dashboard (T111), ajouter un mini-widget "Le mois dernier" :
  - "Le logiciel a anticipé X entretiens" (count des `TimelineEvent` générés ce mois)
  - "Y rappels envoyés automatiquement à vos clients" (sans intervention)
  - "Estimation : Z heures économisées"
- C'est de la com produit, mais ça ancre le **bénéfice** chez le garagiste.
- **Depends on** : T111, T7.5-D

---

## PHASE 8 — Rappels Automatiques

### 🔁 Cross-module backfill (à faire pendant cette phase)

Quand cette phase est livrée, **rouvrir** ces écrans des phases amont et activer ce qui était désactivé :
- **T7.1-C (fiche client → tab Timeline)** : action inline "Envoyer rappel" qui était désactivée → activer en branchant `POST /api/reminders/from-timeline/{id}`.
- **T053 (fiche véhicule → section Timeline)** : action "Envoyer rappel" : idem.
- **T072 (page Timeline globale)** : actions "Envoyer rappel maintenant" + bouton card "📣" : brancher.
- **T7.5-G (section Programme constructeur)** : bouton "📣 Envoyer un rappel client" sur chaque ProgramItemCard : brancher en passant le `ItemCode` au reminder pour que le template choisi soit le bon.
- **Notification toast** d'envoi : "Rappel programmé / envoyé immédiatement".
- **Audit grep** : `rg -i "rappel.*phase|reminder.*not yet|TODO.*reminder"` doit revenir vide.

### ⚠️ Dépendance Phase 7.5

Avant d'investir Phase 8 trop loin : **Phase 7.5 doit avoir livré au moins T7.5-A à T7.5-D**. Sinon les Reminders générés seront génériques et perdront leur intérêt produit. Si Phase 8 est partiellement faite avec des Reminders génériques, c'est OK pour le squelette technique, mais tagger ces tickets avec `// TODO(T7.5-J): re-enrich with program context` pour ne pas oublier de les rouvrir.

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

### 🔁 Cross-module backfill

- **T021 (register)** : email de bienvenue non envoyé jusqu'ici → brancher template `lifecycle.welcome.email` au moment de la création du compte.
- **T142 (invitations membres)** : remplacer le stub d'invitation par un envoi réel d'email avec token.
- **T7.5-K (templates par item)** : ajouter au seed les templates par `MaintenanceItemCode` listés dans T7.5-K. C'est ce qui rend les rappels précis ("courroie de distribution" plutôt que "entretien").
- **Audit grep** : `rg -i "email.*phase|sms.*phase|messaging.*not yet"` vide.
- Vérifier que les anciens `MessageLog` créés pendant Phase 8 (avec NoOp) sont bien lisibles en base.

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

### 🔁 Cross-module backfill

- **T070 timeline regenerate** : si Phase 7 a appelé l'engine en synchrone seulement, ajouter aussi le job récurrent `daily-timeline-regeneration`.
- **T081 ensure-reminders** : doit tourner désormais en cron, pas seulement à la demande.
- **Test bout-en-bout** : créer un véhicule + maintenance avec NextDueAt = J+30, attendre la fenêtre de dispatch (ou trigger le job manuellement) → MessageLog créé avec NoOp → Reminder.Status = Sent.

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

### 🔁 Cross-module backfill

- **Page d'accueil par défaut** : jusqu'ici probablement un stub `PageStub` à `/dashboard` → remplacer par la vraie page.
- **QuickActions dropdown** : doit ouvrir directement les 4 dialogs déjà existants (`CustomerFormDialog`, `VehicleFormDialog`, `ReminderFormDialog`, `AppointmentFormDialog`). Aucun nouveau dialog à créer ; juste réutiliser les composants des phases 4/5/8/12.
- **KpiCard "lien voir tous"** : chacun doit naviguer vers la page liste filtrée correspondante (ex. "clients à relancer" → `/clients?status=at-risk`).
- **T7.5-L (widget "Charge mentale évitée")** : intégrer dans le dashboard le widget qui montre "X entretiens anticipés ce mois grâce à CarHorizontal". C'est le hero indicator du produit.
- **Vue "À faire cette semaine"** : nouvelle carte (en plus de UpcomingReminders) qui liste les `TimelineEvent` à severity Critical dans les 7 prochains jours, avec action "Envoyer rappel" en un clic.
- **Note sur la dépendance circulaire** : T110 dépend de T120 (loyalty trend). **Ordre d'exécution** : faire **T120 (calcul loyalty)** AVANT T110/T111, sinon le BFF ne peut pas alimenter le `LoyaltyTrend`. La tâche T120 est dans Phase 13 — soit on la sort plus tôt, soit on stubbe le champ dans le BFF en attendant (et on l'ajoute à la backfill de Phase 13).

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
  - **PageHeader** : "Bonjour <Prénom>", date du jour, bouton **QuickActions** dropdown (+ Client, + Véhicule, + Rappel manuel, + Rendez-vous).
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

### 🔁 Cross-module backfill

- **Sidebar/Topbar** : item "Rendez-vous" stoppe d'afficher `PageStub` → vraie page calendrier/liste.
- **Fiche client** : ajouter une section "Rendez-vous à venir" + CTA "+ RDV" qui ouvre `AppointmentFormDialog` avec `customerId` pré-rempli. Mettre à jour T043 (`CustomerDetailView`).
- **Fiche véhicule** : idem si pertinent (RDV liés au véhicule).
- **Dashboard QuickActions** (T111) : "+ RDV" qui était stubbé → activer.
- **Auto-création reminder de confirmation** (T115 Auto) : vérifier que le Reminder créé apparaît dans `/reminders`.

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

### 🔁 Cross-module backfill

- **Sidebar item "Fidélisation"** : remplacer `PageStub` par la vraie page.
- **Dashboard BFF (T110)** : si `LoyaltyTrend` était stubbé en attendant T120, le brancher pour de bon → mettre à jour `DashboardService`.
- **KPI dashboard "Clients à relancer"** : si comptait du Phase 4 simple (>180j sans contact), le remplacer par la définition exacte de "at-risk" du `LoyaltyMetricsService`.
- **T040 (CustomersListView)** : ajouter le filtre `status=at-risk` qui s'appuie désormais sur le service loyalty.
- **Fiche client** : ajouter un badge "À risque" / "Perdu" calculé côté serveur si applicable.

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

### 🔁 Cross-module backfill (gap **G4** identifié en Phase 7.1)

- **`VehiclesController.cs:88-92`** : retirer le 501 stub "*not yet available*", brancher l'upload sur `IFileStorage`. Mettre à jour le DTO `VehicleDto.PhotoUrl` pour exposer une URL résolue (`GET /api/files/{id}`).
- **`VehicleFormDialog`** : remplacer le bloc photo "rudimentaire" par `<ImageUploader>` (T131).
- **Fiche véhicule** : afficher la photo en header.
- **Onglet Settings → Organisation** (T141) : champ Logo doit utiliser `<ImageUploader>` (auparavant lui aussi stubbé).
- **Avatar utilisateur** (Topbar UserMenu, Settings préférences T144) : pareil.
- **Audit grep** : `rg -i "photo.*phase|file.*not yet|upload.*planned"` doit revenir vide.

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

### 🔁 Cross-module backfill

- **Sidebar item "Paramètres"** : remplacer `PageStub` par layout réel.
- **UserMenu Topbar** : items "Profil", "Paramètres", "Déconnexion" doivent tous fonctionner (les 2 premiers naviguaient peut-être vers stub).
- **T024 register-bootstrap** : la création auto d'org "Garage de X" doit exposer Slug/Logo modifiables ici.
- **T143 règles timeline** : si Phase 7 a hardcodé une liste de règles globale, exposer maintenant la table `OrganizationTimelineRule` (T070) pour les rendre éditables par org.
- **Audit grep** : `rg -i "settings.*phase|profil.*phase"` vide.

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

### T143 — Onglet Préférences d'entretien (ex-"Règles Timeline")
- **⚠️ Voir T7.5-I** : cette tâche est repositionnée. **Ne pas exposer la notion technique de "rule"** au garagiste.
- **Files** : `app/(app)/settings/maintenance-preferences/page.tsx`.
- **UI** : uniquement des switches en langage métier (rappel contrôle technique, opportunité de reprise, pneus saisonniers, délai de prévenance par défaut). Les programmes d'entretien constructeur ne sont **PAS** modifiables ici — ils se gèrent au cas par cas sur la fiche véhicule (T7.5-G).
- **Acceptance** : un garagiste ouvre la page → 4 switches compréhensibles, aucune mention de "rule", "code", "moteur".
- **Depends on** : T070, T7.5-I

### T144 — Onglet Préférences personnelles
- **UI** : Nom complet, email (verrouillé, "Demander un changement"), changer mot de passe (modale), avatar, notifications in-app.
- **Acceptance** : changement de mot de passe fonctionne avec ancien+nouveau.
- **Depends on** : T021

---

## PHASE 16 — Notifications in-app

### 🔁 Cross-module backfill

- **Topbar** : ajouter l'icône cloche (auparavant absente). Compteur réagit au polling/SignalR.
- **DispatchDueRemindersJob (T101)** : à chaque envoi (succès ou échec) → émettre une `UserNotification` pour les Owner/Admin de l'org.
- **AppointmentService** : émettre une notification 1h avant un RDV.
- **Liens deep** : chaque notification doit avoir un `targetUrl` (ex. `/reminders/{id}`) qui ouvre la bonne page.

### T150 — Centre de notifications
- **Files** : `Api/Modules/Notifications/NotificationsController.cs`, entité `UserNotification`, hub SignalR optionnel ou polling.
- **Front** : icône cloche dans Topbar avec badge, popover liste des notifications, marquer lu, lien vers entité concernée.
- **Évents émis** : rappel envoyé, rappel échoué, RDV à venir dans 1h, etc.
- **Acceptance** : badge se met à jour, clic marque comme lu.
- **Depends on** : T101

---

## PHASE 17 — Observabilité & santé

### 🔁 Cross-module backfill

- **Health check Hangfire** : nécessite que Phase 10 soit livrée avec workers actifs.
- **Health check email/SMS providers** : pinger les vrais providers Resend/Twilio via les options de Phase 9. Si NoOp en dev → renvoie healthy direct.
- **Compteurs Prometheus** : ajouter dans `MessageDispatchService` (Phase 9) et `DispatchDueRemindersJob` (Phase 10) — auparavant juste loggés.

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

### 🔁 Cross-module backfill

- **`docker-build-publish.ps1`** : retirer le TODO sur `$Registry` (vu en T005 placeholder) et fixer la valeur réelle du registry GitLab/GitHub.
- **`appsettings.Production.json`** : créer le fichier (auparavant absent), valeurs sensibles en variables d'environnement.
- **CORS** : passer la liste `Cors:AllowedOrigins` à la vraie URL prod du portal.
- **Migration auto** : vérifier `Database:RunMigrationsOnStartup = true` en prod, sinon doc dans RUNBOOK comment migrer manuellement.

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

### 🔁 Cross-module backfill — sweep final

C'est le moment de faire **un dernier audit complet** :

- **Run tous les grep de la "Règle anti-oubli"** une dernière fois — résultat attendu : 0 placeholder de phase.
- **Cliquer chaque CTA** de chaque page (script Playwright minimal "click everything") — chaque clic doit produire un effet (modale, navigation, toast légitime). Aucun `toast.info("disponible en…")` ne doit subsister.
- **Aucun composant `PageStub`** ne doit subsister dans l'arbre `app/(app)/*` — sauf une route délibérément future-only documentée dans `RUNBOOK.md`.
- **Aucun `@ts-ignore`/`as any`** introduit comme contournement temporaire ne doit subsister sans commentaire justificatif.
- **Tous les `// TODO(TXXX)`** doivent référencer une tâche encore ouverte ou être retirés.
- **Tous les endpoints API** doivent renvoyer du JSON (pas de 501 stub) — `rg "StatusCode\(\s*501"` revient vide.
- **Sidebar** : aucun item ne mène à une page vide.

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
8. **Squelette Timeline** : T070 → T072
9. **🚨 Catalogue & programmes constructeur (CŒUR PRODUIT)** dans cet ordre :
   1. T7.5-A (entités catalogue) + T7.5-M (estimation kilométrique) en parallèle
   2. T7.5-B (lien Vehicle ↔ catalogue) + T7.5-C (seed)
   3. T7.5-E (codes sur MaintenanceRecord)
   4. T7.5-D (refactor TimelineEngine) + T7.5-N (intégration estimation dans le rule)
   5. T7.5-F + T7.5-G (UI sélecteur + section programme + carte estimation)
   6. T7.5-I (renommer "Préférences d'entretien")
   - T7.5-H (onboarding wizard), T7.5-O (auto-refresh km), T7.5-K (templates par item), T7.5-L (widget dashboard) peuvent venir après Phase 8.
10. **Reminders intelligents** : T080 → T082 + backfill T7.5-J
11. **Messaging contextuel** : T090 → T093 + backfill T7.5-K (templates par item)
12. **Jobs Hangfire** : T100 → T101
13. **Dashboard intelligent** : T110 → T111 + T7.5-L (widget "charge mentale évitée")
14. **Onboarding wizard** : T7.5-H (si pas fait à l'étape 9)
15. **Rendez-vous** : T115 → T116
16. **Fidélisation** : T120 → T121
17. **Files** : T130 → T131
18. **Paramètres** : T140 → T144
19. **Notifications in-app** : T150
20. **Observabilité** : T160 → T161
21. **Infra déploiement** : T170 → T176
22. **Polish & QA** : T180 → T186

Chaque tâche doit être validée (build vert + manipulation manuelle) avant de passer à la suivante.

---

# ⚠️ Hors scope MVP (à ne PAS faire)

- Facturation / devis / factures.
- Comptabilité.
- Gestion stock pièces détachées avancée.
- Planning atelier multi-baies / gestion temps mécaniciens.
- Intégrations DMS tiers.
- App mobile native.
- IA prédictive sur les pannes (phase 3 future).
- **Édition libre de programmes constructeur depuis l'UI** : risque que le garagiste casse la donnée. À la place : `VehicleProgramOverride` au cas par cas (T7.5-A) si vraiment nécessaire.
- **Page de "configuration du moteur de timeline"** : la promesse produit interdit de demander au garagiste de configurer ce que le constructeur sait déjà.

# 🌱 Évolutions post-MVP du catalogue (Phase 2/3)

- **API publique constructeur** : remplacer le seed JSON par un connecteur quand c'est possible (peu probable que les constructeurs ouvrent ces données — explorer plutôt des partenariats données type Autodata, Haynes, TecAlliance).
- **Web scraping légal** des manuels constructeurs publics + ML pour extraire les programmes.
- **Crowdsourcing** : permettre aux garages contributeurs de soumettre des corrections sur le catalogue (validées par modération CarHorizontal). Les retours du terrain valent de l'or.
- **VIN decoding** : intégration NHTSA / DAT pour qu'un scan VIN remplisse la fiche véhicule + sélectionne le bon `VehicleModel` automatiquement.
- **Apprentissage par usage** : si 100 garages enregistrent un entretien "filtre carburant" à 65 000 km en moyenne sur le même modèle alors que le programme dit 60 000, signaler l'écart au curateur du catalogue.
