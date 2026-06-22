# Calendary - Product & Technical Spec

## 1. Vision

Calendary est un serveur personnel de gestion du temps, des rendez-vous, des taches et des projets.

Le proprietaire du serveur est le super admin. Il gere son calendrier, ses disponibilites publiques, ses projets, ses taches, ses collaborateurs et les espaces partages. Le produit doit rester assez flexible pour couvrir plusieurs usages :

- calendrier personnel et professionnel ;
- demandes de rendez-vous depuis une page publique ;
- gestion de taches simples, orphelines ou rattachees a des projets ;
- gestion de projets avec epics, taches et sous-taches ;
- partage controle avec des collaborateurs ;
- collaboration soumise a confirmation ;
- notifications in-app temps reel et email ;
- pages detaillees avec description Markdown et fichiers joints.

Le projet doit aussi servir de terrain d'apprentissage Kotlin serieux : code organise par feature, tests des comportements, schema SQL controle par migrations, API documentee et architecture maintenable.

## 2. Roles Et Acces

### Super Admin

Le super admin est le proprietaire du serveur.

Il peut :

- gerer son propre workspace ;
- inviter des collaborateurs ;
- choisir les projets, taches et evenements visibles par collaborateur ;
- choisir le niveau d'acces des collaborateurs : lecture seule ou ecriture ;
- accepter ou refuser toute collaboration proposee par un collaborateur ;
- publier certaines informations sur le calendrier public ;
- recevoir et traiter les demandes de rendez-vous publiques.

### Collaborateur

Un collaborateur est invite par email par le super admin.

Il possede :

- un compte avec email et mot de passe ;
- une obligation de changement de mot de passe a la premiere connexion ;
- son propre workspace prive ;
- un acces eventuel au workspace partage par le super admin.

Un collaborateur peut :

- creer ses propres evenements, taches et projets ;
- consulter les ressources que le super admin lui partage ;
- modifier les ressources partagees seulement si son niveau d'acces le permet ;
- proposer une collaboration sur une tache, un projet ou un evenement ;
- voir la collaboration apparaitre dans les deux feeds seulement apres acceptation.

### Visiteur Public

Un visiteur public n'a pas de compte.

Il peut :

- consulter le calendrier public du super admin ;
- voir les plages libres ;
- voir qu'une plage est occupee ;
- voir le detail public d'une occupation seulement si l'element qui occupe la plage est marque public ;
- demander un rendez-vous sur une plage libre.

## 3. Workspaces

Chaque utilisateur possede un workspace personnel.

Le super admin peut exposer une partie de son workspace a un collaborateur. Pour ce collaborateur, l'interface contient donc deux espaces :

- son workspace personnel ;
- le workspace partage par le super admin.

Les ressources partagees doivent rester rattachees a leur proprietaire d'origine. Un collaborateur ne devient pas proprietaire d'une ressource du super admin, meme s'il a un droit d'ecriture.

## 4. Domaine Fonctionnel

### Calendrier

Le calendrier affiche :

- les evenements ;
- les blocs de travail lies aux taches ;
- les blocs de travail lies aux projets ou epics ;
- les indisponibilites ;
- les demandes de rendez-vous en attente, acceptees ou refusees.

Une occupation peut etre privee ou publique.

Sur la page publique :

- une plage libre est explicitement visible comme disponible ;
- une plage occupee par un element prive affiche seulement un indicateur "occupe" ;
- une plage occupee par un element public peut afficher son titre, son type et son lien public.

### Evenements

Un evenement represente un rendez-vous, une reunion, un bloc horaire ou un engagement date.

Champs principaux :

- titre ;
- description Markdown ;
- debut et fin ;
- timezone ;
- statut ;
- visibilite publique ;
- participants ;
- fichiers joints ;
- workspace proprietaire ;
- createur ;
- audit timestamps.

### Taches

Une tache peut etre :

