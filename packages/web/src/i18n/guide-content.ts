import type { Locale } from "./config";

type GuideContent = {
  heroKicker: string;
  title: string;
  subtitle: string;
  creatorAction: string;
  playerAction: string;
  tocTitle: string;
  tocCreation: string;
  tocInstall: string;
  tocTroubleshoot: string;
  tocFaq: string;
  creatorKicker: string;
  creatorTitle: string;
  stepCount: string;
  steps: Array<{ title: string; desc: string; tip: string }>;
  playerKicker: string;
  playerTitle: string;
  playerIntro: string;
  playerSteps: string[];
  download: string;
  soon: string;
  troubleshootingKicker: string;
  troubleshootingTitle: string;
  troubleshooting: Array<{ title: string; desc: string; action: string }>;
  faqKicker: string;
  faqTitle: string;
  faq: Array<{ q: string; a: string }>;
  ctaTitle: string;
  ctaText: string;
  ctaButton: string;
};

const fr: GuideContent = {
  heroKicker: "Centre d’aide",
  title: "De l’idée au premier joueur, étape par étape",
  subtitle:
    "Un parcours clair pour créer, tester, publier et distribuer ton launcher — avec les réponses aux problèmes les plus fréquents.",
  creatorAction: "Je crée un launcher",
  playerAction: "J’installe l’application",
  tocTitle: "Dans ce guide",
  tocCreation: "Créer et publier",
  tocInstall: "Installer l’application",
  tocTroubleshoot: "Résoudre un problème",
  tocFaq: "Questions fréquentes",
  creatorKicker: "Parcours créateur",
  creatorTitle: "Créer un launcher fiable",
  stepCount: "9 étapes guidées",
  steps: [
    {
      title: "Choisir un modèle",
      desc: "Pars d’un univers cohérent : premium, survie, médiéval, pixel ou futuriste.",
      tip: "Tout reste modifiable ensuite.",
    },
    {
      title: "Définir l’identité",
      desc: "Choisis le nom public et un code court que les joueurs saisiront.",
      tip: "Exemple : nova-survival.",
    },
    {
      title: "Construire le design",
      desc: "Ajoute logo et fond, puis ajuste cadrage, voile, panneaux, police et densité.",
      tip: "Le mode « Examiner le fond » aide au cadrage.",
    },
    {
      title: "Configurer Minecraft",
      desc: "Sélectionne version, loader, adresse serveur, port et mémoire recommandée.",
      tip: "Vanilla, Fabric, Quilt, Forge et NeoForge.",
    },
    {
      title: "Ajouter les contenus",
      desc: "Déclare les mods, packs et shaders avec taille et empreinte SHA-256.",
      tip: "L’intégrité de chaque fichier est vérifiée.",
    },
    {
      title: "Préparer l’accueil",
      desc: "Publie des actualités utiles avant que le joueur clique sur Jouer.",
      tip: "Une actualité concise suffit pour démarrer.",
    },
    {
      title: "Relier la communauté",
      desc: "Ajoute Discord, site, support et l’ambiance animée adaptée.",
      tip: "N’affiche que les liens réellement maintenus.",
    },
    {
      title: "Planifier les opérations",
      desc: "Prépare alertes, maintenances, événements et notes de version.",
      tip: "Le joueur comprend immédiatement l’état du serveur.",
    },
    {
      title: "Tester puis publier",
      desc: "Ouvre l’aperçu plein écran, teste le code dans l’application et publie.",
      tip: "Une modification publiée arrive sans réinstaller l’app.",
    },
  ],
  playerKicker: "Parcours joueur",
  playerTitle: "Installer et rejoindre un serveur",
  playerIntro:
    "Une seule application pour tous les serveurs. Les mises à jour de YourLauncher et du contenu sont ensuite automatiques.",
  playerSteps: [
    "Télécharge et installe l’application Windows.",
    "Ouvre YourLauncher et connecte ton compte Microsoft ou un profil hors-ligne.",
    "Saisis le code communiqué par le créateur.",
    "Vérifie le nom et l’origine du manifeste, puis accorde ta confiance.",
    "Clique sur Jouer : Java, Minecraft et les contenus sont préparés automatiquement.",
  ],
  download: "Télécharger pour Windows",
  soon: "Version Windows bientôt disponible",
  troubleshootingKicker: "Diagnostic rapide",
  troubleshootingTitle: "Si quelque chose bloque",
  troubleshooting: [
    {
      title: "Le code est introuvable",
      desc: "Vérifie les tirets, la casse et que le projet est bien publié.",
      action: "Tester l’URL /api/manifest/code.",
    },
    {
      title: "Un fichier refuse de s’installer",
      desc: "La taille ou le SHA-256 ne correspond probablement pas au fichier distant.",
      action: "Recalculer l’empreinte et republier.",
    },
    {
      title: "Le jeu ne démarre pas",
      desc: "Ouvre Aide dans le launcher, lance la réparation et copie le diagnostic.",
      action: "Joindre le rapport au support.",
    },
    {
      title: "Le fond est mal cadré",
      desc: "Utilise le point focal, le mode Contenir et l’inspection du fond.",
      action: "Préférer une image 1920×1080.",
    },
  ],
  faqKicker: "Réponses précises",
  faqTitle: "Questions fréquentes",
  faq: [
    {
      q: "Est-ce réellement gratuit ?",
      a: "Oui. La création et la distribution sont gratuites, avec trois launchers par compte.",
    },
    {
      q: "Mes joueurs téléchargent-ils un launcher différent ?",
      a: "Non. Ils utilisent tous YourLauncher puis saisissent le code de ton projet.",
    },
    {
      q: "Comment une modification arrive-t-elle chez les joueurs ?",
      a: "Après publication, le manifeste distant est relu au lancement. Aucun nouvel installateur n’est nécessaire.",
    },
    {
      q: "Quels loaders sont supportés ?",
      a: "Vanilla, Fabric, Quilt, Forge et NeoForge.",
    },
    {
      q: "Java doit-il être installé manuellement ?",
      a: "Non. La bonne version est détectée et installée par l’application.",
    },
    {
      q: "Pourquoi le SHA-256 est-il obligatoire ?",
      a: "Il garantit que le fichier téléchargé est exactement celui que le créateur a déclaré.",
    },
    {
      q: "Puis-je changer le design après publication ?",
      a: "Oui. Les couleurs, visuels, panneaux et contenus restent modifiables à tout moment.",
    },
    {
      q: "L’application se met-elle à jour seule ?",
      a: "Oui. Elle télécharge la nouvelle version en arrière-plan et l’installe automatiquement à la fermeture.",
    },
    {
      q: "Un serveur privé est-il possible ?",
      a: "Oui. Tu peux diffuser le code uniquement aux joueurs autorisés et ne publier aucun lien public.",
    },
    {
      q: "Où trouver un rapport en cas d’erreur ?",
      a: "Dans l’onglet Aide du launcher : copie le diagnostic après avoir essayé la réparation.",
    },
  ],
  ctaTitle: "Ton premier launcher peut commencer maintenant",
  ctaText: "Le parcours de création sauvegarde ton travail à chaque étape.",
  ctaButton: "Créer mon launcher",
};

