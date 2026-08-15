# Déployer le site YourLauncher

Seul `packages/web` est déployé sur Vercel. Electron est construit et distribué
séparément.

## 1. Services requis

- une base PostgreSQL persistante (Vercel Postgres, Neon, Supabase ou autre) ;
- un projet Vercel lié au dépôt ;
- facultatif mais recommandé : un store Vercel Blob pour les logos et fonds.

Le schéma Prisma est PostgreSQL dans tous les environnements. Il n’existe plus
de bascule SQLite ni de `db push` pendant le build.

## 2. Variables d’environnement

| Variable                            | Requise    | Description                                                       |
| ----------------------------------- | ---------- | ----------------------------------------------------------------- |
| `DATABASE_URL`                      | oui        | URL PostgreSQL poolée utilisée par l’application                  |
| `DIRECT_URL`                        | conseillée | URL PostgreSQL directe/session utilisée par `migrate deploy`      |
| `AUTH_SECRET`                       | oui        | secret aléatoire d’au moins 32 caractères                         |
| `NEXT_PUBLIC_APP_URL`               | oui        | origine HTTPS publique, par exemple `https://app.example.com`     |
| `MANIFEST_SIGNING_PRIVATE_KEY`      | conseillé  | clé privée Ed25519 en base64 (`npm run key:generate`)             |
| `BLOB_READ_WRITE_TOKEN`             | conseillé  | injecté par Vercel Blob ; sinon les uploads utilisent le disque   |
| `DEMO_PASSWORD`                     | seed seul  | mot de passe de démo d'au moins 12 caractères                     |
| `ALLOW_DEMO_SEED`                   | seed prod  | doit valoir `true` pour autoriser explicitement le seed en prod   |
| `NEXT_PUBLIC_ADSENSE_CLIENT`        | non        | identifiant `ca-pub-…` pour charger AdSense                       |
| `NEXT_PUBLIC_LAUNCHER_DOWNLOAD_URL` | non        | URL HTTPS de l’installateur desktop affichée dans le dashboard    |
| `CURSEFORGE_API_KEY`                | non        | active la recherche CurseForge et son proxy de téléchargement     |
| `CONTENT_CATALOG_SIGNING_SECRET`    | conseillé  | HMAC stable (32+ caractères) pour les URL CurseForge du manifeste |

Génère le secret avec un gestionnaire de secrets ou :

```bash
openssl rand -base64 48
```

Ne copie jamais `packages/web/prisma/.env`, un fichier `.env` local ou un jeton
de base de données dans Git.

## 3. Configuration Vercel

Importe le dépôt avec la **racine du monorepo** comme Root Directory.
`vercel.json` :

1. installe avec `npm ci` ;
2. compile les packages partagés ;
3. applique `prisma migrate deploy` ;
4. construit `packages/web`.

La sortie est `packages/web/.next`.

Le déploiement doit disposer d’une connexion PostgreSQL autorisée à créer ou
modifier les tables. `DATABASE_URL` reste poolée pour le runtime serverless ;
le script de migration remplace temporairement cette valeur par `DIRECT_URL`.
Une migration bloquée est interrompue après 120 secondes au lieu de suspendre
indéfiniment le build.

Si `DIRECT_URL` est absente, le build utilise
`POSTGRES_URL_NON_POOLING` fourni par l’intégration Supabase de Vercel. En
dernier recours, pour un `DATABASE_URL` Supabase en `6543`, il dérive
automatiquement le même pooler en mode Session `5432`.

Avec Supabase :

- `DATABASE_URL` utilise le pooler **Transaction**, port `6543`, avec
  `pgbouncer=true` dans ses paramètres ;
- `DIRECT_URL` utilise la connexion **Direct** `db.<projet>.supabase.co:5432`
  si le réseau Vercel peut la joindre, ou le pooler **Session**
  `aws-…pooler.supabase.com:5432` ;
- ne mets jamais le port `6543` dans `DIRECT_URL`.

Le script de déploiement ajoute automatiquement `pgbouncer=true` et
`connection_limit=1` à `DATABASE_URL` lorsqu’il reconnaît le pooler
transactionnel Supabase.

Pour ne pas entrer en conflit avec les tables déjà présentes dans `public`, les
URL Supabase sont automatiquement ciblées vers le schéma PostgreSQL privé
`jach_launcher`. Prisma y conserve sa propre table `_prisma_migrations` et les
tables de l’application. Aucun objet existant de `public`, `auth` ou `storage`
n’est supprimé ou marqué artificiellement comme migré.

## 4. Base de données

Les migrations incluent la console administrateur et les sessions de présence
du client desktop. Elles doivent être appliquées avant de diffuser la version
3.0.2 du launcher ; sinon la liste des clients ouverts/en jeu restera
indisponible. Ces présences expirent automatiquement après 75 secondes sans
heartbeat.

