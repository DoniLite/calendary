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

Le projet est encore au stade de cadrage initial. Le backend Spring Boot peut etre lance avec :

```bash
./gradlew bootRun
```

Les tests peuvent etre lances avec :

```bash
./gradlew test
```

## Roadmap Initiale

1. Nettoyer les dependances Gradle et garder la stack backend utile.
2. Ajouter PostgreSQL, JPA, Flyway et OpenAPI.
3. Implementer users, workspaces, invitations et auth email/password.
4. Ajouter les notifications WebSocket/email.
5. Construire le coeur calendrier, taches et visibilite publique.
6. Ajouter projets, epics, partage, collaboration et fichiers joints.
7. Mettre en place le frontend Bun + React SSR + TanStack Router.