const en: GuideContent = {
  ...fr,
  heroKicker: "Help center",
  title: "From idea to first player, step by step",
  subtitle:
    "A clear path to create, test, publish and distribute your launcher, with answers to common issues.",
  creatorAction: "Create a launcher",
  playerAction: "Install the app",
  tocTitle: "In this guide",
  tocCreation: "Create and publish",
  tocInstall: "Install the app",
  tocTroubleshoot: "Fix an issue",
  tocFaq: "Frequently asked questions",
  creatorKicker: "Creator path",
  creatorTitle: "Build a reliable launcher",
  stepCount: "9 guided steps",
  steps: [
    {
      title: "Choose a template",
      desc: "Start with a coherent premium, survival, medieval, pixel or futuristic world.",
      tip: "Everything remains editable.",
    },
    {
      title: "Define the identity",
      desc: "Choose the public name and a short code players will enter.",
      tip: "Example: nova-survival.",
    },
    {
      title: "Build the design",
      desc: "Add logo and background, then tune framing, overlay, panels, font and density.",
      tip: "Use Inspect background for precise framing.",
    },
    {
      title: "Configure Minecraft",
      desc: "Select version, loader, server address, port and recommended memory.",
      tip: "Vanilla, Fabric, Quilt, Forge and NeoForge.",
    },
    {
      title: "Add content",
      desc: "Declare mods, packs and shaders with their size and SHA-256 fingerprint.",
      tip: "Every file is integrity-checked.",
    },
    {
      title: "Prepare the home page",
      desc: "Publish useful news before players click Play.",
      tip: "One concise item is enough to start.",
    },
    {
      title: "Connect the community",
      desc: "Add Discord, website, support and a matching animated ambiance.",
      tip: "Only show links you actively maintain.",
    },
    {
      title: "Plan operations",
      desc: "Prepare alerts, maintenance, events and release notes.",
      tip: "Players instantly understand server status.",
    },
    {
      title: "Test and publish",
      desc: "Open the full preview, test the code in the app, then publish.",
      tip: "Published edits require no app reinstall.",
    },
  ],
  playerKicker: "Player path",
  playerTitle: "Install and join a server",
  playerIntro:
    "One app for every server. YourLauncher and content updates are automatic afterwards.",
  playerSteps: [
    "Download and install the Windows app.",
    "Open YourLauncher and sign in with Microsoft or an offline profile.",
    "Enter the code supplied by the creator.",
    "Check the manifest name and origin, then trust it.",
    "Click Play: Java, Minecraft and content are prepared automatically.",
  ],
  download: "Download for Windows",
  soon: "Windows version coming soon",
  troubleshootingKicker: "Quick diagnosis",
  troubleshootingTitle: "When something gets stuck",
  troubleshooting: [
    {
      title: "Code not found",
      desc: "Check dashes, casing and that the project is published.",
      action: "Test /api/manifest/code.",
    },
    {
      title: "A file will not install",
      desc: "Its size or SHA-256 probably differs from the remote file.",
      action: "Recompute the hash and publish again.",
    },
    {
      title: "The game will not start",
      desc: "Open Help in the launcher, repair, then copy the diagnosis.",
      action: "Attach the report to support.",
    },
    {
      title: "Background is poorly framed",
      desc: "Use the focal point, Contain mode and background inspection.",
      action: "Prefer a 1920×1080 image.",
    },
  ],
  faqKicker: "Precise answers",
  faqTitle: "Frequently asked questions",
  faq: [
    {
      q: "Is it really free?",
      a: "Yes. Creation and distribution are free, with three launchers per account.",
    },
    {
      q: "Do players download a different launcher?",
      a: "No. Everyone uses YourLauncher and enters your project code.",
    },
    {
      q: "How do edits reach players?",
      a: "After publishing, the remote manifest is read at launch. No new installer is needed.",
    },
    {
      q: "Which loaders are supported?",
      a: "Vanilla, Fabric, Quilt, Forge and NeoForge.",
    },
    {
      q: "Must Java be installed manually?",
      a: "No. The correct version is detected and installed by the app.",
    },
    {
      q: "Why is SHA-256 required?",
      a: "It guarantees the downloaded file is exactly the one declared by the creator.",
    },
    {
      q: "Can I change the design after publishing?",
      a: "Yes. Colors, visuals, panels and content remain editable.",
    },
    {
      q: "Does the app update itself?",
      a: "Yes. It downloads updates in the background and installs them automatically on exit.",
    },
    {
      q: "Can I run a private server?",
      a: "Yes. Share the code only with authorized players and publish no public link.",
    },
    {
      q: "Where is the error report?",
      a: "In the launcher's Help tab: copy the diagnosis after trying repair.",
    },
  ],
  ctaTitle: "Start your first launcher now",
  ctaText: "The creation flow saves your work at every step.",
  ctaButton: "Create my launcher",
};

