# Catalogue de contenus

L’étape **Contenu** du Wizard permet de rechercher puis d’ajouter des mods,
packs de ressources et shaders sans saisir d’URL, de taille ou de SHA-256.

## Fournisseurs

- **Modrinth** est activé par défaut et utilise
  [l’API v2 officielle](https://docs.modrinth.com/api/) sans clé.
  La recherche est filtrée par type et version Minecraft, ainsi que par loader
  pour les mods. Le serveur sélectionne la version release compatible la plus
  récente, préfère son fichier principal et ajoute récursivement les dépendances
  déclarées `required` (32 maximum). Les packs et shaders ne sont pas filtrés
  par loader, car leurs versions peuvent annoncer des catégories comme Iris ou
  OptiFine plutôt que `minecraft`.
- **CurseForge** reste masqué tant que `CURSEFORGE_API_KEY` n’est pas défini.
  La clé est utilisée uniquement dans le runtime serveur. Les projets qui
  interdisent la distribution par un client tiers sont refusés. Avant
  activation, vérifie les
  [conditions de l’API tierce](https://support.curseforge.com/support/solutions/articles/9000207405-curseforge-3rd-party-api-terms-and-conditions)
  et la [documentation REST](https://docs.curseforge.com/rest-api/) associées à
  la clé délivrée pour l’application.

Chaque résultat conserve un lien vers sa fiche officielle afin de consulter la
licence, les auteurs et les conditions propres au projet. YourLauncher ne
réhéberge pas les fichiers.

## Variables d’environnement

```dotenv
CURSEFORGE_API_KEY="clé API serveur"
CONTENT_CATALOG_SIGNING_SECRET="secret aléatoire de 32 caractères minimum"
NEXT_PUBLIC_APP_URL="https://yourlauncher.example"
```

Le secret de signature dédié est recommandé. S’il est absent, `AUTH_SECRET` est
utilisé. Il doit rester stable entre les déploiements : toute rotation invalide
les URL CurseForge déjà présentes dans les manifestes. `NEXT_PUBLIC_APP_URL` est
obligatoire en production et doit être une origine HTTPS.

## Flux de sécurité

1. Les entrées des routes de recherche et de résolution sont validées par des
   schémas stricts et réservées aux utilisateurs connectés.
2. Seules les URL construites depuis les API officielles sont utilisées. Les
   fichiers Modrinth doivent venir de `cdn.modrinth.com`; les fichiers
   CurseForge d’un sous-domaine `forgecdn.net`. Chaque redirection est à nouveau
   contrôlée, ce qui empêche d’utiliser le catalogue comme relais SSRF.
3. Les réponses JSON sont limitées à 1 Mio et 8 secondes. Un fichier est limité
   à 512 Mio et à la taille annoncée. La résolution/hash dispose de 45 secondes.
   Le proxy CurseForge borne l’ouverture amont à 10 secondes puis laisse le flux
   progresser sous le contrôle de la durée maximale de la plateforme
   d’hébergement ; la taille reste contrôlée pendant toute la diffusion.
4. Le serveur calcule le SHA-256 en flux et vérifie aussi le SHA-512 Modrinth ou
   le SHA-1 CurseForge publié lorsqu’il existe. Le launcher conserve ensuite sa
   vérification SHA-256 habituelle.
5. Les recherches et résolutions Modrinth bénéficient d’un petit cache mémoire
   borné. Aucune réponse ou résolution CurseForge n’est mise en cache.
6. Depuis juillet 2026, le téléchargement CurseForge demande également la clé
   API. Le manifeste reçoit donc une URL HMAC limitée à un couple projet/fichier.
   Le proxy revalide les métadonnées à chaque requête, ajoute la clé au flux
   amont, applique une limite de débit et répond avec `Cache-Control: no-store`.

Les routes publiques du proxy ne permettent ni de choisir une URL, ni de
modifier le projet ou le fichier sans invalider la signature.

## Import manuel

L’import manuel est conservé sous **Importer un fichier manuellement (avancé)**.
Il est destiné aux contenus absents des fournisseurs. Dans ce mode seulement,
le propriétaire doit fournir le nom de fichier, l’URL HTTPS directe, la taille
exacte et le SHA-256 obtenu auprès de la source de confiance.
