# CarHorizontal — Guide pour les sessions IA

> **CarHorizontal (CH)** : SaaS multitenant pour les garages automobiles —
> CRM clients, fiches véhicules, historique d'entretien, rappels SMS/email,
> rendez-vous. Cible MVP : garages francophones.

Lis ce fichier en premier. Il documente l'architecture, les commandes, les
conventions, et tout ce qu'un nouveau dev (humain ou IA) doit savoir avant
de toucher au code. La feuille de route détaillée est dans `Tasks.md`.

---

## 📁 Layout du monorepo

```
CarHorizontal/
├── apps/
│   ├── api/                              # Backend ASP.NET Core 10
│   │   ├── CarHorizontal.Api/            # Endpoints, DI, Hangfire
│   │   ├── CarHorizontal.Domain/         # Entités, value objects, interfaces
│   │   ├── CarHorizontal.Infrastructure/ # DbContext, EF Migrations, providers
│   │   ├── CarHorizontal.Api.slnx
│   │   └── docker-compose.yml            # Postgres local
│   └── portal/                           # Frontend Next.js 16 + ShadCN + Tailwind v4
├── infrastructure/                       # Déploiement (caddy, grafana, loki, …)
├── start-dev.ps1                         # Up Postgres + API + portal en consoles
├── docker-build-publish.ps1              # Build/push des images Docker
├── Tasks.md                              # Plan d'implémentation (T001 → ...)
├── ProductDetails.md                     # Vision produit
├── TechStack.md                          # Stack synthétique
└── CLAUDE.md                             # ce fichier
```

---

## 🚀 Commandes dev essentielles

### Démarrage complet (Postgres + API + portal)

```powershell
./start-dev.ps1
```

Postgres : `localhost:5432` / `db_carhorizontal` / `chdbuser` / `ch_local_dev`
API : http://localhost:5080 (Swagger sur `/swagger`, Hangfire sur `/hangfire`)
Portal : http://localhost:3000

### API uniquement

```powershell
docker-compose -f apps/api/docker-compose.yml up -d
cd apps/api
dotnet build
dotnet run --project CarHorizontal.Api
```

### Migrations EF Core (CLI uniquement, jamais d'édition manuelle)

```powershell
cd apps/api
dotnet ef migrations add <NomDeLaMigration> -p CarHorizontal.Infrastructure -s CarHorizontal.Api
dotnet ef database update                   -p CarHorizontal.Infrastructure -s CarHorizontal.Api
```

### Portal uniquement

```powershell
cd apps/portal
npm install
npm run dev      # :3000
npm run build
```

### Docker images

```powershell
./docker-build-publish.ps1 -Service api -Action build
./docker-build-publish.ps1 -Tag v0.1.0
```

---

## 🏗️ Architecture API (ASP.NET Core 10, DDD modulaire)

### Trois projets

| Projet                          | Rôle                                                          |
|---------------------------------|---------------------------------------------------------------|
| `CarHorizontal.Domain`          | Entités, value objects, interfaces. Pas de référence externe. |
| `CarHorizontal.Infrastructure`  | `AppDbContext`, EF Configurations, Migrations, providers.     |
| `CarHorizontal.Api`             | Endpoints HTTP, DI, Hangfire, modules fonctionnels.           |

Chaîne de dépendances : `Domain ← Infrastructure ← Api`.

### Modules fonctionnels (un dossier = un module)

Tout le code d'une feature est colocalisé dans
`CarHorizontal.Api/Modules/<Nom>/` : controller, service, DTOs, validators
(FluentValidation), mapper. **Pas de découpage par couche technique** type
`Controllers/` `Services/` `Dtos/`.

### Conventions DTO

- Un DTO par couple (action, sens) : `<Action>RequestDto.cs`,
  `<Action>ResponseDto.cs`. Exemple : `CreateCustomerRequestDto`,
  `CreateCustomerResponseDto`.
- DTO regroupés sous `Modules/<Module>/Dtos/`. Évite l'explosion de
  fichiers communs partagés entre modules.

### Bases d'entités (Domain/Common/)