const es: GuideContent = {
  ...en,
  heroKicker: "Centro de ayuda",
  title: "De la idea al primer jugador, paso a paso",
  subtitle:
    "Un recorrido claro para crear, probar, publicar y distribuir tu launcher.",
  creatorAction: "Crear un launcher",
  playerAction: "Instalar la aplicación",
  tocTitle: "En esta guía",
  tocCreation: "Crear y publicar",
  tocInstall: "Instalar la aplicación",
  tocTroubleshoot: "Resolver un problema",
  tocFaq: "Preguntas frecuentes",
  creatorKicker: "Recorrido del creador",
  creatorTitle: "Crear un launcher fiable",
  stepCount: "9 pasos guiados",
  steps: [
    {
      title: "Elegir una plantilla",
      desc: "Parte de un universo premium, survival, medieval, pixel o futurista.",
      tip: "Todo se puede modificar.",
    },
    {
      title: "Definir la identidad",
      desc: "Elige el nombre público y un código corto para los jugadores.",
      tip: "Ejemplo: nova-survival.",
    },
    {
      title: "Crear el diseño",
      desc: "Añade logo y fondo; ajusta encuadre, velo, paneles, fuente y densidad.",
      tip: "Usa Examinar el fondo.",
    },
    {
      title: "Configurar Minecraft",
      desc: "Selecciona versión, loader, servidor, puerto y memoria.",
      tip: "Vanilla, Fabric, Quilt, Forge y NeoForge.",
    },
    {
      title: "Añadir contenidos",
      desc: "Declara mods, packs y shaders con tamaño y SHA-256.",
      tip: "Cada archivo se verifica.",
    },
    {
      title: "Preparar la portada",
      desc: "Publica noticias útiles antes de que el jugador pulse Jugar.",
      tip: "Una noticia breve es suficiente.",
    },
    {
      title: "Conectar la comunidad",
      desc: "Añade Discord, web, soporte y ambiente animado.",
      tip: "Muestra solo enlaces mantenidos.",
    },
    {
      title: "Planificar operaciones",
      desc: "Prepara alertas, mantenimientos, eventos y notas.",
      tip: "El estado queda claro.",
    },
    {
      title: "Probar y publicar",
      desc: "Abre la vista completa, prueba el código y publica.",
      tip: "Los cambios no requieren reinstalar.",
    },
  ],
  playerKicker: "Recorrido del jugador",
  playerTitle: "Instalar y entrar en un servidor",
  playerIntro:
    "Una sola aplicación para todos los servidores, con actualizaciones automáticas.",
  playerSteps: [
    "Descarga e instala la aplicación de Windows.",
    "Abre YourLauncher e inicia sesión.",
    "Introduce el código del creador.",
    "Verifica y acepta el manifiesto.",
    "Pulsa Jugar: todo se prepara automáticamente.",
  ],
  download: "Descargar para Windows",
  soon: "Versión de Windows próximamente",
  troubleshootingKicker: "Diagnóstico rápido",
  troubleshootingTitle: "Si algo se bloquea",
  troubleshooting: [
    {
      title: "Código no encontrado",
      desc: "Comprueba guiones, mayúsculas y publicación.",
      action: "Prueba /api/manifest/código.",
    },
    {
      title: "Un archivo no se instala",
      desc: "El tamaño o SHA-256 no coincide.",
      action: "Recalcula y publica.",
    },
    {
      title: "El juego no arranca",
      desc: "Repara desde Ayuda y copia el diagnóstico.",
      action: "Adjunta el informe.",
    },
    {
      title: "Fondo mal encuadrado",
      desc: "Usa el punto focal, Contener y la inspección.",
      action: "Prefiere 1920×1080.",
    },
  ],
  faqKicker: "Respuestas precisas",
  faqTitle: "Preguntas frecuentes",
  faq: [
    { q: "¿Es realmente gratis?", a: "Sí, con tres launchers por cuenta." },
    {
      q: "¿Cada servidor requiere otra aplicación?",
      a: "No, todos usan YourLauncher y un código.",
    },
    {
      q: "¿Cómo llegan los cambios?",
      a: "El manifiesto remoto se recarga al iniciar.",
    },
    {
      q: "¿Qué loaders se admiten?",
      a: "Vanilla, Fabric, Quilt, Forge y NeoForge.",
    },
    {
      q: "¿Hay que instalar Java?",
      a: "No, la aplicación instala la versión correcta.",
    },
    {
      q: "¿Por qué SHA-256?",
      a: "Garantiza la integridad exacta de cada archivo.",
    },
    {
      q: "¿Puedo cambiar el diseño publicado?",
      a: "Sí, en cualquier momento.",
    },
    {
      q: "¿La aplicación se actualiza sola?",
      a: "Sí, descarga en segundo plano e instala al cerrar.",
    },
    {
      q: "¿Puedo crear un servidor privado?",
      a: "Sí, comparte el código solo con autorizados.",
    },
    {
      q: "¿Dónde está el informe de error?",
      a: "En la pestaña Ayuda del launcher.",
    },
  ],
  ctaTitle: "Empieza ahora tu primer launcher",
  ctaText: "El recorrido guarda tu trabajo en cada paso.",
  ctaButton: "Crear mi launcher",
};