Avant le premier trafic, vérifie localement l’état :

```bash
DATABASE_URL="postgresql://…" npm run db:status --workspace=@jach/web
DIRECT_URL="postgresql://…" npm run db:deploy --workspace=@jach/web
```

Le seed est réservé à une démo. Sans `DEMO_PASSWORD`, il génère et affiche un
mot de passe aléatoire fort en développement :

```bash
DATABASE_URL="postgresql://…" npm run db:seed --workspace=@jach/web
```

Il refuse de s’exécuter avec `NODE_ENV=production` sans l'opt-in
`ALLOW_DEMO_SEED=true`. En production, fournis aussi `DEMO_PASSWORD` via le
gestionnaire de secrets afin de ne jamais écrire le mot de passe dans les logs.

## 5. Images

Avec `BLOB_READ_WRITE_TOKEN`, `@vercel/blob` stocke les images publiquement et
renvoie une URL persistante. Sans ce jeton, le stockage local convient au
développement mais pas aux fonctions serverless éphémères.

Les uploads sont limités à 8 Mio et aux signatures PNG, JPEG, GIF ou WebP. SVG
est volontairement refusé. Le quota partagé est de 30 fichiers ou 64 Mio par
compte et par jour. Les anciens objets gérés sont supprimés lors d'un
remplacement, et tout le namespace d'un launcher est purgé avec sa suppression.

## 6. Contrôles avant promotion

### Configuration GitHub de la release desktop 3.0.2

L'ID d'application Microsoft est public, mais sa valeur doit être fournie
explicitement à chaque build de distribution. Dans le dépôt GitHub, ouvre
**Settings** > **Secrets and variables** > **Actions** > onglet **Variables**,
puis crée la **Repository variable** `JACH_AZURE_CLIENT_ID` avec l'ID
d'application Azure au format GUID. L'ancien nom `JACH_ID` reste accepté comme
alias ; si les deux existent, `JACH_AZURE_CLIENT_ID` est prioritaire.

Ne place pas cet ID dans l'onglet **Secrets** : le workflow lit volontairement
uniquement `vars.JACH_AZURE_CLIENT_ID` ou `vars.JACH_ID`. Un secret portant le
même nom est ignoré et, sans Repository variable valide, le job s'arrête avant
`npm ci` et avant tout build. Le fallback embarqué sert uniquement au
développement local ; `package:win` et electron-builder refusent de produire
un installateur sans ID explicite.

```bash
npm ci
npm run check
npm run build
npm audit --omit=dev
```

Avec une base de test migrée et seedée :

```bash
npm run smoke:web
```

Vérifie ensuite :

- `/` répond avec les en-têtes CSP et anti-framing ;
- `/api/manifest/serveur-demo` retourne un manifeste v2 uniquement si ce
  launcher est publié ;
- un brouillon n’est visible publiquement ni par l’API ni par l’aperçu ;
- la création de compte, la connexion, l’upload et la publication fonctionnent ;
- `NEXT_PUBLIC_APP_URL` correspond exactement au domaine HTTPS final.
- la console `/admin` voit un launcher 3.0.2 ouvert, puis son état `En jeu`, et
  les commandes d'arrêt/fermeture sont exécutées par le client officiel.
- la recherche Modrinth fonctionne ; si `CURSEFORGE_API_KEY` est configurée,
  vérifie également un téléchargement CurseForge autorisé par son auteur.

## 7. Déployer

Le script de déploiement contrôle le code et l'audit de production, lie le
projet si nécessaire, synchronise les variables sans les afficher, déclenche
les migrations pendant le build puis vérifie l'accueil et sa CSP.

Crée d'abord un fichier local ignoré par Git :

```powershell
Copy-Item packages/web/.env.example packages/web/.env.vercel
```

Remplace ses valeurs par les URL PostgreSQL poolée et directe, un secret de
32 caractères minimum et le domaine HTTPS final. Ajoute aussi la clé produite
par `npm run key:generate` et le jeton Vercel Blob, puis lance :

```bash
npm run deploy:vercel -- --env-file packages/web/.env.vercel
```

Les exécutions suivantes peuvent réutiliser les variables déjà enregistrées :

```bash
npm run deploy:vercel
```

Utilise `--preview` pour ne pas promouvoir en production, `--project` et
`--scope` en environnement non interactif, `--validate-only` pour un contrôle
sans connexion, ou `--help` pour la liste complète. La CLI est téléchargée à la
demande et n'est pas conservée dans les dépendances applicatives. En CI,
configure `VERCEL_TOKEN`, `VERCEL_ORG_ID` et `VERCEL_PROJECT_ID`.

Après déploiement, surveille les échecs de migration, les réponses 429
d’authentification et la disponibilité de PostgreSQL/Blob. Pour plusieurs
instances, place aussi l’authentification derrière un WAF ou remplace le
limiteur mémoire par Redis/KV.