```csharp
EntityBase {
    Guid Id, DateTime CreatedAt, DateTime UpdatedAt,
    DateTime? DeletedAt, Guid CreatedBy, Guid? UpdatedBy
}
OrganizationEntityBase : EntityBase { Guid OrganizationId }
```

Toute entité métier doit hériter d'`OrganizationEntityBase`.

### DbContext unique : `AppDbContext`

- Hérite `IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>`.
- Configurations EF par entité dans
  `Infrastructure/Persistence/Configurations/<Entity>Configuration.cs`.
- Filtre global multitenant : `HasQueryFilter(e => e.DeletedAt == null && e.OrganizationId == currentOrgId)` injecté via `ICurrentUserService`.
- Audit + soft delete via interceptors (`AuditInterceptor`, `SoftDeleteInterceptor`).
- Soft delete = `DeletedAt` non null. Aucun `DELETE` SQL en code applicatif.

### Auth & multitenant

- ASP.NET Identity (PasswordHasher, lockout, JWT).
- JWT claims : `sub` (userId), `email`, `org_id`, `role`, `jti`.
  Access 15 min, refresh tokens hashés en base avec rotation.
- Un utilisateur peut appartenir à plusieurs `Organization` (table de
  liaison `UserOrganization` avec rôle Owner/Admin/Mechanic/Viewer).
- `org_id` actif vit dans le JWT ; `/auth/switch-org` ré-émet un access
  token avec un autre `org_id`.
- Middleware `CurrentOrganizationMiddleware` valide l'appartenance et
  expose `ICurrentUserService` (ne fait jamais confiance aveuglément
  au claim).

### BFF endpoints

`Dashboard`, `CustomerOverview`, `VehicleDetail` agrègent toutes les
données d'une page en un seul appel — évite les chaînes de requêtes
côté front.

### Jobs

Hangfire + `Hangfire.PostgreSql`. Dashboard sur `/hangfire` (auth requise).
Workers : envoi de SMS/emails, génération de rappels depuis les règles,
purges.

### Sondes de santé

`Modules/Health` — anonymes, sans effet de bord, consommées par l'écran de
diagnostic du portail (et utilisables par un load balancer) :

| Route               | Rôle                                                        |
|---------------------|-------------------------------------------------------------|
| `GET /api/health`       | Liveness. Aucune dépendance touchée, toujours 200.      |
| `GET /api/health/ready` | Readiness. Teste la base (3 s max) ; 503 si injoignable. |

---

## 🎨 Architecture portal (Next.js 16, App Router)

- Server Components par défaut. `"use client"` seulement quand nécessaire
  (hooks, événements, état local).
- ShadCN comme socle de composants (`components/ui/`). Style "New York",
  base color "neutral", Tailwind v4.
- **Toute action importante = modale** : création, édition, suppression
  (alert-dialog), envoi de message.
- Formulaires : ReactHookForm + Zod. Schémas dans `lib/schemas/<entity>.ts`.
- Notifications : `sonner` (toast vert succès, toast rouge erreur,
  toast info en cours).
- Tables : `<DataTable>` générique basé sur `@tanstack/react-table` + shadcn.
- Drawer (sheet) pour lecture détaillée, modale (dialog) pour édition.
- **Sélecteurs / onglets / filtres segmentés : toujours `components/ui/tabs.tsx`.**
  Jamais de `<button>` maison stylé en onglet. Deux tailles seulement :
  `<TabsList>` (défaut) pour la navigation principale d'une page ou d'une
  section, `<TabsList size="sm">` pour les filtres secondaires (barres de
  filtres, dialogs). Compteurs via `<TabsBadge>`, pas de `(12)` dans le label.
  Pas de `className` d'espacement sur `<Tabs>` : la racine gère déjà le `gap`.
- Skeletons pendant chargement, EmptyState avec CTA quand collection vide.
- API client : un module par feature dans `lib/api/<entity>.ts`,
  TanStack Query pour le cache.
- Auth : tokens en cookies httpOnly via Route Handlers Next, refresh
  transparent à 401 via intercepteur axios (un seul retry).
- i18n : démarrage **français uniquement**. Préparer la clé `next-intl`
  mais pas de bascule de langue MVP.