const de: GuideContent = {
  ...en,
  heroKicker: "Hilfe-Center",
  title: "Von der Idee zum ersten Spieler – Schritt für Schritt",
  subtitle:
    "Ein klarer Weg zum Erstellen, Testen, Veröffentlichen und Verteilen.",
  creatorAction: "Launcher erstellen",
  playerAction: "App installieren",
  tocTitle: "In diesem Leitfaden",
  tocCreation: "Erstellen und veröffentlichen",
  tocInstall: "App installieren",
  tocTroubleshoot: "Problem lösen",
  tocFaq: "Häufige Fragen",
  creatorKicker: "Ersteller-Pfad",
  creatorTitle: "Einen zuverlässigen Launcher bauen",
  stepCount: "9 geführte Schritte",
  steps: [
    {
      title: "Vorlage wählen",
      desc: "Starte mit Premium, Survival, Mittelalter, Pixel oder Zukunft.",
      tip: "Alles bleibt anpassbar.",
    },
    {
      title: "Identität festlegen",
      desc: "Wähle Namen und einen kurzen Spieler-Code.",
      tip: "Beispiel: nova-survival.",
    },
    {
      title: "Design gestalten",
      desc: "Logo, Hintergrund, Ausschnitt, Overlay, Panels, Schrift und Dichte.",
      tip: "Nutze Hintergrund prüfen.",
    },
    {
      title: "Minecraft einrichten",
      desc: "Version, Loader, Server, Port und Speicher wählen.",
      tip: "Vanilla, Fabric, Quilt, Forge, NeoForge.",
    },
    {
      title: "Inhalte hinzufügen",
      desc: "Mods, Packs und Shader mit Größe und SHA-256 angeben.",
      tip: "Jede Datei wird geprüft.",
    },
    {
      title: "Startseite vorbereiten",
      desc: "Veröffentliche hilfreiche Neuigkeiten.",
      tip: "Ein kurzer Beitrag reicht.",
    },
    {
      title: "Community verbinden",
      desc: "Discord, Website, Support und Atmosphäre hinzufügen.",
      tip: "Nur gepflegte Links zeigen.",
    },
    {
      title: "Betrieb planen",
      desc: "Warnungen, Wartung, Events und Notizen vorbereiten.",
      tip: "Der Status ist sofort klar.",
    },
    {
      title: "Testen und veröffentlichen",
      desc: "Vorschau öffnen, Code testen und publizieren.",
      tip: "Keine Neuinstallation nötig.",
    },
  ],
  playerKicker: "Spieler-Pfad",
  playerTitle: "Installieren und Server beitreten",
  playerIntro: "Eine App für alle Server mit automatischen Updates.",
  playerSteps: [
    "Windows-App laden und installieren.",
    "YourLauncher öffnen und anmelden.",
    "Code des Erstellers eingeben.",
    "Manifest prüfen und vertrauen.",
    "Spielen klicken – alles wird vorbereitet.",
  ],
  download: "Für Windows herunterladen",
  soon: "Windows-Version bald verfügbar",
  troubleshootingKicker: "Schnelldiagnose",
  troubleshootingTitle: "Wenn etwas blockiert",
  troubleshooting: [
    {
      title: "Code nicht gefunden",
      desc: "Bindestriche, Schreibweise und Veröffentlichung prüfen.",
      action: "/api/manifest/code testen.",
    },
    {
      title: "Datei installiert nicht",
      desc: "Größe oder SHA-256 stimmt nicht.",
      action: "Hash neu berechnen.",
    },
    {
      title: "Spiel startet nicht",
      desc: "Unter Hilfe reparieren und Diagnose kopieren.",
      action: "Bericht an Support senden.",
    },
    {
      title: "Hintergrund falsch",
      desc: "Fokus, Einpassen und Prüfung verwenden.",
      action: "1920×1080 bevorzugen.",
    },
  ],
  faqKicker: "Klare Antworten",
  faqTitle: "Häufige Fragen",
  faq: [
    { q: "Ist es wirklich kostenlos?", a: "Ja, mit drei Launchern pro Konto." },
    {
      q: "Braucht jeder Server eine andere App?",
      a: "Nein, alle nutzen YourLauncher und einen Code.",
    },
    {
      q: "Wie kommen Änderungen an?",
      a: "Das entfernte Manifest wird beim Start neu geladen.",
    },
    {
      q: "Welche Loader werden unterstützt?",
      a: "Vanilla, Fabric, Quilt, Forge und NeoForge.",
    },
    {
      q: "Muss Java installiert werden?",
      a: "Nein, die App installiert die richtige Version.",
    },
    { q: "Warum SHA-256?", a: "Damit jede Datei exakt und unverändert ist." },
    { q: "Kann ich das Design später ändern?", a: "Ja, jederzeit." },
    {
      q: "Aktualisiert sich die App selbst?",
      a: "Ja, im Hintergrund und automatisch beim Beenden.",
    },
    {
      q: "Sind private Server möglich?",
      a: "Ja, teile den Code nur mit Berechtigten.",
    },
    { q: "Wo ist der Fehlerbericht?", a: "Im Hilfe-Tab des Launchers." },
  ],
  ctaTitle: "Starte jetzt deinen ersten Launcher",
  ctaText: "Deine Arbeit wird bei jedem Schritt gespeichert.",
  ctaButton: "Launcher erstellen",
};

