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
| `BLOB_READ_WRITE_TOKEN` | ✅* | token Vercel Blob pour les uploads (voir §5) |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | ❌ | `ca-pub-XXXXXXXX` pour activer les pubs |

\* Auto-injecté si tu crées un store **Vercel Blob** dans le projet.

## 4. Base de données (PostgreSQL — automatique)

SQLite (utilisé en local) ne fonctionne pas sur Vercel. **Tout est automatisé** :
le build Vercel bascule le schéma Prisma en PostgreSQL
([`scripts/use-postgres.mjs`](scripts/use-postgres.mjs)), crée/synchronise les
tables (`prisma db push`) et génère le client Linux. Le dépôt reste en SQLite
pour ton dev local (aucune modification à committer).

Tu n'as qu'à :

1. Créer une base : **Vercel → Storage → Postgres** (ou Neon / Supabase).
   Si tu utilises Vercel Postgres, `DATABASE_URL` est ajouté automatiquement.
2. Sinon, colle l'`DATABASE_URL` dans les variables d'environnement.
3. (Optionnel) Charger les données démo une fois :
   ```bash
   cd packages/web && DATABASE_URL="postgresql://…" npm run db:seed
   ```
   → compte `demo` / `secret123` + launchers d'exemple (`serveur-demo`, `rp-kingdom`).

## 5. Upload d'images — Vercel Blob (automatique)

Les uploads (logo/fond) utilisent **Vercel Blob** dès que `BLOB_READ_WRITE_TOKEN`
est présent (sinon disque local en dev). Le `storage.ts` gère les deux.

1. **Vercel → Storage → Create → Blob**, relie-le au projet.
   `BLOB_READ_WRITE_TOKEN` est alors injecté automatiquement.
2. C'est tout : les images uploadées sont stockées sur Blob (URL publique
   persistante). Sinon, tu peux toujours coller des **URL d'images** dans l'éditeur.

Comptes, launchers, manifestes et génération fonctionnent normalement.

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
