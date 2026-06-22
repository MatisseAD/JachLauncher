# Déploiement du site sur Vercel

Seul **le site** (`packages/web`) se déploie sur Vercel. Le launcher est une app
desktop (Electron) distribuée à part (voir `npm run package --workspace=@jach/launcher`).

## 1. Pousser le code sur GitHub

```bash
git init        # si pas déjà fait
git add -A
git commit -m "YourLauncher"
git remote add origin <ton-repo>
git push -u origin main
```

> Les fichiers `public/logo.png` et `public/video.mp4` sont versionnés et servis
> en statique. Les secrets (`.env`, `dev.db`) sont ignorés.

## 2. Importer sur Vercel

- Sur vercel.com → **Add New → Project → Import** ton repo GitHub.
- **Root Directory : laisse la racine du repo** (par défaut). Le fichier
  [`vercel.json`](vercel.json) à la racine gère le monorepo :
  - installe tous les workspaces,
  - build d'abord les libs partagées (`@jach/shared`, `@jach/ui`),
  - puis build le site (`@jach/web`),
  - sort le résultat dans `packages/web/.next`.
- Framework détecté : **Next.js**.

## 3. Variables d'environnement (Vercel → Settings → Environment Variables)

| Variable | Obligatoire | Valeur |
|----------|-------------|--------|
| `DATABASE_URL` | ✅ | URL **PostgreSQL** (voir §4) |
| `AUTH_SECRET` | ✅ | chaîne aléatoire longue (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | ❌ | `ca-pub-XXXXXXXX` pour activer les pubs |

## 4. Base de données (PostgreSQL en prod)

SQLite (utilisé en local) **ne fonctionne pas** sur Vercel (système de fichiers
éphémère). En production, utilise Postgres :

1. Crée une base : **Vercel → Storage → Postgres** (ou Neon / Supabase).
2. Dans [`packages/web/prisma/schema.prisma`](packages/web/prisma/schema.prisma),
   passe le provider en Postgres :
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Copie l'`DATABASE_URL` de la base dans les variables Vercel.
4. Applique le schéma (en local, avec cette `DATABASE_URL`) :
   ```bash
   cd packages/web
   DATABASE_URL="postgresql://…" npx prisma db push
   ```

`prisma generate` tourne pendant le build Vercel (le moteur Linux est généré
automatiquement).

## 5. Upload d'images (limite serverless)

L'upload de fichiers (logo/fond) écrit sur le disque local → **ne persiste pas**
sur Vercel. Deux options :

- **Simple** : dans l'éditeur, colle des **URL d'images** (déjà supporté).
- **Complet** : brancher un stockage externe (Vercel Blob / S3) dans
  `packages/web/src/lib/storage.ts`.

Les comptes, launchers, manifestes et la génération fonctionnent normalement avec
Postgres.

## 6. Déployer

Clique **Deploy**. À chaque `git push`, Vercel redéploie.

### Alternative en CLI

Le CLI Vercel est déjà une dépendance du repo :

```bash
npx vercel        # déploiement de prévisualisation
npx vercel --prod # production
```

## Activer les publicités (optionnel)

1. Crée un compte Google AdSense, récupère ton `ca-pub-XXXX`.
2. Définis `NEXT_PUBLIC_ADSENSE_CLIENT` sur Vercel.
3. Dans les 3 emplacements `<AdSlot />` (accueil, tableau de bord, aide), ajoute
   l'`slot="<id-AdSense>"` correspondant. Sans configuration, un placeholder
   discret « Espace publicitaire » s'affiche.