const pt: GuideContent = {
  heroKicker: "Central de ajuda",
  title: "Da ideia ao primeiro jogador, passo a passo",
  subtitle:
    "Um percurso claro para criar, testar, publicar e distribuir o launcher, com respostas para os problemas mais comuns.",
  creatorAction: "Criar um launcher",
  playerAction: "Instalar o aplicativo",
  tocTitle: "Neste guia",
  tocCreation: "Criar e publicar",
  tocInstall: "Instalar o aplicativo",
  tocTroubleshoot: "Resolver um problema",
  tocFaq: "Perguntas frequentes",
  creatorKicker: "Percurso do criador",
  creatorTitle: "Criar um launcher confiável",
  stepCount: "9 etapas guiadas",
  steps: [
    {
      title: "Escolher um modelo",
      desc: "Comece com um universo premium, sobrevivência, medieval, pixel ou futurista.",
      tip: "Tudo continuará editável.",
    },
    {
      title: "Definir a identidade",
      desc: "Escolha o nome público e um código curto que os jogadores digitarão.",
      tip: "Exemplo: nova-survival.",
    },
    {
      title: "Criar o design",
      desc: "Adicione logo e fundo; ajuste enquadramento, sobreposição, painéis, fonte e densidade.",
      tip: "Use Examinar fundo para ajustar o enquadramento.",
    },
    {
      title: "Configurar o Minecraft",
      desc: "Selecione versão, loader, endereço do servidor, porta e memória recomendada.",
      tip: "Vanilla, Fabric, Quilt, Forge e NeoForge.",
    },
    {
      title: "Adicionar conteúdos",
      desc: "Declare mods, pacotes e shaders com tamanho e impressão SHA-256.",
      tip: "A integridade de cada arquivo é verificada.",
    },
    {
      title: "Preparar a página inicial",
      desc: "Publique notícias úteis antes que o jogador clique em Jogar.",
      tip: "Uma notícia curta é suficiente para começar.",
    },
    {
      title: "Conectar a comunidade",
      desc: "Adicione Discord, site, suporte e uma atmosfera animada adequada.",
      tip: "Mostre apenas links realmente mantidos.",
    },
    {
      title: "Planejar as operações",
      desc: "Prepare alertas, manutenções, eventos e notas de versão.",
      tip: "O jogador entende imediatamente o estado do servidor.",
    },
    {
      title: "Testar e publicar",
      desc: "Abra a visualização completa, teste o código no aplicativo e publique.",
      tip: "Alterações publicadas não exigem reinstalação.",
    },
  ],
  playerKicker: "Percurso do jogador",
  playerTitle: "Instalar e entrar em um servidor",
  playerIntro:
    "Um único aplicativo para todos os servidores, com atualizações automáticas.",
  playerSteps: [
    "Baixe e instale o aplicativo para Windows.",
    "Abra o YourLauncher e entre com a Microsoft ou com um perfil offline.",
    "Digite o código fornecido pelo criador.",
    "Verifique o nome e a origem do manifesto e confirme a confiança.",
    "Clique em Jogar: Java, Minecraft e os conteúdos serão preparados automaticamente.",
  ],
  download: "Baixar para Windows",
  soon: "Versão Windows em breve",
  troubleshootingKicker: "Diagnóstico rápido",
  troubleshootingTitle: "Se algo travar",
  troubleshooting: [
    {
      title: "Código não encontrado",
      desc: "Verifique hífens, letras maiúsculas e se o projeto foi publicado.",
      action: "Teste /api/manifest/código.",
    },
    {
      title: "Um arquivo não é instalado",
      desc: "O tamanho ou SHA-256 provavelmente não corresponde ao arquivo remoto.",
      action: "Recalcule a impressão e publique novamente.",
    },
    {
      title: "O jogo não inicia",
      desc: "Abra Ajuda no launcher, execute o reparo e copie o diagnóstico.",
      action: "Anexe o relatório ao suporte.",
    },
    {
      title: "O fundo está mal enquadrado",
      desc: "Use o ponto focal, o modo Conter e a inspeção do fundo.",
      action: "Prefira uma imagem 1920×1080.",
    },
  ],
  faqKicker: "Respostas claras",
  faqTitle: "Perguntas frequentes",
  faq: [
    {
      q: "É realmente gratuito?",
      a: "Sim. A criação e a distribuição são gratuitas, com três launchers por conta.",
    },
    {
      q: "Cada servidor exige outro aplicativo?",
      a: "Não. Todos usam o YourLauncher e digitam o código do projeto.",
    },
    {
      q: "Como as alterações chegam aos jogadores?",
      a: "Após a publicação, o manifesto remoto é relido ao iniciar. Não é preciso outro instalador.",
    },
    {
      q: "Quais loaders são compatíveis?",
      a: "Vanilla, Fabric, Quilt, Forge e NeoForge.",
    },
    {
      q: "É preciso instalar o Java manualmente?",
      a: "Não. A versão correta é detectada e instalada pelo aplicativo.",
    },
    {
      q: "Por que o SHA-256 é obrigatório?",
      a: "Ele garante que o arquivo baixado é exatamente o declarado pelo criador.",
    },
    {
      q: "Posso mudar o design depois de publicar?",
      a: "Sim. Cores, imagens, painéis e conteúdos continuam editáveis.",
    },
    {
      q: "O aplicativo se atualiza sozinho?",
      a: "Sim. Ele baixa a atualização em segundo plano e a instala automaticamente ao fechar.",
    },
    {
      q: "Posso criar um servidor privado?",
      a: "Sim. Compartilhe o código apenas com jogadores autorizados e não publique links.",
    },
    {
      q: "Onde encontro o relatório de erro?",
      a: "Na aba Ajuda do launcher: copie o diagnóstico depois de tentar o reparo.",
    },
  ],
  ctaTitle: "Comece agora o seu primeiro launcher",
  ctaText: "O percurso salva seu trabalho em cada etapa.",
  ctaButton: "Criar meu launcher",
};

