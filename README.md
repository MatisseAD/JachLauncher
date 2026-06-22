# YourLauncher

> Identité : logo fusée pixel violet (`packages/web/public/logo.png`), palette
> violette (`#8b5cf6` / `#7c3aed` → `#a78bfa`), fond violet très sombre, texte
> pixel. Le logo est utilisé dans la navbar, le hero, le footer, le favicon, et
> l'écran d'accueil + l'icône du launcher (`packages/launcher/build/icon.png`).
> _(Les packages npm internes gardent le scope `@jach/*` ; le dossier reste
> `JachLauncher`. Seule la marque visible est « YourLauncher ».)_

Deux technologies en une, dans un même monorepo :

1. **Le site** (`packages/web`) — une plateforme où n'importe qui crée son
   launcher Minecraft personnalisé : version, mod loader, mods, logo, image de
   fond, couleurs. Il génère un **manifeste** JSON public.
2. **Le launcher** (`packages/launcher`) — une app desktop Electron unique
   (« hub ») qui télécharge ce manifeste via un **code**, applique le branding
   au runtime, télécharge Minecraft + le mod loader + les mods, puis lance le
   jeu.

Le lien entre les deux est le package partagé **`packages/shared`** : le schéma
du manifeste (Zod). Le site le produit, le launcher le valide avec **le même
code**. C'est ce qui fait que « le launcher s'adapte à la demande de
l'utilisateur ».

```
┌─────────────┐    crée/édite     ┌──────────────────┐
│  Créateur   │ ───────────────▶ │  Site (Next.js)  │
└─────────────┘                   │  + DB SQLite     │
                                  └────────┬─────────┘
                                           │ GET /api/manifest/<code>
                                           ▼
                                  ┌──────────────────┐   télécharge & lance
┌─────────────┐   entre le code  │  Launcher        │ ─────────────────────▶ 🎮
│   Joueur    │ ───────────────▶ │  (Electron)      │   Minecraft + mods
└─────────────┘                   └──────────────────┘
```

## Design identique site ↔ launcher

Le rendu du launcher est un **unique composant React partagé** : `LauncherSkin`
(package **`@jach/ui`**). Le site l'utilise pour la prévisualisation et le vrai
launcher Electron l'utilise pour son interface. Comme c'est *le même code*, le
design est garanti identique — pas de dérive possible. Le composant est
purement présentationnel (piloté par des props : `config` visuelle + `state`
runtime + `handlers`), donc côté launcher il est branché à l'IPC réel, et côté
site à un état de démo.

## Stack technique

| Partie     | Techno |
|------------|--------|
| `shared`   | TypeScript + Zod (schéma du manifeste, validé des deux côtés) |
| `ui`       | React — `LauncherSkin` + `skin.css` (la "peau" du launcher, partagée) |
| `web`      | Next.js 15 (App Router), Prisma + SQLite, auth cookie (JWT `jose` + bcrypt) |
| `launcher` | Electron + electron-vite + React, [`minecraft-launcher-core`](https://www.npmjs.com/package/minecraft-launcher-core), [`msmc`](https://github.com/Hanro50/MSMC) (auth Microsoft) |

## Prérequis

- **Node.js ≥ 20** (testé sur Node 24)
- **Java : géré automatiquement.** Le launcher détecte la version de Java
  requise selon la version de Minecraft (8 / 16 / 17 / 21) et, si le `java` du
  système ne convient pas, **télécharge et installe le bon JRE** (Eclipse
  Temurin / Adoptium) dans son dossier de données. Aucune installation manuelle
  nécessaire. Pour forcer un JDK précis, définis `JACH_JAVA_PATH`.

## Installation

```bash
npm install          # installe tous les workspaces
npm run build:libs   # compile @jach/shared + @jach/ui (requis avant le reste)
```

Initialise la base du site :

```bash
cd packages/web
npx prisma generate
npx prisma db push     # crée packages/web/dev.db
cd ../..
```

## Lancer le site

```bash
npm run dev:web        # http://localhost:3000
```

Le site est un **éditeur premium en 6 étapes** avec prévisualisation en direct :

1. Crée un compte sur `/register`.
2. « Nouveau launcher » → l'assistant te guide :
   1. **Infos générales** : nom, code (slug), description, logo, fond, couleurs,
      style visuel, et des **modèles** prêts à l'emploi (survie, faction, RP,
      premium sombre, pixel rétro, futuriste).
   2. **Apparence** : style du bouton Jouer, forme des cartes, placement du menu,
      boutons Discord / site web, affichage des actus.
   3. **Minecraft** : version (**liste complète tirée du manifeste Mojang**,
      ~100 releases + snapshots en option), type de serveur, loader, adresse/port
      du serveur, message de lancement, RAM, arguments JVM avancés (repliables).
   4. **Mods & ressources** : mods, resource packs, shaders (URL directe + icône,
      description, version).
   5. **Actualités** : titre, image, description, date, bouton.
   6. **Aperçu final** : rendu complet, puis **Générer** (publie le launcher et
      propose le téléchargement du `manifest.json` + le code à partager).
3. Tout est **auto-sauvegardé**. La prévisualisation à droite reflète le rendu
   exact côté joueur.
4. Le tableau de bord liste tes launchers (badges brouillon / prêt / publié,
   favoris, dupliquer, prévisualiser, publier, supprimer).
5. Pages : `/` (accueil), `/dashboard`, éditeur, `/preview/<code>` (aperçu plein
   écran public), `/account`, `/help`.
