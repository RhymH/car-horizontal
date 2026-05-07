# Monorepo

- les applications sont dans un dossier apps/
- le déploiement se base sur les méthodes de cette application example : E:\Git\Aries\QSE
  - caddy
  - ubuntu
  - graphana
  - loki
  - prometheus
  - watchtower
- script de build et publish docker pour le projet entier comme : E:\Git\Aries\QSE
- script de start dev env pour le projet entier comme : E:\Git\Aries\QSE

# API

- .NET
- EntityFramework (génération de migration avec la CLI exclusivement ! et modification ensuite)
  - Entities avec des bases communes "EntityBase" "OrganisationEntityBase" avec Id[key:guid] OrganisationId CreatedAt UpdatedAt DeletedAt CreatedBy etc...
- Design DDD pour les services, on rassemble les fichiers pour un même "module" ensemble, plutot que de séparer par notion technique "controllers/services/dtos"
- BFF Backend for Front end pour éviter les aller retour avec le front pour charger une seule page
- Regrouper les DTO par Controller pour eviter l'explosion des DTO
  - Simplicité de nomage ex : GetProductsByUserRequestDTO et GetProductsByUserResponseDTO
- Auth
- Multitenant, un utilisateur peut avoir plusieurs organisations et l'application gère une séparation pour ne pas mélanger les données de plusieurs orgs lors de l'affichage et édition

# Auth

- L'API est en charge de l'authentification et gère tout à l'aide des librairies identity de microsoft (JWT, pasword hash et salt, rehashing etc...) on gère proprement l'auth avec des refresh tokens

# Front

- Next.js hosté sur docker
- création de composant réutilisables pour que l'UI reste cohérente
- ShadCN comme base pour les composants
- Tout action imporrtante donne lieux à une modale
- Respect des guidelines de Tailwind pour une UI efficace
- Formulaires avec ReactHookForms et validation avec Zod
- graphiques simple avec chartJS et complexes time series avec Echarts
- use sonner to confirm all actions and warn of failures with notifications

# Database

- postgreSQL
- Stockage des images et fichiers en base sql pour une itération rapide avec tables "dossier/metadata/fichiers" près à être swap avec un R2 cloudflare dans le futur
- evolution possible vers timescaleDB si besoin
