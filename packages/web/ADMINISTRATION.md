# Administration du backend

La migration `20260810000000_admin_control_plane` doit être déployée avant
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

Toutes les mutations admin exigent une session administrateur relue en base,
une origine identique au site, une validation stricte et passent par le limiteur
de requêtes. Les nouvelles tables publiques ont RLS activé sans policy client :
seule la connexion PostgreSQL du serveur Prisma les utilise.

Une suspension verrouille les modifications, la duplication et la suppression
du launcher par son propriétaire jusqu'à l'action admin `restore`. Un launcher
portant encore un blocage joueur actif ne peut pas non plus être supprimé ni
changer de slug ; cela préserve la portée du blocage et son historique.