const it: GuideContent = {
  heroKicker: "Centro assistenza",
  title: "Dall’idea al primo giocatore, passo dopo passo",
  subtitle:
    "Un percorso chiaro per creare, testare, pubblicare e distribuire il launcher, con risposte ai problemi più comuni.",
  creatorAction: "Crea un launcher",
  playerAction: "Installa l’app",
  tocTitle: "In questa guida",
  tocCreation: "Creare e pubblicare",
  tocInstall: "Installare l’app",
  tocTroubleshoot: "Risolvere un problema",
  tocFaq: "Domande frequenti",
  creatorKicker: "Percorso creatore",
  creatorTitle: "Creare un launcher affidabile",
  stepCount: "9 passaggi guidati",
  steps: [
    {
      title: "Scegliere un modello",
      desc: "Parti da un universo premium, survival, medievale, pixel o futuristico.",
      tip: "Tutto resterà modificabile.",
    },
    {
      title: "Definire l’identità",
      desc: "Scegli il nome pubblico e un codice breve che i giocatori inseriranno.",
      tip: "Esempio: nova-survival.",
    },
    {
      title: "Creare il design",
      desc: "Aggiungi logo e sfondo, poi regola inquadratura, velo, pannelli, font e densità.",
      tip: "Usa Esamina sfondo per un’inquadratura precisa.",
    },
    {
      title: "Configurare Minecraft",
      desc: "Seleziona versione, loader, indirizzo server, porta e memoria consigliata.",
      tip: "Vanilla, Fabric, Quilt, Forge e NeoForge.",
    },
    {
      title: "Aggiungere i contenuti",
      desc: "Dichiara mod, pacchetti e shader con dimensione e impronta SHA-256.",
      tip: "L’integrità di ogni file viene verificata.",
    },
    {
      title: "Preparare la home",
      desc: "Pubblica notizie utili prima che il giocatore prema Gioca.",
      tip: "Una notizia breve basta per iniziare.",
    },
    {
      title: "Collegare la community",
      desc: "Aggiungi Discord, sito, assistenza e un’atmosfera animata adatta.",
      tip: "Mostra solo i link che mantieni davvero.",
    },
    {
      title: "Pianificare le operazioni",
      desc: "Prepara avvisi, manutenzioni, eventi e note di versione.",
      tip: "Lo stato del server è subito comprensibile.",
    },
    {
      title: "Testare e pubblicare",
      desc: "Apri l’anteprima completa, prova il codice nell’app e pubblica.",
      tip: "Le modifiche pubblicate non richiedono reinstallazione.",
    },
  ],
  playerKicker: "Percorso giocatore",
  playerTitle: "Installare ed entrare in un server",
  playerIntro: "Una sola app per tutti i server, con aggiornamenti automatici.",
  playerSteps: [
    "Scarica e installa l’applicazione Windows.",
    "Apri YourLauncher e accedi con Microsoft o con un profilo offline.",
    "Inserisci il codice fornito dal creatore.",
    "Controlla nome e origine del manifesto, quindi conferma la fiducia.",
    "Premi Gioca: Java, Minecraft e i contenuti saranno preparati automaticamente.",
  ],
  download: "Scarica per Windows",
  soon: "Versione Windows in arrivo",
  troubleshootingKicker: "Diagnosi rapida",
  troubleshootingTitle: "Se qualcosa si blocca",
  troubleshooting: [
    {
      title: "Codice non trovato",
      desc: "Controlla trattini, maiuscole e che il progetto sia pubblicato.",
      action: "Prova /api/manifest/codice.",
    },
    {
      title: "Un file non si installa",
      desc: "La dimensione o l’SHA-256 probabilmente non corrisponde al file remoto.",
      action: "Ricalcola l’impronta e ripubblica.",
    },
    {
      title: "Il gioco non parte",
      desc: "Apri Aiuto nel launcher, esegui la riparazione e copia la diagnosi.",
      action: "Allega il rapporto all’assistenza.",
    },
    {
      title: "Lo sfondo è inquadrato male",
      desc: "Usa il punto focale, il modo Contieni e l’ispezione dello sfondo.",
      action: "Preferisci un’immagine 1920×1080.",
    },
  ],
  faqKicker: "Risposte precise",
  faqTitle: "Domande frequenti",
  faq: [
    {
      q: "È davvero gratuito?",
      a: "Sì. Creazione e distribuzione sono gratuite, con tre launcher per account.",
    },
    {
      q: "Ogni server richiede un’app diversa?",
      a: "No. Tutti usano YourLauncher e inseriscono il codice del progetto.",
    },
    {
      q: "Come arrivano le modifiche ai giocatori?",
      a: "Dopo la pubblicazione, il manifesto remoto viene riletto all’avvio. Non serve un nuovo installer.",
    },
    {
      q: "Quali loader sono supportati?",
      a: "Vanilla, Fabric, Quilt, Forge e NeoForge.",
    },
    {
      q: "Java va installato manualmente?",
      a: "No. La versione corretta viene rilevata e installata dall’app.",
    },
    {
      q: "Perché l’SHA-256 è obbligatorio?",
      a: "Garantisce che il file scaricato sia esattamente quello dichiarato dal creatore.",
    },
    {
      q: "Posso cambiare il design dopo la pubblicazione?",
      a: "Sì. Colori, immagini, pannelli e contenuti restano modificabili.",
    },
    {
      q: "L’applicazione si aggiorna da sola?",
      a: "Sì. Scarica in background e installa automaticamente alla chiusura.",
    },
    {
      q: "Posso creare un server privato?",
      a: "Sì. Condividi il codice solo con giocatori autorizzati e non pubblicare link.",
    },
    {
      q: "Dove trovo il rapporto di errore?",
      a: "Nella scheda Aiuto del launcher: copia la diagnosi dopo la riparazione.",
    },
  ],
  ctaTitle: "Inizia ora il tuo primo launcher",
  ctaText: "Il percorso salva il lavoro a ogni passaggio.",
  ctaButton: "Crea il mio launcher",
};

const content: Record<Locale, GuideContent> = { fr, en, es, de, pt, it };

export function getGuideContent(locale: Locale): GuideContent {
  return content[locale] ?? fr;
}
