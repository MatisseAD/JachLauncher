# Administration du backend

Les migrations `20260810000000_admin_control_plane` et
`20260812152749_live_launcher_sessions` doivent être déployées avant
d'ouvrir la console d'administration. Elle n'est jamais appliquée automatiquement
par le script de bootstrap.

## Accorder le premier rôle administrateur

Crée d'abord le compte normalement, puis exécute depuis `packages/web` :

```bash
npm run admin:grant -- <username>
```

Depuis la racine du monorepo, l'équivalent est :

```bash
npm run admin:grant --workspace=@jach/web -- <username>
```

Le script refuse les comptes inexistants ou suspendus, ne contient aucun nom
d'administrateur codé en dur et journalise la première promotion. Les promotions
suivantes doivent passer par l'API admin.

Sur Supabase, le script normalise automatiquement `DATABASE_URL` vers le même
schéma `jach_launcher` et les mêmes options de pool que le runtime Prisma. Un
paramètre `schema` explicite reste prioritaire.

## API de la console

- `GET /api/admin/overview` accepte `q`, `limit` (10 à 100) et les curseurs
  `userCursor`, `launcherCursor`, `banCursor`, `auditCursor`.
- `PATCH /api/admin/users/:id` accepte les actions `ban`, `unban`, `promote`,
  `demote`. `ban` exige `reason`.
- `PATCH /api/admin/launchers/:id` accepte `suspend` (avec `reason`) et `restore`.
- `POST /api/admin/player-bans` crée un blocage global ou limité à un launcher.
- `DELETE /api/admin/player-bans/:id` révoque le blocage sans supprimer l'historique.
- `POST /api/launcher-access/:slug` accepte l'objet public strict du client :
  `{ "type": "microsoft", "uuid": "...", "username": "..." }` ou le même
  objet avec `type: "offline"`. Seul l'UUID Microsoft ou le pseudo hors-ligne
  correspondant est utilisé pour la décision.
- `POST /api/launcher-presence/:slug` ouvre une présence desktop avec un jeton
  aléatoire de 256 bits. Seul son SHA-256 est conservé en base.
- `POST /api/launcher-presence/session` renouvelle la présence toutes les
  15 secondes, déclare l'état `open` ou `in_game` et remet une éventuelle
  commande `stop_game` / `close_client` au processus principal Electron.
- `DELETE /api/launcher-presence/session` ferme explicitement la présence.
- `GET /api/admin/live-sessions` liste au maximum 100 clients actifs et accepte
  `q` pour filtrer par joueur, launcher, identifiant ou version.
- `PATCH /api/admin/live-sessions/:id` exige un motif de 3 à 500 caractères,
  enregistre une commande et l'ajoute au journal d'audit append-only.

Les sessions expirent après 75 secondes sans heartbeat. Le nettoyage opportuniste
traite au maximum 500 expirations et 500 anciennes lignes par requête, avec
verrouillage `SKIP LOCKED`; l'historique fermé est conservé sept jours. La table
a RLS activé sans policy `anon`/`authenticated`, et les privilèges Data API sont
révoqués lorsqu'ils existent. Le jeton porteur reste uniquement en mémoire dans
le processus principal Electron : il n'est ni stocké, ni journalisé, ni exposé
au renderer.

Le bouton Centre d'administration ouvre `/admin` dans une fenêtre Electron
dédiée : sandbox active, Node et preload désactivés, permissions et
téléchargements refusés, navigation limitée à `/admin` et au retour de connexion
`/login?next=/admin`. L'authentification et l'autorisation restent entièrement
celles du serveur web et de son cookie httpOnly.

La présence, l'identité hors-ligne et l'exécution des commandes sont déclarées
par le client officiel. Un client modifié peut les falsifier ou les ignorer. Pour
un bannissement autoritatif et l'expulsion d'une partie multijoueur, applique
également la politique sur le serveur ou proxy Minecraft.

Toutes les mutations admin exigent une session administrateur relue en base,
une origine identique au site, une validation stricte et passent par le limiteur
de requêtes. Les nouvelles tables publiques ont RLS activé sans policy client :
seule la connexion PostgreSQL du serveur Prisma les utilise.

Une suspension verrouille les modifications, la duplication et la suppression
du launcher par son propriétaire jusqu'à l'action admin `restore`. Un launcher
portant encore un blocage joueur actif ne peut pas non plus être supprimé ni
changer de slug ; cela préserve la portée du blocage et son historique.
