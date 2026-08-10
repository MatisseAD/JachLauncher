# Configuration Microsoft du launcher

YourLauncher est une application de bureau publique. Elle n'utilise et ne doit
jamais recevoir de secret client.

## Inscription Azure

1. Crée une inscription d'application qui accepte les **comptes Microsoft
   personnels** (ou les comptes organisationnels et personnels si nécessaire).
2. Dans **Authentification** > **Ajouter une plateforme**, sélectionne
   **Applications mobiles et de bureau**.
3. Ajoute exactement l'URI de redirection `http://localhost`.
4. Active **Autoriser les flux de clients publics**.
5. Copie uniquement l'**ID d'application (client)** au format GUID dans la
   variable Actions `JACH_AZURE_CLIENT_ID` ou dans la variable d'environnement
   locale du même nom.

N'ajoute ni secret, ni certificat d'application. Ne configure pas l'ancien
callback `https://login.live.com/oauth20_desktop.srf` : il appartenait au flux
embarqué historique et n'est plus utilisé.

## Flux réellement exécuté

- `@azure/msal-node` vise l'autorité `consumers` et demande
  `XboxLive.signin offline_access`.
- Le navigateur **système** ouvre la page Microsoft.
- Le client crée un port aléatoire lié uniquement à `127.0.0.1`, tout en
  envoyant une redirect URI `http://localhost:<port>` compatible avec
  l'inscription `http://localhost` des applications de bureau.
- Chaque tentative possède un `state`, un `nonce` et un couple PKCE S256
  uniques. Le callback vérifie le `state` avant tout échange du code.
- Le cache MSAL contenant les refresh tokens est chiffré via les API
  asynchrones Electron `safeStorage` dans le dossier `userData`. Aucun repli en
  clair n'existe. Le logout retire les comptes MSAL et supprime ce fichier.
- Le jeton Microsoft est ensuite échangé en mémoire contre Xbox Live, XSTS et
  Minecraft. Aucun code ou jeton n'est écrit dans les logs.

## Erreurs de configuration courantes

- `AADSTS50011` : `http://localhost` n'est pas enregistré sous la plateforme
  **Applications mobiles et de bureau**.
- `AADSTS700016` : le GUID ne correspond pas à l'inscription attendue.
- `unauthorized_client` : le flux de client public ou les comptes personnels ne
  sont pas autorisés.
- profil Xbox absent / compte enfant : initialise le gamertag Xbox et, pour un
  compte mineur, configure la famille Microsoft.
- licence ou profil Java absent : vérifie la propriété de Minecraft: Java
  Edition et initialise le pseudo sur minecraft.net.

Le workflow de release vérifie la présence du GUID public, du scope Xbox, du
callback loopback et l'absence de l'ancien callback dans le bundle principal.
