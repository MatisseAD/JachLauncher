# YourLauncher

YourLauncher réunit dans un monorepo :

- un site Next.js où un créateur configure et publie un launcher Minecraft ;
- une application Electron qui charge cette configuration, prépare une instance
  isolée et lance le jeu ;
- un schéma Zod commun qui sert de contrat de sécurité entre les deux ;
- une interface React partagée entre l’aperçu web et l’application desktop.

Le nom historique des packages reste `@jach/*`, tandis que la marque affichée
est **YourLauncher**.

## Architecture

```text
Créateur ── éditeur Next.js ── PostgreSQL
                  │
                  └── GET /api/manifest/<code> (manifeste v2 publié)
                                      │
Joueur ── Electron ── approbation de l’empreinte ── instance Minecraft isolée
```

| Workspace           | Rôle                                                                    |
| ------------------- | ----------------------------------------------------------------------- |
| `packages/shared`   | Schéma du manifeste v2, limites et validation Zod                       |
| `packages/ui`       | `LauncherSkin`, utilisé par l’aperçu web et Electron                    |
| `packages/web`      | Next.js 15, Prisma 6, PostgreSQL, authentification JWT/bcrypt, uploads  |
| `packages/launcher` | Electron, XMCL, authentification Microsoft/hors-ligne, Java automatique |

## Garanties importantes

- Seuls les launchers au statut `published` ont un manifeste public.
- Un manifeste nouveau ou modifié doit être approuvé dans Electron. La confiance
  porte sur son empreinte SHA-256, pas uniquement sur son nom.
- Si `MANIFEST_SIGNING_PRIVATE_KEY` est configuré, le site signe en Ed25519.
  Après la première approbation, le launcher reconnaît les mises à jour du même
  code, signées par la même clé sur la même origine. Une signature présente mais
  invalide est toujours bloquée.
- Les téléchargements exigent une URL autorisée, un SHA-256 et une taille exacte.
  Ils sont écrits dans un fichier temporaire, contrôlés pendant le flux, puis
  renommés atomiquement.
- Les noms de fichiers ne peuvent pas sortir de l’instance. Seuls les anciens
  fichiers répertoriés comme gérés par YourLauncher sont supprimés lors d’une
  mise à jour.
- Mods obligatoires, resource packs et shaders sont synchronisés. Les contenus
  facultatifs restent affichés dans le catalogue, mais ne sont pas imposés.
- Minecraft vanilla, Fabric, Quilt, Forge et NeoForge sont installés avec
  `@xmcl/core` et `@xmcl/installer`. Une `loaderVersion` explicite est vérifiée
  et appliquée.
- La version Java recommandée vient des métadonnées Mojang, y compris pour les
  snapshots. À défaut, un repli par version release est utilisé. Un JRE Temurin
  compatible est téléchargé depuis Adoptium si nécessaire.
- Le renderer Electron est sandboxé, sans intégration Node, avec une CSP. Les
  liens non HTTP(S), les destinations réseau privées et les chemins traversants
  sont refusés.
- Les comptes Microsoft ne sont pas persistés sur disque : une reconnexion est
  demandée après redémarrage. Les jetons restent en mémoire.

## Prérequis

- Node.js 22 recommandé (`>=20` pour le projet ; les outils de build actuels
  demandent une version 20.19+ ou 22.12+) ;
- Docker Desktop ou un PostgreSQL 16 accessible ;
- aucun Java à installer manuellement pour l’usage normal du launcher.

## Installation locale

```powershell
npm ci
Copy-Item packages/web/.env.example packages/web/.env
docker compose up -d
npm run db:deploy --workspace=@jach/web
npm run db:seed --workspace=@jach/web
```

Le seed est idempotent. Il crée le compte de développement
`demo / secret123` et deux launchers publiés. Change ou supprime ce compte avant
toute mise en production.

Pour créer une nouvelle migration après une modification du schéma :

```powershell
npm run db:migrate --workspace=@jach/web -- --name nom_de_la_migration
```

`prisma db push` n’est pas utilisé : PostgreSQL et les migrations versionnées
sont la source de vérité dans tous les environnements.

Pour générer la clé privée de signature du manifeste :

```powershell
npm run key:generate
```

Copie uniquement la ligne `MANIFEST_SIGNING_PRIVATE_KEY=…` dans le gestionnaire
de secrets du site. Ne versionne jamais cette valeur.

## Développement

Dans deux terminaux :

```powershell
npm run dev:web
npm run dev:launcher
```

Le site écoute sur `http://localhost:3000`. Dans le launcher, saisis cette
adresse et le code `serveur-demo`, puis approuve l’empreinte affichée.

L’éditeur web comporte neuf étapes : modèle, identité, design, Minecraft,
contenu, actualités, communauté, serveur et publication. Chaque fichier
téléchargeable doit avoir son nom final, son URL directe, sa taille en octets et
son SHA-256. La publication attend la fin de la sauvegarde et refuse les lignes
incomplètes.

La navigation publique du site possède six dictionnaires (FR, EN, ES, DE, PT,
IT). Les écrans métier détaillés de l’éditeur et le launcher desktop restent en
français ; la documentation ne les présente donc pas comme intégralement
traduits.

## Comptes Minecraft

Le mode hors-ligne sert au développement et aux serveurs configurés pour
l’accepter. Il ne prouve pas la propriété d’un compte Mojang/Microsoft.

Pour Microsoft, crée une application Azure compatible avec le flux desktop
attendu par `msmc`, puis lance :

```powershell
$env:JACH_AZURE_CLIENT_ID="<client-id>"
npm run dev:launcher
```

Pour imposer un binaire Java précis :

```powershell
$env:JACH_JAVA_PATH="C:\Program Files\Eclipse Adoptium\jdk-21\bin\java.exe"
npm run dev:launcher
```

## Qualité et validation

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

`npm run check` regroupe format, lint, types et tests. La CI ajoute PostgreSQL,
applique les migrations, exécute le seed, construit le web et Electron, puis
vérifie la page d’accueil et un manifeste v2.

## Distribuer Electron

```powershell
npm run package --workspace=@jach/launcher
```

Les artefacts sont écrits dans `packages/launcher/release`. Le launcher inclut
la mise à jour automatique via `electron-updater` : `npm run release:publish`
publie l’installateur, son blockmap et `latest.yml` sur le canal Vercel Blob
configuré (avec `BLOB_READ_WRITE_TOKEN`). Pour une diffusion publique, configure
aussi la signature de code Windows/macOS.

## Déploiement

Consulte [DEPLOY.md](DEPLOY.md). Le socle de production est PostgreSQL,
`prisma migrate deploy`, un `AUTH_SECRET` fort, HTTPS et un stockage persistant
pour les images (Vercel Blob si son jeton est présent).

## Limites explicites

- Le modèle distribué est un hub unique avec branding dynamique, pas un `.exe`
  différent pour chaque créateur.
- Le limiteur d’authentification intégré est local à une instance. Ajoute un
  WAF ou un stockage partagé (Redis/KV) pour une protection distribuée.
- La CI ne télécharge pas une installation Minecraft complète et ne connecte
  pas de compte Microsoft. Ce test système, coûteux et dépendant de services
  externes, doit être exécuté séparément avant une release desktop.
- Le statut serveur refuse les IP privées par conception. Il cible des serveurs
  Minecraft publics.
