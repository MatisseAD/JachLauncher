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
                  ├── GET /api/manifest/<code> (manifeste v2 publié)
                  └── /admin (membres, launchers, clients en direct)
                                      │
Joueur ── Electron ── approbation ── présence 15 s ── instance Minecraft
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
- Les jetons de jeu Microsoft restent uniquement en mémoire. Le cache de
  session MSAL est persisté sous forme chiffrée par le coffre-fort natif
  Electron, afin de restaurer silencieusement le compte au redémarrage.
- Le centre admin Electron ouvre la console web dans une fenêtre isolée. Le
  client officiel déclare son état toutes les 15 secondes et exécute les
  commandes d'arrêt de Minecraft ou de fermeture du client.

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
contenu, actualités, communauté, serveur et publication. Le design détaillé et
l’import manuel sont repliés derrière des sections avancées. À l’étape contenu,
une recherche Modrinth filtrée par version Minecraft, type et loader choisit le
fichier compatible, ajoute ses dépendances requises et récupère côté serveur son
URL, sa taille et ses empreintes. L’utilisateur n’a donc aucun SHA-256 à saisir
pour le parcours normal. L’import direct reste disponible pour les contenus
absents des catalogues et demande alors les métadonnées de sécurité complètes.

CurseForge est proposé uniquement si `CURSEFORGE_API_KEY` est configuré côté
serveur. La clé n’est jamais envoyée au navigateur ou au launcher : le manifeste
reçoit une URL de proxy signée, qui revalide le fichier et diffuse le flux sans
cache. `CONTENT_CATALOG_SIGNING_SECRET` permet d’utiliser une clé HMAC dédiée ;
à défaut, `AUTH_SECRET` est utilisé. Consulte
[la documentation du catalogue](packages/web/CONTENT_CATALOG.md) avant de
l’activer en production.

La navigation publique du site possède six dictionnaires (FR, EN, ES, DE, PT,
IT). Les écrans métier détaillés de l’éditeur et le launcher desktop restent en
français ; la documentation ne les présente donc pas comme intégralement
traduits.

## Comptes Minecraft

Le mode hors-ligne sert au développement et aux serveurs configurés pour
l’accepter. Il ne prouve pas la propriété d’un compte Mojang/Microsoft.

Pour Microsoft, crée une application Azure **publique** (aucun secret client)
qui accepte les comptes Microsoft personnels. Dans **Authentification**, ajoute
la plateforme **Applications mobiles et de bureau**, enregistre exactement
`http://localhost` comme URI de redirection et active les flux de client public.
Le launcher utilise MSAL Node, le navigateur système, un callback loopback
éphémère, `state` et PKCE S256. Consulte
[la configuration Azure détaillée](packages/launcher/MICROSOFT_AUTH.md), puis
lance :

```powershell
$env:JACH_AZURE_CLIENT_ID="<client-id>"
npm run dev:launcher
```

`JACH_ID` est également accepté comme alias pour les environnements déjà
configurés avec ce nom. `JACH_AZURE_CLIENT_ID` reste le nom canonique et est
prioritaire lorsque les deux variables existent.

L’identifiant public actuellement configuré est embarqué dans le launcher. Les
releases peuvent le remplacer depuis la variable Actions
`JACH_AZURE_CLIENT_ID`, ou depuis l’alias `JACH_ID`. Le workflow refuse toute
valeur qui n’est pas un GUID ; aucun secret OAuth n’est placé dans
l’application. Le cache MSAL est chiffré avec le coffre-fort
natif Electron `safeStorage`, restauré silencieusement au redémarrage et
supprimé au logout.

Le dépôt contient un ID d'application public par défaut ; les variables ci-dessus
servent à le remplacer pour un autre environnement. Pour tout nouvel ID Azure,
Mojang impose aussi une
[demande d'accès aux API Java](https://help.minecraft.net/hc/en-us/articles/16254801392141) :
sans cette autorisation serveur, Microsoft et Xbox peuvent accepter la connexion
avant que Minecraft Services ne refuse finalement le compte.

Avant chaque lancement, le client appelle aussi
`POST /api/launcher-access/:slug` sur l'origine du manifeste. La vérification
est **fail-closed** : une origine auto-hébergée doit donc implémenter cet
endpoint, faute de quoi le jeu reste bloqué. L'UUID transmis par un client
desktop n'est pas, à lui seul, une preuve cryptographique d'identité ; les
bannissements sensibles doivent également être appliqués par le serveur
Minecraft (whitelist/plugin/proxy).

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
npm run package:win --workspace=@jach/launcher
```

Les artefacts sont écrits dans `packages/launcher/release`. Le launcher inclut
la mise à jour automatique via `electron-updater` : `npm run release:publish`
publie l’installateur, son blockmap et `latest.yml` sur un canal Vercel Blob
signé isolé. Configure l’URL publique dans la variable Actions
`JACH_SIGNED_UPDATE_FEED_URL` et son jeton dans le secret
`SIGNED_BLOB_READ_WRITE_TOKEN`. Le workflow de release refuse une
publication Windows non signée : configure un certificat Authenticode dans les
secrets Actions `WINDOWS_CSC_LINK` (fichier PFX ou valeur base64 acceptée par
electron-builder) et `WINDOWS_CSC_KEY_PASSWORD`. Le mot de passe et le
certificat ne sont jamais embarqués dans le dépôt. Ajoute aussi la variable
Actions `JACH_WINDOWS_PUBLISHER_NAME`, exactement égale au nom simple de
l'éditeur du certificat. Ce nom est épinglé dans `app-update.yml` et comparé à
la signature réelle avant toute publication.

La transition depuis les clients historiques 0.2.1 non signés nécessite une
seule publication d’amorçage : définis temporairement
`JACH_LEGACY_BOOTSTRAP_VERSION` sur la version signée concernée et fournis
`LEGACY_BLOB_READ_WRITE_TOKEN`. Cette release est d’abord publiée sur le
nouveau canal signé, puis annoncée sur l’ancien canal. Dès sa publication,
révoque définitivement le jeton historique et supprime le secret GitHub. Les
versions suivantes utilisent exclusivement le nouveau store et vérifient le
nom de l’éditeur Authenticode embarqué dans `app-update.yml`. La toute première
transition reste nécessairement fondée sur la confiance du client 0.2.1 dans
son ancien canal mutable ; fais-la depuis un environnement CI verrouillé.

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