- orpheline ;
- rattachee a un projet ;
- rattachee a une epic ;
- rattachee a une tache parente.

Elle peut aussi avoir un ou plusieurs blocs calendaires pour representer le temps reserve a son execution.

Champs principaux :

- titre ;
- description Markdown ;
- statut Kanban ;
- priorite ;
- echeance ;
- estimation ;
- temps planifie ;
- visibilite publique ;
- assignees ;
- fichiers joints ;
- relations parent/enfant ;
- workspace proprietaire ;
- createur ;
- audit timestamps.

Statuts de base :

- backlog ;
- todo ;
- in_progress ;
- review ;
- done ;
- archived.

### Projets Et Epics

Un projet regroupe des epics, des taches et des sous-taches.

Une epic represente un lot fonctionnel ou un objectif intermediaire dans un projet.

Chaque projet et chaque epic possede sa propre page detaillee :

- description Markdown ;
- progression ;
- taches associees ;
- calendrier associe ;
- fichiers joints ;
- collaborateurs ;
- visibilite publique optionnelle.

### Collaboration

Toute collaboration croisee doit etre confirmee.

Exemple :

1. Un collaborateur cree une tache dans son workspace.
2. Il propose de la partager avec le super admin.
3. La proposition reste en attente.
4. Le super admin accepte ou refuse.
5. Apres acceptation, la tache apparait dans les deux feeds selon les permissions definies.

Ce principe s'applique aux taches, projets et evenements.

### Fichiers Joints

Les taches, projets, epics et evenements peuvent avoir des fichiers joints.

Types initiaux acceptes :

- PDF ;
- images.

Le stockage cible est Backblaze B2. En developpement et en test, le backend peut fonctionner sans credentials B2 via une implementation noop activee par defaut, mais l'interface applicative reste cloud-first.

Chaque fichier doit stocker :

- nom original ;
- type MIME ;
- taille ;
- proprietaire ;
- ressource rattachee ;
- cle de stockage B2 ;
- checksum optionnel ;
- date d'ajout.

## 5. Authentification Et Invitations

L'authentification est email-first :

- pas de username ;
- email unique ;
- mot de passe hash avec BCrypt ou Argon2 ;
- session ou JWT a choisir au moment de l'implementation API/frontend ;
- invitation par email ;
- token d'invitation a duree limitee ;
- obligation de changement de mot de passe a la premiere connexion.

Etats utilisateur :

- invited ;
- active ;
- password_change_required ;
- disabled.

Le premier compte super admin doit etre cree par bootstrap controle :

- soit via configuration locale au premier lancement ;
- soit via commande d'administration ;
- soit via migration seed limitee a l'environnement dev.

## 6. Permissions

Les permissions doivent etre explicites et testees.

Niveaux de partage initiaux :

- none ;
- read ;
- write ;
- owner.

Regles de base :

- le proprietaire garde toujours l'acces owner ;
- un collaborateur ne voit rien sans partage explicite ;
- un partage projet peut donner acces aux epics et taches du projet selon une strategie definie ;
- une tache peut etre partagee individuellement ;
- une ressource publique est visible par les visiteurs seulement via les endpoints publics ;
- les endpoints authentifies ne doivent jamais se baser sur la visibilite publique pour accorder des droits d'ecriture.

## 7. Backend

### Stack Proposee

- Kotlin ;
- Spring Boot ;
- Spring Web MVC pour l'API REST ;
- Spring Security ;
- Spring WebSocket pour les notifications in-app ;
- Spring Mail pour les notifications email ;
- PostgreSQL ;
- Hibernate/JPA via Spring Data JPA ;
- Flyway pour les migrations SQL ;
- springdoc-openapi pour Swagger/OpenAPI ;
- JUnit 5 ;
- Testcontainers PostgreSQL ;
- MockMvc ou WebTestClient selon le choix final de couche web ;
- Kotest ou AssertJ optionnel pour des assertions plus lisibles.

