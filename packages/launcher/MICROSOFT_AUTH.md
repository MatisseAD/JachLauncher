# Configuration Microsoft du launcher

YourLauncher est une application de bureau publique. Elle n'utilise et ne doit
jamais recevoir de secret client.

## Inscription Azure

1. Crée une inscription d'application qui accepte les **comptes Microsoft
   personnels**. Le type de comptes doit être « Comptes Microsoft personnels
   uniquement » ou « Comptes dans un annuaire organisationnel et comptes
   Microsoft personnels » ; une application mono-tenant ne fonctionnera pas
   avec l'autorité `consumers` du launcher.
2. Dans **Authentification** > **Ajouter une plateforme**, sélectionne
   **Applications mobiles et de bureau**.
3. Ajoute exactement l'URI de redirection `http://localhost`.
4. Active **Autoriser les flux de clients publics**.
5. Copie uniquement l'**ID d'application (client)** au format GUID dans la
   variable Actions `JACH_AZURE_CLIENT_ID` ou dans la variable d'environnement
   locale du même nom. L'ancien nom `JACH_ID` est accepté comme alias, mais le
   nom canonique est prioritaire si les deux sont définis.

N'ajoute ni secret, ni certificat d'application. Ne configure pas l'ancien
callback `https://login.live.com/oauth20_desktop.srf` : il appartenait au flux
embarqué historique et n'est plus utilisé.

## Flux réellement exécuté

- `@azure/msal-node` vise l'autorité `consumers` et demande
  `XboxLive.signin offline_access`.
- Le navigateur **système** ouvre la page Microsoft.
- Le client crée un port aléatoire lié à `127.0.0.1` et, lorsqu'IPv6 est
  disponible, au même port sur `::1`. Il envoie une redirect URI
  `http://localhost:<port>` compatible avec l'inscription `http://localhost`
  des applications de bureau. Chrome peut donc résoudre `localhost` en IPv4 ou
  en IPv6 sans perdre le callback.
- Chaque tentative possède un `state`, un `nonce` et un couple PKCE S256
  uniques. Le callback vérifie le `state` avant tout échange du code.
- Après réception, le navigateur retire le code de sa barre d'adresse, affiche
  une confirmation locale refermable et laisse l'application terminer les
  échanges Xbox/Minecraft.
- Le cache MSAL contenant les refresh tokens est chiffré via les API
  asynchrones Electron `safeStorage` dans le dossier `userData`. Aucun repli en
  clair n'existe. Le logout retire les comptes MSAL et supprime ce fichier.
- Le jeton Microsoft est ensuite échangé en mémoire contre Xbox Live, XSTS et
  Minecraft. Aucun code ou jeton n'est écrit dans les logs.

## Erreurs de configuration courantes

- `AADSTS50011` : `http://localhost` n'est pas enregistré sous la plateforme
  **Applications mobiles et de bureau**. Supprime aussi tout doublon localhost
  enregistré sous une plateforme Web ou SPA, puis attends quelques minutes
  après l'enregistrement Azure.
- `AADSTS700016` : le GUID ne correspond pas à l'inscription attendue.
- `unauthorized_client` : le flux de client public ou les comptes personnels ne
  sont pas autorisés.
- `Invalid app registration` après le succès Microsoft/Xbox : les nouveaux IDs
  d'application doivent être examinés et ajoutés à la liste d'autorisation des
  API Java par Mojang. Suis la procédure officielle
  [Java Edition Game Service API Review or Application Process](https://help.minecraft.net/hc/en-us/articles/16254801392141).
  Ce contrôle est côté Minecraft Services et ne peut pas être contourné dans le
  launcher.
- profil Xbox absent / compte enfant : initialise le gamertag Xbox et, pour un
  compte mineur, configure la famille Microsoft.
- licence ou profil Java absent : vérifie la propriété de Minecraft: Java
  Edition et initialise le pseudo sur minecraft.net.

Le workflow de release vérifie la présence du GUID public, du scope Xbox, du
callback loopback et l'absence de l'ancien callback dans le bundle principal.
Il accepte la variable Actions canonique `JACH_AZURE_CLIENT_ID` ou l'alias
`JACH_ID`.