6. Le manifeste public consommé par le launcher est servi sur
   `http://localhost:3000/api/manifest/<code>`.

## Lancer le launcher

```bash
npm run dev:launcher
```

1. Au démarrage, entre l'**adresse du site** (`http://localhost:3000` par
   défaut) et le **code** du launcher créé à l'étape précédente.
2. L'interface complète (le skin partagé) s'affiche : **fenêtre custom sans
   cadre** (réduire / plein écran / fermer), menu latéral (Accueil, Actualités,
   Profils, Mods, Paramètres, Aide), actualités, **statut serveur + nombre de
   joueurs** (ping en direct), profil utilisateur, liens Discord/site.
3. Connecte-toi :
   - **Mode hors-ligne** (par défaut, pour le dev) : entre un pseudo, ça marche
     tout de suite.
   - **Microsoft** : nécessite un client ID Azure (voir ci-dessous).
4. Clique **JOUER** → le launcher prépare le mod loader, télécharge les mods,
   **vérifie/installe Java** si besoin, puis lance le jeu. Le bouton passe par
   tous ses états avec barre de progression. Les **Paramètres** (RAM, résolution,
   plein écran…) sont persistés et appliqués au lancement.

Le bon Java est installé automatiquement. Pour **forcer** un JDK précis (optionnel) :

```bash
# Windows (PowerShell)
$env:JACH_JAVA_PATH="C:\Program Files\Eclipse Adoptium\jdk-21\bin\java.exe"; npm run dev:launcher
```

## Authentification Microsoft (comptes premium)

Le mode hors-ligne fonctionne sans configuration. Pour la connexion Microsoft
officielle, il faut **ta propre application Azure** autorisée pour l'API
Minecraft (Microsoft ne permet plus les client IDs partagés) :

1. Crée une app sur le portail Azure (Azure Active Directory → App
   registrations), type « Mobile and desktop », ajoute l'URI de redirection
   demandé par msmc.
2. Lance le launcher avec :
   ```bash
   $env:JACH_AZURE_CLIENT_ID="<ton-client-id>"; npm run dev:launcher
   ```

## Empaqueter le launcher (.exe / .dmg / AppImage)

```bash
npm run build --workspace=@jach/launcher
npm run package --workspace=@jach/launcher   # via electron-builder -> release/
```

## État du MVP

**Fonctionne aujourd'hui :**

- Site premium **multilingue** (FR, EN, ES, DE, PT, IT — sélecteur de langue
  style Aternos), **100% gratuit** mis en avant : comptes, éditeur en 6 étapes
  avec **prévisualisation en direct**, modèles de thème, auto-sauvegarde, upload
  d'assets, mods/packs/shaders, actualités, serveur, dupliquer / publier /
  favoris, pages aperçu / compte / aide, génération + téléchargement du manifeste.
- **Vidéo d'intro** YourLauncher à l'arrivée (une fois par session), **zones
  publicitaires** discrètes (placeholder, prêtes pour Google AdSense via
  `NEXT_PUBLIC_ADSENSE_CLIENT`), **déploiement Vercel** prêt (voir
  [DEPLOY.md](DEPLOY.md)).
- Launcher : interface premium (skin partagé), fenêtre sans cadre, menu latéral,
  actualités, profil/compte (**avatar du joueur**), réglages persistés, états
  du bouton Jouer + barre de progression ; chargement par code, branding runtime,
  auth hors-ligne + Microsoft, téléchargement des mods (vérif SHA-1), lancement.
- Launcher — fonctionnalités pro : **bouton Jouer intelligent** (installer /
  mettre à jour / réparer / maintenance / connexion requise…), **réparation
  automatique**, **diagnostic clair** des erreurs (+ copie du rapport, support,
  Discord), **statut serveur enrichi** (joueurs, version, MOTD, ping TCP),
  **actualités à catégories** (badges, « Nouveau », temps de lecture), pages
  **Événements** (compte à rebours) et **Notes de mise à jour**, **bannière
  d'alerte** + **mode maintenance**, **ambiances animées** (feu/neige/étoiles/
  pluie/glitch), **RAM auto** (recommandée selon le PC + modes), **première
  installation guidée**.
- **Design identique site ↔ launcher** garanti par le composant partagé `@jach/ui`.
- Mod loaders : **vanilla**, **Fabric**, **Quilt** (profils meta officiels,
  `loaderVersion` respecté), **Forge** et **NeoForge** (via `tomate-loaders` :
  téléchargement + exécution de l'installeur).
- **Java automatique** : détection de la version requise + téléchargement du JRE
  Adoptium si nécessaire (cache local).

**Limites connues / prochaines étapes :**

- **Version de loader Forge/NeoForge** : `tomate-loaders` installe la dernière
  version stable pour la version de MC (le champ `loaderVersion` du manifeste
  n'est pas appliqué pour Forge/NeoForge — il l'est pour Fabric/Quilt).
- **Builds brandés par créateur** : on est sur le modèle « 1 launcher hub +
  branding runtime ». Des `.exe` brandés individuels demanderaient un pipeline
  CI.
- **Production** : passer SQLite → Postgres, stockage local → S3/R2, et durcir
  l'auth.

## Structure

```
packages/
  shared/    # schéma du manifeste (TS + Zod) — le contrat
  ui/        # LauncherSkin + skin.css — la peau du launcher, partagée site↔launcher
  web/       # site Next.js + API + Prisma/SQLite
  launcher/  # app Electron (main / preload / renderer React)
```