Le `build.gradle.kts` actuel contient beaucoup de starters generes par defaut. Avant implementation, il faudra le simplifier pour garder seulement ce qui sert vraiment au produit. Le choix initial recommande est REST documente OpenAPI, pas GraphQL, afin de garder un apprentissage backend clair et testable.

### Organisation Par Feature

Structure cible :

```text
src/main/kotlin/com/calendary
  auth/
  users/
  workspaces/
  calendar/
  events/
  tasks/
  projects/
  sharing/
  booking/
  notifications/
  attachments/
  common/
```

Chaque feature peut contenir :

```text
api/
application/
domain/
infra/
```

Exemple :

```text
tasks/
  api/TaskController.kt
  api/dto/
  application/TaskService.kt
  domain/Task.kt
  domain/TaskStatus.kt
  infra/TaskRepository.kt
```

### Principes Backend

- Les controllers restent fins.
- Les services portent les cas d'usage.
- Les entities representent le modele persiste.
- Les DTO evitent d'exposer les entities directement.
- Les permissions sont verifiees dans les cas d'usage, pas seulement dans les controllers.
- Les migrations SQL sont versionnees et relues.
- Les tests d'integration valident les migrations, repositories et endpoints critiques.

### Notifications

Le systeme de notification est double :

- in-app via WebSocket ;
- email via la configuration email personnelle du super admin.

Les notifications in-app servent aux evenements temps reel :

- invitation collaborateur ;
- demande de rendez-vous publique ;
- acceptation ou refus de rendez-vous ;
- demande de collaboration ;
- acceptation ou refus de collaboration ;
- partage de projet, tache ou evenement ;
- modification importante d'une ressource partagee.

Les notifications email servent aux communications externes ou importantes :

- invitation d'un collaborateur ;
- lien de premiere connexion ;
- demande de rendez-vous recue ;
- confirmation/refus de rendez-vous ;
- demande de collaboration ;
- rappel important optionnel.

La configuration email initiale part sur un compte personnel :

```properties
app.mail.from=
app.mail.reply-to=
spring.mail.host=
spring.mail.port=
spring.mail.username=
spring.mail.password=
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
```

Les secrets ne doivent pas etre commits. Ils doivent venir de variables d'environnement ou d'un fichier local ignore.

Le backend doit separer :

- la creation d'une notification persistante ;
- sa diffusion WebSocket ;
- son envoi email ;
- le marquage lu/non lu.

Endpoints indicatifs :

```text
GET    /api/notifications
PATCH  /api/notifications/{id}/read
PATCH  /api/notifications/read-all
WS     /ws/notifications
```

### API REST Initiale

Endpoints indicatifs :

```text
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/change-password
POST   /api/invitations
POST   /api/invitations/{token}/accept

GET    /api/me
GET    /api/workspaces

GET    /api/calendar
POST   /api/events
GET    /api/events/{id}
PATCH  /api/events/{id}
DELETE /api/events/{id}

POST   /api/tasks
GET    /api/tasks/{id}
PATCH  /api/tasks/{id}
DELETE /api/tasks/{id}

POST   /api/projects
GET    /api/projects/{id}
PATCH  /api/projects/{id}
DELETE /api/projects/{id}

POST   /api/projects/{id}/epics
POST   /api/shares
PATCH  /api/shares/{id}

POST   /api/collaboration-requests
PATCH  /api/collaboration-requests/{id}/accept
PATCH  /api/collaboration-requests/{id}/reject

GET    /api/notifications
PATCH  /api/notifications/{id}/read
PATCH  /api/notifications/read-all

POST   /api/attachments
GET    /api/attachments/{id}
DELETE /api/attachments/{id}

GET    /public/calendar
GET    /public/resources/{publicId}
POST   /public/booking-requests
```

## 8. Modele De Donnees Initial

Tables candidates :

