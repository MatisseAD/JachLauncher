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

| Variable                       | Requise   | Description                                                     |
| ------------------------------ | --------- | --------------------------------------------------------------- |
| `DATABASE_URL`                 | oui       | URL PostgreSQL utilisée par Prisma et `migrate deploy`          |
| `AUTH_SECRET`                  | oui       | secret aléatoire d’au moins 32 caractères                       |
| `NEXT_PUBLIC_APP_URL`          | oui       | origine HTTPS publique, par exemple `https://app.example.com`   |
| `MANIFEST_SIGNING_PRIVATE_KEY` | conseillé | clé privée Ed25519 en base64 (`npm run key:generate`)           |
| `BLOB_READ_WRITE_TOKEN`        | conseillé | injecté par Vercel Blob ; sinon les uploads utilisent le disque |
| `NEXT_PUBLIC_ADSENSE_CLIENT`   | non       | identifiant `ca-pub-…` pour charger AdSense                     |

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
modifier les tables. Si ton fournisseur distingue URL poolée et URL directe,
utilise une URL adaptée aux migrations pour cette étape.

## 4. Base de données

Avant le premier trafic, vérifie localement l’état :

```bash
DATABASE_URL="postgresql://…" npm run db:status --workspace=@jach/web
DATABASE_URL="postgresql://…" npm run db:deploy --workspace=@jach/web
```

Le seed est réservé à une démo :

```bash
DATABASE_URL="postgresql://…" npm run db:seed --workspace=@jach/web
```

Il crée des identifiants publics connus. Ne l’exécute pas en production réelle,
ou supprime immédiatement le compte `demo`.

## 5. Images

Avec `BLOB_READ_WRITE_TOKEN`, `@vercel/blob` stocke les images publiquement et
renvoie une URL persistante. Sans ce jeton, le stockage local convient au
développement mais pas aux fonctions serverless éphémères.

Les uploads sont limités à 8 Mio et aux signatures PNG, JPEG, GIF ou WebP. SVG
est volontairement refusé.

## 6. Contrôles avant promotion

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

## 7. Déployer

Un push sur la branche reliée déclenche le pipeline Vercel. Pour un lancement
manuel sans conserver le CLI dans les dépendances applicatives :

```bash
npx vercel@latest
npx vercel@latest --prod
```

Après déploiement, surveille les échecs de migration, les réponses 429
d’authentification et la disponibilité de PostgreSQL/Blob. Pour plusieurs
instances, place aussi l’authentification derrière un WAF ou remplace le
limiteur mémoire par Redis/KV.