- Graphiques : Chart.js pour le simple, ECharts pour les time series
  complexes.
- **Panne réseau = écran de diagnostic**, jamais une erreur muette.
  `lib/diagnostics/connectivity.ts` sonde, dans l'ordre, l'accès internet de
  l'utilisateur (site externe en `no-cors`), le serveur Next
  (`/api/diagnostics`) et l'API (depuis le navigateur *et* depuis le serveur
  Next), puis conclut de quel côté est le problème. `lib/diagnostics/outage.ts`
  décide de l'ouverture : deux échecs réseau consécutifs signalés par
  l'intercepteur axios, ou un évènement `offline`. Points d'entrée :
  `<ConnectionOutageOverlay>` (monté dans les providers), `app/error.tsx`,
  `app/global-error.tsx` et la page publique `/diagnostic`.

> ⚠️ Next.js 16 : conventions, APIs et structure peuvent différer des
> connaissances de ton entraînement. Avant d'écrire du Next, consulte
> `apps/portal/node_modules/next/dist/docs/` quand un doute existe.

---

## 🔐 Variables d'environnement

### API (`apps/api/CarHorizontal.Api/appsettings.*.json` ou env)

| Clé                                      | Description                                       |
|------------------------------------------|---------------------------------------------------|
| `ConnectionStrings:Default`              | Postgres (Host, Port, Database, Username, Password) |
| `Jwt:Issuer`                             | Issuer JWT                                        |
| `Jwt:Audience`                           | Audience JWT                                      |
| `Jwt:Key`                                | Clé de signature (≥ 32 chars en prod)             |
| `Jwt:AccessMinutes`                      | Durée access token (def. 15)                      |
| `Jwt:RefreshDays`                        | Durée refresh token (def. 14)                     |
| `Cors:AllowedOrigins`                    | Tableau d'origins autorisés (portal)              |
| `Hangfire:DashboardEnabled`              | Bool                                              |
| `Database:RunMigrationsOnStartup`        | Bool — exécute `MigrateAsync` au boot             |
| `Messaging:Sms:Provider`                 | Nom du provider SMS                               |
| `Messaging:Email:Provider`               | Nom du provider Email                             |

### Portal (`apps/portal/.env.local`)

| Clé                                | Description                                    |
|------------------------------------|------------------------------------------------|
| `NEXT_PUBLIC_API_URL`              | URL absolue de l'API (`http://localhost:5080`) |
| `NEXT_PUBLIC_CONNECTIVITY_PROBES`  | Optionnel. URLs externes (séparées par des virgules) utilisées par l'écran de diagnostic pour tester l'accès internet. Défaut : gstatic / cloudflare / bing. |

---

## 🧱 Conventions de code transverses

- **Pas de migration EF éditée à la main** — uniquement `dotnet ef migrations add` puis revue du fichier généré.
- **Pas de `DELETE` SQL** — soft delete via `DeletedAt`.
- **Filtres multitenant** sont la responsabilité du DbContext, pas du
  caller. Un service métier ne filtre jamais sur `OrganizationId`
  manuellement (sauf cross-tenant explicite).
- **JWT claim `org_id` ≠ vérité absolue** : toujours valider via
  `ICurrentUserService` que l'user est bien membre de l'org.
- **DTO ≠ entité** : aucune entité Domain n'est sérialisée vers le client.
- **PowerShell scripts en racine** : tout flow dev/CI doit être
  reproductible via les scripts de la racine, pas via des commandes
  ad-hoc.
- **Logs Serilog** : enrichers `FromLogContext`, `WithMachineName`,
  `WithEnvironmentName`. Console + fichier `logs/api-.log` rotatif.
- **Erreurs API** : `application/problem+json` (RFC 7807) via
  `ExceptionHandlingMiddleware`.

---

## 📚 Pour aller plus loin

- `Tasks.md` — plan complet, tâche par tâche, avec critères d'acceptation.
- `ProductDetails.md` — fonctionnalités produit, parcours utilisateur.
- `TechStack.md` — synthèse technique.
- `apps/api/README.md` — commandes API détaillées.