- users ;
- workspaces ;
- workspace_memberships ;
- invitations ;
- projects ;
- epics ;
- tasks ;
- task_dependencies ;
- events ;
- calendar_blocks ;
- shares ;
- collaboration_requests ;
- booking_requests ;
- notifications ;
- notification_deliveries ;
- attachments ;
- resource_visibility ;
- mail_settings optionnel ;
- audit_log optionnel.

Notes :

- Les ids peuvent etre des UUID.
- Les timestamps doivent etre stockes en UTC.
- Les zones horaires utilisateur doivent etre stockees separement.
- Les contraintes SQL doivent proteger les invariants importants : unicite email, proprietaire workspace, dates coherentes, statuts valides.

## 9. Tests

Approche test-driven pragmatique :

1. Ecrire le test du comportement attendu.
2. Implementer le minimum.
3. Refactorer vers la structure feature.
4. Ajouter les cas limites si la regle est sensible.

Priorites de tests :

- auth et changement de mot de passe obligatoire ;
- invitation collaborateur ;
- isolation des workspaces ;
- partage read/write ;
- acceptation/refus des collaborations ;
- calendrier public avec distinction libre/occupe/public/prive ;
- creation de taches orphelines, projets, epics et sous-taches ;
- notifications persistantes, WebSocket et email ;
- migrations PostgreSQL via Testcontainers.

## 10. Documentation API

Swagger/OpenAPI doit etre disponible en dev.

Objectifs :

- endpoints groupes par feature ;
- schemas DTO clairs ;
- exemples de payload ;
- codes d'erreur documentes ;
- auth documentee ;
- endpoints publics separes des endpoints authentifies.

## 11. Frontend

### Stack Proposee

- Bun ;
- TypeScript ;
- React ;
- SSR sans Next.js ;
- Vite ;
- TanStack Router avec SSR ;
- TanStack Query pour les appels API et cache client ;
- Tailwind CSS ;
- shadcn/ui ;
- lucide-react ;
- Zod pour validation des formulaires et contrats frontend ;
- react-hook-form pour formulaires.

Le frontend peut vivre dans un dossier `frontend/` separe du backend Gradle.

Structure cible :

```text
frontend/
  app/
    routes/
    components/
    features/
      calendar/
      events/
      tasks/
      projects/
      notifications/
      collaborators/
    lib/
    styles/
  public/
  package.json
  bun.lock
```

### Experience UI

L'ecran principal doit etre l'application, pas une landing page.

Vues initiales :

- calendrier ;
- timeline ;
- kanban de taches ;
- projets ;
- taches ;
- evenements ;
- demandes de rendez-vous ;
- notifications ;
- collaborateurs ;
- parametres ;
- selection de theme.

Le calendrier doit permettre de distinguer rapidement :

- temps libre ;
- temps occupe prive ;
- temps occupe public ;
- evenement ;
- tache planifiee ;
- demande de rendez-vous.

### Representations Metier

Le frontend doit proposer plusieurs representations du meme domaine, pas seulement des listes CRUD.

Calendrier :

- vue jour ;
- vue semaine ;
- vue mois ;
- vue agenda ;
- distinction visuelle claire entre evenement, tache planifiee, projet, disponibilite et demande de rendez-vous ;
- edition rapide depuis un panneau lateral ;
- navigation fluide entre date courante, periode suivante et periode precedente.

Timeline :

- affichage chronologique des evenements, taches planifiees et activites de projet ;
- regroupement par jour ou semaine ;
- indicateurs de statut, priorite, visibilite et collaboration ;
- utile pour relire ce qui arrive ou ce qui vient de se passer.

Taches :

- vue Kanban ;
- vue liste dense ;
- vue detail par tache ;
- filtres par statut, priorite, echeance, projet, assignee, visibilite et workspace ;
- support des taches orphelines, sous-taches et taches rattachees a une epic ;
- panneau de planification permettant d'ajouter un bloc dans le calendrier.

