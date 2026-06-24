# Calendary

Calendary est un serveur personnel de calendrier, de gestion du temps, de taches et de projets.

Le projet part d'un besoin volontairement ambitieux : construire un outil personnel flexible, avec un backend Kotlin/Spring serieux, une API documentee, une base PostgreSQL migree proprement, et un frontend React SSR sans Next.js.

## Objectif Produit

Calendary doit permettre au super admin de :

- gerer son calendrier personnel et professionnel ;
- creer des evenements, taches, projets, epics et sous-taches ;
- inviter des collaborateurs par email ;
- partager certaines ressources en lecture seule ou en ecriture ;
- exposer un calendrier public avec disponibilites ;
- recevoir des demandes de rendez-vous depuis la page publique ;
- utiliser des notifications in-app temps reel via WebSocket et des emails ;
- documenter les taches, projets et evenements avec Markdown et fichiers joints.

Les collaborateurs disposent aussi de leur propre workspace. Toute collaboration croisee doit etre confirmee avant d'apparaitre dans les feeds des deux parties.

## Stack Cible

Backend :

- Kotlin ;
- Spring Boot ;
- Spring Web MVC ;
- Spring Security ;
- Spring WebSocket ;
- Spring Mail ;
- PostgreSQL ;
- Hibernate/JPA via Spring Data JPA ;
- Flyway ;
- Backblaze B2 pour les fichiers joints ;
- springdoc-openapi / Swagger ;
- JUnit 5 ;
- Testcontainers.

Frontend cible :

- Bun ;
- TypeScript ;
- React ;
- SSR sans Next.js ;
- Vite ;
- TanStack Router ;
- TanStack Query ;
- Tailwind CSS ;
- shadcn/ui ;
- lucide-react ;
- Zod ;
- react-hook-form.

## Documentation

La specification produit et technique se trouve dans [docs/product-spec.md](docs/product-spec.md).

Elle detaille :

- les roles et permissions ;
- les workspaces ;
- le calendrier public/prive ;
- les taches, projets, epics et evenements ;
- les notifications WebSocket/email ;
- le modele de donnees cible ;
- les jalons de developpement ;
- la direction frontend et les themes.

## Themes UI

Calendary prevoit 6 themes utilisateurs :

- `solar-orange` : light par defaut, accent orange ;
- `paper-green` : light avec accent vert ;
- `clear-blue` : light avec accent bleu ;
- `ember-dark` : dark avec accent orange ;
- `graphite-cyan` : dark avec accent cyan ;
- `plum-night` : dark avec accent violet controle.

Le theming doit etre base sur des variables CSS compatibles Tailwind/shadcn et inclure des tokens metier pour les evenements, taches, projets, disponibilites, occupations et statuts.

## Lancement Backend

Le backend a besoin de PostgreSQL en local.

Demarrer PostgreSQL :

```bash
docker compose up -d postgres
```

Puis lancer Spring Boot :

```bash
./gradlew bootRun
```

Si un ancien service Compose tourne sans PostgreSQL, ou si tu avais lance l'ancien conteneur Postgres 18 de dev avec un volume incompatible, nettoyer une fois le projet Compose :

```bash
docker compose down --remove-orphans
docker compose up -d postgres
```

L'API est ensuite disponible sur `http://localhost:8080`.

Swagger/OpenAPI :

```text
http://localhost:8080/swagger-ui/index.html
http://localhost:8080/v3/api-docs
```

Stockage fichiers joints :

Par defaut, `CALENDARY_B2_ENABLED=false`, ce qui permet de lancer les tests et le backend local sans credentials cloud. Pour utiliser Backblaze B2 :

```bash
export CALENDARY_B2_ENABLED=true
export CALENDARY_B2_KEY_ID=...
export CALENDARY_B2_APPLICATION_KEY=...
export CALENDARY_B2_BUCKET_ID=...
export CALENDARY_B2_BUCKET_NAME=...
```

Google Meet pour les bookings :

Par defaut, `CALENDARY_GOOGLE_CALENDAR_ENABLED=false`. Dans ce mode, accepter un booking cree seulement l'evenement local Calendary. Pour creer aussi une reunion Google Meet via Google Calendar API :

```bash
export CALENDARY_GOOGLE_CALENDAR_ENABLED=true
export CALENDARY_GOOGLE_CALENDAR_ID=primary
export CALENDARY_GOOGLE_SERVICE_ACCOUNT_EMAIL=...
export CALENDARY_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n'
```

Le calendrier cible doit etre accessible au service account, par exemple en partageant le calendrier Google avec l'email du service account.

Les tests peuvent etre lances avec :

```bash
./gradlew test
```

## Lancement Frontend

Le frontend est dans `frontend/` et utilise Bun, React SSR, Vite, TanStack Router, TanStack Query, Tailwind et des composants UI compatibles shadcn.

Installer les dependances :

```bash
cd frontend
bun install
```

Lancer le serveur SSR de developpement :

```bash
bun run dev
```

L'interface est disponible sur :

```text
http://localhost:5173/p/doni/calendar
```

Le flow normal commence par les pages publiques. Utiliser `Login` dans le header public pour acceder a l'application authentifiee.

Le bootstrap du premier super admin est volontairement separe sur `/bootstrap` et demande une confirmation explicite. Ne l'utiliser que pour initialiser un serveur sans compte proprietaire.

Par defaut, le frontend ouvre le slug public `doni`. Le super admin peut ensuite changer le slug public et le fuseau par defaut depuis `Settings > Workspace setup`. Pour changer le slug public par defaut en dev avant que le backend soit seed :

```bash
export VITE_CALENDARY_PUBLIC_SLUG=<public-slug>
bun run dev
```

Le frontend peut aussi tourner avec des donnees mock pour permettre le travail UI sans seed backend. Une fois connecte, le workspace actif vient de la session. Pour forcer un workspace en dev sans session, renseigner l'id du workspace :

```bash
export VITE_CALENDARY_WORKSPACE_ID=<workspace-uuid>
bun run dev
```

Le proxy Vite envoie `/api`, `/public` et `/ws` vers le backend local `http://localhost:8080`.

Verifier le frontend :

```bash
bun run typecheck
bun run build
```

## Roadmap Initiale

1. Nettoyer les dependances Gradle et garder la stack backend utile.
2. Ajouter PostgreSQL, JPA, Flyway et OpenAPI.
3. Implementer users, workspaces, invitations et auth email/password.
4. Ajouter les notifications WebSocket/email.
5. Construire le coeur calendrier, taches et visibilite publique.
6. Ajouter projets, epics, partage, collaboration et fichiers joints.
7. Mettre en place le frontend Bun + React SSR + TanStack Router.