Projets :

- vue liste ou grille sobre ;
- page detail projet ;
- sections epics, taches, calendrier, fichiers, collaborateurs ;
- progression visible sans imposer une metrique unique ;
- navigation rapide vers les taches et epics associees.

Evenements :

- page detail evenement ;
- participants ;
- description Markdown ;
- fichiers joints ;
- visibilite publique ;
- statut de collaboration si l'evenement est partage.

Notifications :

- centre de notifications in-app ;
- badge non lu ;
- flux temps reel via WebSocket ;
- actions rapides : accepter/refuser, marquer comme lu, ouvrir la ressource.

### Themes

Preparer 6 themes :

Light :

- `solar-orange` : theme par defaut, base claire avec accent orange ;
- `paper-green` : theme clair calme avec accent vert ;
- `clear-blue` : theme clair neutre avec accent bleu.

Dark :

- `ember-dark` : theme sombre avec accent orange ;
- `graphite-cyan` : theme sombre neutre avec accent cyan ;
- `plum-night` : theme sombre avec accent violet controle.

Les themes doivent etre pilotes par variables CSS afin de rester compatibles avec Tailwind et shadcn/ui.

Le theming est une feature produit, pas seulement une preference visuelle. Il faut donc prevoir :

- un selecteur de theme dans les parametres utilisateur ;
- persistence du choix par utilisateur ;
- detection optionnelle du theme systeme ;
- variables CSS alignees sur les tokens shadcn/ui : background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring ;
- tokens metier dedies : event, task, project, free, busy, public, private, pending, accepted, rejected ;
- contraste lisible en light et dark ;
- couleurs coherentes sur calendrier, timeline, kanban, badges et graphiques de progression ;
- pas de dependance a une seule couleur pour comprendre le statut : combiner couleur, libelle et icone.

Le theme par defaut est `solar-orange`.

## 12. Non Objectifs Initiaux

Ces sujets ne sont pas prioritaires pour le premier jalon :

- application mobile native ;
- synchronisation CalDAV ;
- import/export Google Calendar ;
- notifications push mobiles ;
- facturation ;
- multi-tenant public ;
- edition collaborative temps reel.

Ils peuvent etre ajoutes plus tard si l'architecture reste propre.

## 13. Jalon 1 Recommande

Objectif : poser un backend sain et prouvable.

Contenu :

- nettoyage du `build.gradle.kts` ;
- ajout PostgreSQL, JPA, Flyway, OpenAPI ;
- compose PostgreSQL local ;
- modele users/workspaces/invitations ;
- auth email/password ;
- changement de mot de passe obligatoire ;
- configuration email personnelle en variables d'environnement ;
- tests d'integration auth + invitation ;
- premiere documentation Swagger.

## 14. Jalon 2 Recommande

Objectif : construire le coeur calendrier/taches.

Contenu :

- events ;
- tasks orphelines ;
- calendar blocks ;
- page calendrier authentifiee cote API ;
- visibilite public/private ;
- notifications in-app WebSocket pour demandes de rendez-vous ;
- notifications email pour demandes et confirmations ;
- premiers endpoints publics read-only ;
- tests calendrier public.

## 15. Jalon 3 Recommande

Objectif : projets et collaboration.

Contenu :

- projects ;
- epics ;
- sous-taches ;
- partage read/write ;
- demandes de collaboration ;
- notifications collaboration et partage ;
- fichiers joints ;
- tests permissions.

## 16. Questions A Trancher Avant Implementation

- Auth frontend/backend : session cookie HTTP-only ou JWT ?
- Stockage fichiers en dev : filesystem local dans le repo ignore ou dossier externe ?
- Granularite des partages projet : heritage automatique aux taches ou partage explicite par ressource ?
- Recurrence calendrier : necessaire des le debut ou apres MVP ?
- Langue UI initiale : francais uniquement ou i18n preparee ?
