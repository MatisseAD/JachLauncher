import type { Locale } from "./config";

// Dictionnaire français = source de vérité (définit le type Dict).
const fr = {
  nav: {
    features: "Fonctionnalités",
    help: "Aide",
    login: "Connexion",
    register: "Créer un compte",
    dashboard: "Mes launchers",
    account: "Compte",
    logout: "Déconnexion",
  },
  hero: {
    badge: "100% gratuit · pour tout le monde",
    titleLine1: "Crée ton launcher Minecraft",
    titleHighlight: "gratuitement",
    titleLine2: "en quelques minutes",
    subtitle:
      "Configure l'apparence, les versions, les mods et les actualités, puis génère ton launcher. Aucune carte bancaire : tu peux gérer jusqu'à 3 launchers gratuitement.",
    ctaPrimary: "Créer mon launcher",
    ctaSecondary: "Voir un exemple",
    perk1: "Sans coder",
    perk2: "Aperçu en direct",
    perk3: "Fabric, Forge, Quilt & NeoForge",
  },
  free: {
    eyebrow: "Gratuit, vraiment",
    title: "Gratuit pour tout le monde, pour toujours",
    subtitle:
      "Pas d'abonnement ni de fonctionnalités payantes cachées. Crée et gère jusqu'à 3 launchers gratuitement.",
    b1: "0 € — aucune carte bancaire",
    b2: "Jusqu'à 3 launchers",
    b3: "Toutes les fonctionnalités, pour tous",
  },
  features: {
    title: "Tout ce qu'il faut pour un vrai launcher",
    subtitle:
      "Une interface simple et puissante, pensée pour les serveurs Minecraft.",
    items: [
      {
        icon: "🎨",
        title: "Branding total",
        desc: "Logo, fond, couleurs, style des boutons et thème — appliqués au runtime chez tes joueurs.",
      },
      {
        icon: "🧩",
        title: "Mods & ressources",
        desc: "Mods, resource packs et shaders installés automatiquement. Fabric, Forge, Quilt, NeoForge.",
      },
      {
        icon: "📰",
        title: "Actualités intégrées",
        desc: "Annonce events, mises à jour et patch notes directement dans le launcher.",
      },
      {
        icon: "🚀",
        title: "Java automatique",
        desc: "Le bon Java est détecté et installé tout seul. Tes joueurs n'ont rien à configurer.",
      },
    ],
  },
  how: {
    eyebrow: "Simple comme bonjour",
    title: "Je choisis, je personnalise, je génère",
    steps: [
      {
        title: "Crée & personnalise",
        desc: "Choisis un modèle, ton logo, tes couleurs, ta version et tes mods.",
      },
      {
        title: "Prévisualise en direct",
        desc: "Tu vois exactement ce que verront tes joueurs, en temps réel.",
      },
      {
        title: "Partage le code",
        desc: "Tes joueurs entrent le code dans le launcher et jouent. C'est tout.",
      },
    ],
  },
  ctaBottom: {
    title: "Prêt à lancer le tien ?",
    subtitle:
      "Gratuit, sans engagement. Crée ton premier launcher en quelques minutes.",
    button: "Commencer gratuitement",
  },
  footer: {
    tagline: "Crée ton launcher Minecraft personnalisé, gratuitement.",
    colProduct: "Produit",
    colResources: "Ressources",
    colLanguage: "Langue",
    linkFeatures: "Fonctionnalités",
    linkExample: "Exemple",
    linkHelp: "Aide",
    linkCreate: "Créer un launcher",
    rights: "Fait avec ⛏️ pour la communauté Minecraft.",
    freeNote: "Gratuit pour tout le monde.",
  },
  auth: {
    loginTitle: "Connexion",
    registerTitle: "Créer un compte gratuit",
    usernameLabel: "Nom d'utilisateur",
    usernameHint: "3-32 caractères : a-z, 0-9, _ -",
    passwordLabel: "Mot de passe",
    passwordHint: "Minimum 8 caractères.",
    login: "Se connecter",
    register: "Créer mon compte gratuit",
    loggingIn: "Connexion…",
    creating: "Création…",
    noAccount: "Pas de compte ?",
    createOne: "Créer un compte gratuit",
    haveAccount: "Déjà un compte ?",
    signIn: "Se connecter",
    errLogin: "Identifiants incorrects",
    errRegister: "Erreur lors de l'inscription",
  },
  dashboard: {
    title: "Mes launchers",
    launchersCount: "launcher(s)",
    publishedCount: "publié(s)",
    newBtn: "+ Nouveau launcher",
    emptyTitle: "Aucun launcher pour l'instant",
    emptyDesc:
      "Crée ton premier launcher personnalisé en quelques minutes. C'est gratuit.",
    emptyBtn: "Créer mon premier launcher",
  },
  help: {
    title: "Comment créer ton launcher",
    subtitle:
      "En quelques étapes simples, sans aucune connaissance technique. Et c'est gratuit.",
    steps: [
      {
        title: "Crée ton launcher",
        desc: "Depuis le tableau de bord, clique sur « Nouveau launcher ». Donne-lui un nom et un code.",
      },
      {
        title: "Personnalise l'apparence",
        desc: "Choisis un modèle, ton logo, ton image de fond et tes couleurs. L'aperçu se met à jour en direct.",
      },
      {
        title: "Configure Minecraft",
        desc: "Sélectionne la version, le mod loader, l'adresse de ton serveur et la RAM.",
      },
      {
        title: "Ajoute mods & actus",
        desc: "Tout sera installé automatiquement chez tes joueurs au lancement.",
      },
      {
        title: "Génère et partage",
        desc: "Communique le code à tes joueurs : ils l'entrent dans le launcher et jouent.",
      },
    ],
    faqTitle: "Questions fréquentes",
    faq: [
      {
        q: "C'est vraiment gratuit ?",
        a: "Oui, totalement gratuit et sans carte bancaire, avec une limite actuelle de 3 launchers par compte.",
      },
      {
        q: "Mes joueurs doivent-ils télécharger un launcher différent ?",
        a: "Non. Tout le monde utilise la même application ; le code charge ta configuration au lancement.",
      },
      {
        q: "Quels mod loaders sont supportés ?",
        a: "Vanilla, Fabric, Quilt, Forge et NeoForge.",
      },
      {
        q: "Faut-il installer Java ?",
        a: "Non, le launcher détecte et installe automatiquement le bon Java.",
      },
    ],
    ctaTitle: "Prêt à lancer le tien ?",
    ctaBtn: "Créer mon launcher",
  },
};

export type Dict = typeof fr;

const en: Dict = {
  nav: {
    features: "Features",
    help: "Help",
    login: "Log in",
    register: "Sign up",
    dashboard: "My launchers",
    account: "Account",
    logout: "Log out",
  },
  hero: {
    badge: "100% free · for everyone",
    titleLine1: "Build your Minecraft launcher",
    titleHighlight: "for free",
    titleLine2: "in just minutes",
    subtitle:
      "Customize the look, versions, mods and news, then generate your launcher. No credit card: manage up to 3 launchers for free.",
    ctaPrimary: "Create my launcher",
    ctaSecondary: "See an example",
    perk1: "No coding",
    perk2: "Live preview",
    perk3: "Fabric, Forge, Quilt & NeoForge",
  },
  free: {
    eyebrow: "Free, for real",
    title: "Free for everyone, forever",
    subtitle:
      "No subscription or hidden paid features. Create and manage up to 3 launchers for free.",
    b1: "$0 — no credit card",
    b2: "Up to 3 launchers",
    b3: "Every feature, for everyone",
  },
  features: {
    title: "Everything a real launcher needs",
    subtitle: "A simple yet powerful interface, built for Minecraft servers.",
    items: [
      {
        icon: "🎨",
        title: "Full branding",
        desc: "Logo, background, colors, button styles and theme — applied at runtime for your players.",
      },
      {
        icon: "🧩",
        title: "Mods & resources",
        desc: "Mods, resource packs and shaders installed automatically. Fabric, Forge, Quilt, NeoForge.",
      },
      {
        icon: "📰",
        title: "Built-in news",
        desc: "Announce events, updates and patch notes right inside the launcher.",
      },
      {
        icon: "🚀",
        title: "Automatic Java",
        desc: "The right Java is detected and installed automatically. Players configure nothing.",
      },
    ],
  },
  how: {
    eyebrow: "Couldn't be simpler",
    title: "Choose, customize, generate",
    steps: [
      {
        title: "Create & customize",
        desc: "Pick a template, your logo, colors, version and mods.",
      },
      {
        title: "Preview live",
        desc: "See exactly what your players will see, in real time.",
      },
      {
        title: "Share the code",
        desc: "Players enter the code in the launcher and play. That's it.",
      },
    ],
  },
  ctaBottom: {
    title: "Ready to launch yours?",
    subtitle: "Free, no commitment. Build your first launcher in minutes.",
    button: "Get started for free",
  },
  footer: {
    tagline: "Build your custom Minecraft launcher, for free.",
    colProduct: "Product",
    colResources: "Resources",
    colLanguage: "Language",
    linkFeatures: "Features",
    linkExample: "Example",
    linkHelp: "Help",
    linkCreate: "Create a launcher",
    rights: "Made with ⛏️ for the Minecraft community.",
    freeNote: "Free for everyone.",
  },
  auth: {
    loginTitle: "Log in",
    registerTitle: "Create a free account",
    usernameLabel: "Username",
    usernameHint: "3-32 characters: a-z, 0-9, _ -",
    passwordLabel: "Password",
    passwordHint: "At least 8 characters.",
    login: "Log in",
    register: "Create my free account",
    loggingIn: "Logging in…",
    creating: "Creating…",
    noAccount: "No account?",
    createOne: "Create a free account",
    haveAccount: "Already have an account?",
    signIn: "Log in",
    errLogin: "Incorrect credentials",
    errRegister: "Sign-up error",
  },
  dashboard: {
    title: "My launchers",
    launchersCount: "launcher(s)",
    publishedCount: "published",
    newBtn: "+ New launcher",
    emptyTitle: "No launchers yet",
    emptyDesc: "Create your first custom launcher in minutes. It's free.",
    emptyBtn: "Create my first launcher",
  },
  help: {
    title: "How to create your launcher",
    subtitle:
      "In a few simple steps, no technical knowledge needed. And it's free.",
    steps: [
      {
        title: "Create your launcher",
        desc: 'From the dashboard, click "New launcher". Give it a name and a code.',
      },
      {
        title: "Customize the look",
        desc: "Pick a template, your logo, background and colors. The preview updates live.",
      },
      {
        title: "Configure Minecraft",
        desc: "Select the version, mod loader, your server address and RAM.",
      },
      {
        title: "Add mods & news",
        desc: "Everything is installed automatically for your players at launch.",
      },
      {
        title: "Generate and share",
        desc: "Give the code to your players: they enter it in the launcher and play.",
      },
    ],
    faqTitle: "Frequently asked questions",
    faq: [
      {
        q: "Is it really free?",
        a: "Yes, completely free with no credit card, with a current limit of 3 launchers per account.",
      },
      {
        q: "Do my players need a different launcher?",
        a: "No. Everyone uses the same app; the code loads your configuration at launch.",
      },
      {
        q: "Which mod loaders are supported?",
        a: "Vanilla, Fabric, Quilt, Forge and NeoForge.",
      },
      {
        q: "Do I need to install Java?",
        a: "No, the launcher automatically detects and installs the right Java.",
      },
    ],
    ctaTitle: "Ready to launch yours?",
    ctaBtn: "Create my launcher",
  },
};

const es: Dict = {
  nav: {
    features: "Funciones",
    help: "Ayuda",
    login: "Iniciar sesión",
    register: "Crear cuenta",
    dashboard: "Mis launchers",
    account: "Cuenta",
    logout: "Cerrar sesión",
  },
  hero: {
    badge: "100% gratis · para todos",
    titleLine1: "Crea tu launcher de Minecraft",
    titleHighlight: "gratis",
    titleLine2: "en pocos minutos",
    subtitle:
      "Configura la apariencia, las versiones, los mods y las noticias. Sin tarjeta: gestiona hasta 3 launchers gratis.",
    ctaPrimary: "Crear mi launcher",
    ctaSecondary: "Ver un ejemplo",
    perk1: "Sin programar",
    perk2: "Vista previa en vivo",
    perk3: "Fabric, Forge, Quilt y NeoForge",
  },
  free: {
    eyebrow: "Gratis, de verdad",
    title: "Gratis para todos, para siempre",
    subtitle:
      "Sin suscripción ni funciones de pago ocultas. Crea y gestiona hasta 3 launchers gratis.",
    b1: "0 € — sin tarjeta",
    b2: "Hasta 3 launchers",
    b3: "Todas las funciones, para todos",
  },
  features: {
    title: "Todo lo que necesita un launcher de verdad",
    subtitle:
      "Una interfaz simple y potente, pensada para servidores de Minecraft.",
    items: [
      {
        icon: "🎨",
        title: "Personalización total",
        desc: "Logo, fondo, colores, estilo de botones y tema — aplicados en tiempo real para tus jugadores.",
      },
      {
        icon: "🧩",
        title: "Mods y recursos",
        desc: "Mods, resource packs y shaders instalados automáticamente. Fabric, Forge, Quilt, NeoForge.",
      },
      {
        icon: "📰",
        title: "Noticias integradas",
        desc: "Anuncia eventos, actualizaciones y notas de parche dentro del launcher.",
      },
      {
        icon: "🚀",
        title: "Java automático",
        desc: "El Java correcto se detecta e instala solo. Tus jugadores no configuran nada.",
      },
    ],
  },
  how: {
    eyebrow: "Más fácil imposible",
    title: "Elige, personaliza, genera",
    steps: [
      {
        title: "Crea y personaliza",
        desc: "Elige una plantilla, tu logo, colores, versión y mods.",
      },
      {
        title: "Vista previa en vivo",
        desc: "Ve exactamente lo que verán tus jugadores, en tiempo real.",
      },
      {
        title: "Comparte el código",
        desc: "Tus jugadores introducen el código en el launcher y juegan. Ya está.",
      },
    ],
  },
  ctaBottom: {
    title: "¿Listo para lanzar el tuyo?",
    subtitle: "Gratis, sin compromiso. Crea tu primer launcher en minutos.",
    button: "Empezar gratis",
  },
  footer: {
    tagline: "Crea tu launcher de Minecraft personalizado, gratis.",
    colProduct: "Producto",
    colResources: "Recursos",
    colLanguage: "Idioma",
    linkFeatures: "Funciones",
    linkExample: "Ejemplo",
    linkHelp: "Ayuda",
    linkCreate: "Crear un launcher",
    rights: "Hecho con ⛏️ para la comunidad de Minecraft.",
    freeNote: "Gratis para todos.",
  },
  auth: {
    loginTitle: "Iniciar sesión",
    registerTitle: "Crear una cuenta gratis",
    usernameLabel: "Nombre de usuario",
    usernameHint: "3-32 caracteres: a-z, 0-9, _ -",
    passwordLabel: "Contraseña",
    passwordHint: "Mínimo 8 caracteres.",
    login: "Entrar",
    register: "Crear mi cuenta gratis",
    loggingIn: "Entrando…",
    creating: "Creando…",
    noAccount: "¿Sin cuenta?",
    createOne: "Crear una cuenta gratis",
    haveAccount: "¿Ya tienes cuenta?",
    signIn: "Entrar",
    errLogin: "Credenciales incorrectas",
    errRegister: "Error al registrarse",
  },
  dashboard: {
    title: "Mis launchers",
    launchersCount: "launcher(s)",
    publishedCount: "publicado(s)",
    newBtn: "+ Nuevo launcher",
    emptyTitle: "Aún no hay launchers",
    emptyDesc: "Crea tu primer launcher personalizado en minutos. Es gratis.",
    emptyBtn: "Crear mi primer launcher",
  },
  help: {
    title: "Cómo crear tu launcher",
    subtitle: "En unos pasos simples, sin conocimientos técnicos. Y es gratis.",
    steps: [
      {
        title: "Crea tu launcher",
        desc: "Desde el panel, pulsa «Nuevo launcher». Dale un nombre y un código.",
      },
      {
        title: "Personaliza la apariencia",
        desc: "Elige una plantilla, tu logo, fondo y colores. La vista previa se actualiza en vivo.",
      },
      {
        title: "Configura Minecraft",
        desc: "Selecciona la versión, el mod loader, la dirección de tu servidor y la RAM.",
      },
      {
        title: "Añade mods y noticias",
        desc: "Todo se instala automáticamente para tus jugadores al iniciar.",
      },
      {
        title: "Genera y comparte",
        desc: "Da el código a tus jugadores: lo introducen en el launcher y juegan.",
      },
    ],
    faqTitle: "Preguntas frecuentes",
    faq: [
      {
        q: "¿Es realmente gratis?",
        a: "Sí, totalmente gratis y sin tarjeta, con un límite actual de 3 launchers por cuenta.",
      },
      {
        q: "¿Mis jugadores necesitan otro launcher?",
        a: "No. Todos usan la misma app; el código carga tu configuración al iniciar.",
      },
      {
        q: "¿Qué mod loaders se admiten?",
        a: "Vanilla, Fabric, Quilt, Forge y NeoForge.",
      },
      {
        q: "¿Hay que instalar Java?",
        a: "No, el launcher detecta e instala el Java correcto automáticamente.",
      },
    ],
    ctaTitle: "¿Listo para lanzar el tuyo?",
    ctaBtn: "Crear mi launcher",
  },
};

const de: Dict = {
  nav: {
    features: "Funktionen",
    help: "Hilfe",
    login: "Anmelden",
    register: "Registrieren",
    dashboard: "Meine Launcher",
    account: "Konto",
    logout: "Abmelden",
  },
  hero: {
    badge: "100% kostenlos · für alle",
    titleLine1: "Erstelle deinen Minecraft-Launcher",
    titleHighlight: "kostenlos",
    titleLine2: "in wenigen Minuten",
    subtitle:
      "Passe Aussehen, Versionen, Mods und News an. Keine Kreditkarte: Verwalte bis zu 3 Launcher kostenlos.",
    ctaPrimary: "Meinen Launcher erstellen",
    ctaSecondary: "Beispiel ansehen",
    perk1: "Ohne Programmieren",
    perk2: "Live-Vorschau",
    perk3: "Fabric, Forge, Quilt & NeoForge",
  },
  free: {
    eyebrow: "Wirklich kostenlos",
    title: "Kostenlos für alle, für immer",
    subtitle:
      "Kein Abo und keine versteckten Kosten. Erstelle und verwalte bis zu 3 Launcher kostenlos.",
    b1: "0 € — keine Kreditkarte",
    b2: "Bis zu 3 Launcher",
    b3: "Alle Funktionen, für alle",
  },
  features: {
    title: "Alles, was ein echter Launcher braucht",
    subtitle:
      "Eine einfache und mächtige Oberfläche, gemacht für Minecraft-Server.",
    items: [
      {
        icon: "🎨",
        title: "Komplettes Branding",
        desc: "Logo, Hintergrund, Farben, Button-Stile und Theme – zur Laufzeit bei deinen Spielern.",
      },
      {
        icon: "🧩",
        title: "Mods & Ressourcen",
        desc: "Mods, Resource Packs und Shader automatisch installiert. Fabric, Forge, Quilt, NeoForge.",
      },
      {
        icon: "📰",
        title: "Integrierte News",
        desc: "Kündige Events, Updates und Patchnotes direkt im Launcher an.",
      },
      {
        icon: "🚀",
        title: "Automatisches Java",
        desc: "Das richtige Java wird erkannt und installiert. Spieler richten nichts ein.",
      },
    ],
  },
  how: {
    eyebrow: "Kinderleicht",
    title: "Wählen, anpassen, generieren",
    steps: [
      {
        title: "Erstellen & anpassen",
        desc: "Wähle eine Vorlage, dein Logo, Farben, Version und Mods.",
      },
      {
        title: "Live-Vorschau",
        desc: "Sieh genau, was deine Spieler sehen werden – in Echtzeit.",
      },
      {
        title: "Code teilen",
        desc: "Spieler geben den Code im Launcher ein und spielen. Fertig.",
      },
    ],
  },
  ctaBottom: {
    title: "Bereit, deinen zu starten?",
    subtitle:
      "Kostenlos, unverbindlich. Erstelle deinen ersten Launcher in Minuten.",
    button: "Kostenlos starten",
  },
  footer: {
    tagline: "Erstelle deinen eigenen Minecraft-Launcher, kostenlos.",
    colProduct: "Produkt",
    colResources: "Ressourcen",
    colLanguage: "Sprache",
    linkFeatures: "Funktionen",
    linkExample: "Beispiel",
    linkHelp: "Hilfe",
    linkCreate: "Launcher erstellen",
    rights: "Mit ⛏️ für die Minecraft-Community gemacht.",
    freeNote: "Kostenlos für alle.",
  },
  auth: {
    loginTitle: "Anmelden",
    registerTitle: "Kostenloses Konto erstellen",
    usernameLabel: "Benutzername",
    usernameHint: "3-32 Zeichen: a-z, 0-9, _ -",
    passwordLabel: "Passwort",
    passwordHint: "Mindestens 8 Zeichen.",
    login: "Anmelden",
    register: "Kostenloses Konto erstellen",
    loggingIn: "Anmeldung…",
    creating: "Wird erstellt…",
    noAccount: "Kein Konto?",
    createOne: "Kostenloses Konto erstellen",
    haveAccount: "Schon ein Konto?",
    signIn: "Anmelden",
    errLogin: "Falsche Anmeldedaten",
    errRegister: "Fehler bei der Registrierung",
  },
  dashboard: {
    title: "Meine Launcher",
    launchersCount: "Launcher",
    publishedCount: "veröffentlicht",
    newBtn: "+ Neuer Launcher",
    emptyTitle: "Noch keine Launcher",
    emptyDesc: "Erstelle deinen ersten eigenen Launcher in Minuten. Kostenlos.",
    emptyBtn: "Ersten Launcher erstellen",
  },
  help: {
    title: "So erstellst du deinen Launcher",
    subtitle:
      "In wenigen einfachen Schritten, ohne technisches Wissen. Und kostenlos.",
    steps: [
      {
        title: "Launcher erstellen",
        desc: "Klicke im Dashboard auf „Neuer Launcher“. Gib ihm einen Namen und einen Code.",
      },
      {
        title: "Aussehen anpassen",
        desc: "Wähle eine Vorlage, dein Logo, Hintergrund und Farben. Die Vorschau aktualisiert live.",
      },
      {
        title: "Minecraft einrichten",
        desc: "Wähle Version, Mod-Loader, deine Server-Adresse und RAM.",
      },
      {
        title: "Mods & News hinzufügen",
        desc: "Alles wird beim Start automatisch für deine Spieler installiert.",
      },
      {
        title: "Generieren & teilen",
        desc: "Gib den Code an deine Spieler: Sie geben ihn im Launcher ein und spielen.",
      },
    ],
    faqTitle: "Häufige Fragen",
    faq: [
      {
        q: "Ist es wirklich kostenlos?",
        a: "Ja, völlig kostenlos und ohne Kreditkarte, aktuell mit 3 Launchern pro Konto.",
      },
      {
        q: "Brauchen meine Spieler einen anderen Launcher?",
        a: "Nein. Alle nutzen dieselbe App; der Code lädt deine Konfiguration beim Start.",
      },
      {
        q: "Welche Mod-Loader werden unterstützt?",
        a: "Vanilla, Fabric, Quilt, Forge und NeoForge.",
      },
      {
        q: "Muss ich Java installieren?",
        a: "Nein, der Launcher erkennt und installiert automatisch das richtige Java.",
      },
    ],
    ctaTitle: "Bereit, deinen zu starten?",
    ctaBtn: "Meinen Launcher erstellen",
  },
};

const pt: Dict = {
  nav: {
    features: "Recursos",
    help: "Ajuda",
    login: "Entrar",
    register: "Criar conta",
    dashboard: "Meus launchers",
    account: "Conta",
    logout: "Sair",
  },
  hero: {
    badge: "100% grátis · para todos",
    titleLine1: "Crie o seu launcher de Minecraft",
    titleHighlight: "de graça",
    titleLine2: "em poucos minutos",
    subtitle:
      "Personalize a aparência, as versões, os mods e as notícias. Sem cartão: gerencie até 3 launchers grátis.",
    ctaPrimary: "Criar meu launcher",
    ctaSecondary: "Ver um exemplo",
    perk1: "Sem programar",
    perk2: "Pré-visualização ao vivo",
    perk3: "Fabric, Forge, Quilt e NeoForge",
  },
  free: {
    eyebrow: "Grátis de verdade",
    title: "Grátis para todos, para sempre",
    subtitle:
      "Sem assinatura ou recursos pagos escondidos. Crie e gerencie até 3 launchers de graça.",
    b1: "R$ 0 — sem cartão",
    b2: "Até 3 launchers",
    b3: "Todos os recursos, para todos",
  },
  features: {
    title: "Tudo o que um launcher de verdade precisa",
    subtitle:
      "Uma interface simples e poderosa, feita para servidores de Minecraft.",
    items: [
      {
        icon: "🎨",
        title: "Personalização total",
        desc: "Logo, fundo, cores, estilo dos botões e tema — aplicados em tempo real para seus jogadores.",
      },
      {
        icon: "🧩",
        title: "Mods e recursos",
        desc: "Mods, resource packs e shaders instalados automaticamente. Fabric, Forge, Quilt, NeoForge.",
      },
      {
        icon: "📰",
        title: "Notícias integradas",
        desc: "Anuncie eventos, atualizações e patch notes dentro do launcher.",
      },
      {
        icon: "🚀",
        title: "Java automático",
        desc: "O Java certo é detectado e instalado sozinho. Seus jogadores não configuram nada.",
      },
    ],
  },
  how: {
    eyebrow: "Simples assim",
    title: "Escolha, personalize, gere",
    steps: [
      {
        title: "Crie e personalize",
        desc: "Escolha um modelo, seu logo, cores, versão e mods.",
      },
      {
        title: "Pré-visualize ao vivo",
        desc: "Veja exatamente o que seus jogadores verão, em tempo real.",
      },
      {
        title: "Compartilhe o código",
        desc: "Seus jogadores digitam o código no launcher e jogam. Pronto.",
      },
    ],
  },
  ctaBottom: {
    title: "Pronto para lançar o seu?",
    subtitle: "Grátis, sem compromisso. Crie seu primeiro launcher em minutos.",
    button: "Começar de graça",
  },
  footer: {
    tagline: "Crie o seu launcher de Minecraft personalizado, de graça.",
    colProduct: "Produto",
    colResources: "Recursos",
    colLanguage: "Idioma",
    linkFeatures: "Recursos",
    linkExample: "Exemplo",
    linkHelp: "Ajuda",
    linkCreate: "Criar um launcher",
    rights: "Feito com ⛏️ para a comunidade Minecraft.",
    freeNote: "Grátis para todos.",
  },
  auth: {
    loginTitle: "Entrar",
    registerTitle: "Criar uma conta grátis",
    usernameLabel: "Nome de usuário",
    usernameHint: "3-32 caracteres: a-z, 0-9, _ -",
    passwordLabel: "Senha",
    passwordHint: "Mínimo 8 caracteres.",
    login: "Entrar",
    register: "Criar minha conta grátis",
    loggingIn: "Entrando…",
    creating: "Criando…",
    noAccount: "Sem conta?",
    createOne: "Criar uma conta grátis",
    haveAccount: "Já tem conta?",
    signIn: "Entrar",
    errLogin: "Credenciais incorretas",
    errRegister: "Erro no cadastro",
  },
  dashboard: {
    title: "Meus launchers",
    launchersCount: "launcher(s)",
    publishedCount: "publicado(s)",
    newBtn: "+ Novo launcher",
    emptyTitle: "Nenhum launcher ainda",
    emptyDesc: "Crie seu primeiro launcher personalizado em minutos. É grátis.",
    emptyBtn: "Criar meu primeiro launcher",
  },
  help: {
    title: "Como criar o seu launcher",
    subtitle: "Em poucos passos simples, sem conhecimento técnico. E é grátis.",
    steps: [
      {
        title: "Crie seu launcher",
        desc: "No painel, clique em «Novo launcher». Dê um nome e um código.",
      },
      {
        title: "Personalize a aparência",
        desc: "Escolha um modelo, seu logo, fundo e cores. A prévia atualiza ao vivo.",
      },
      {
        title: "Configure o Minecraft",
        desc: "Selecione a versão, o mod loader, o endereço do servidor e a RAM.",
      },
      {
        title: "Adicione mods e notícias",
        desc: "Tudo é instalado automaticamente para seus jogadores ao iniciar.",
      },
      {
        title: "Gere e compartilhe",
        desc: "Dê o código aos seus jogadores: eles digitam no launcher e jogam.",
      },
    ],
    faqTitle: "Perguntas frequentes",
    faq: [
      {
        q: "É realmente grátis?",
        a: "Sim, totalmente grátis e sem cartão, com o limite atual de 3 launchers por conta.",
      },
      {
        q: "Meus jogadores precisam de outro launcher?",
        a: "Não. Todos usam o mesmo app; o código carrega sua configuração ao iniciar.",
      },
      {
        q: "Quais mod loaders são suportados?",
        a: "Vanilla, Fabric, Quilt, Forge e NeoForge.",
      },
      {
        q: "Preciso instalar Java?",
        a: "Não, o launcher detecta e instala o Java certo automaticamente.",
      },
    ],
    ctaTitle: "Pronto para lançar o seu?",
    ctaBtn: "Criar meu launcher",
  },
};

const it: Dict = {
  nav: {
    features: "Funzioni",
    help: "Aiuto",
    login: "Accedi",
    register: "Registrati",
    dashboard: "I miei launcher",
    account: "Account",
    logout: "Esci",
  },
  hero: {
    badge: "100% gratis · per tutti",
    titleLine1: "Crea il tuo launcher di Minecraft",
    titleHighlight: "gratis",
    titleLine2: "in pochi minuti",
    subtitle:
      "Personalizza aspetto, versioni, mod e notizie. Nessuna carta: gestisci fino a 3 launcher gratis.",
    ctaPrimary: "Crea il mio launcher",
    ctaSecondary: "Vedi un esempio",
    perk1: "Senza programmare",
    perk2: "Anteprima in tempo reale",
    perk3: "Fabric, Forge, Quilt e NeoForge",
  },
  free: {
    eyebrow: "Gratis, davvero",
    title: "Gratis per tutti, per sempre",
    subtitle:
      "Nessun abbonamento o funzione a pagamento nascosta. Crea e gestisci fino a 3 launcher gratis.",
    b1: "0 € — nessuna carta",
    b2: "Fino a 3 launcher",
    b3: "Tutte le funzioni, per tutti",
  },
  features: {
    title: "Tutto ciò che serve a un vero launcher",
    subtitle:
      "Un'interfaccia semplice e potente, pensata per i server Minecraft.",
    items: [
      {
        icon: "🎨",
        title: "Branding completo",
        desc: "Logo, sfondo, colori, stile dei pulsanti e tema — applicati in tempo reale ai tuoi giocatori.",
      },
      {
        icon: "🧩",
        title: "Mod e risorse",
        desc: "Mod, resource pack e shader installati automaticamente. Fabric, Forge, Quilt, NeoForge.",
      },
      {
        icon: "📰",
        title: "Notizie integrate",
        desc: "Annuncia eventi, aggiornamenti e patch note direttamente nel launcher.",
      },
      {
        icon: "🚀",
        title: "Java automatico",
        desc: "Il Java giusto viene rilevato e installato da solo. I giocatori non configurano nulla.",
      },
    ],
  },
  how: {
    eyebrow: "Più facile di così",
    title: "Scegli, personalizza, genera",
    steps: [
      {
        title: "Crea e personalizza",
        desc: "Scegli un modello, il tuo logo, i colori, la versione e i mod.",
      },
      {
        title: "Anteprima dal vivo",
        desc: "Vedi esattamente ciò che vedranno i tuoi giocatori, in tempo reale.",
      },
      {
        title: "Condividi il codice",
        desc: "I giocatori inseriscono il codice nel launcher e giocano. Tutto qui.",
      },
    ],
  },
  ctaBottom: {
    title: "Pronto a lanciare il tuo?",
    subtitle:
      "Gratis, senza impegno. Crea il tuo primo launcher in pochi minuti.",
    button: "Inizia gratis",
  },
  footer: {
    tagline: "Crea il tuo launcher di Minecraft personalizzato, gratis.",
    colProduct: "Prodotto",
    colResources: "Risorse",
    colLanguage: "Lingua",
    linkFeatures: "Funzioni",
    linkExample: "Esempio",
    linkHelp: "Aiuto",
    linkCreate: "Crea un launcher",
    rights: "Fatto con ⛏️ per la community di Minecraft.",
    freeNote: "Gratis per tutti.",
  },
  auth: {
    loginTitle: "Accedi",
    registerTitle: "Crea un account gratuito",
    usernameLabel: "Nome utente",
    usernameHint: "3-32 caratteri: a-z, 0-9, _ -",
    passwordLabel: "Password",
    passwordHint: "Almeno 8 caratteri.",
    login: "Accedi",
    register: "Crea il mio account gratuito",
    loggingIn: "Accesso…",
    creating: "Creazione…",
    noAccount: "Nessun account?",
    createOne: "Crea un account gratuito",
    haveAccount: "Hai già un account?",
    signIn: "Accedi",
    errLogin: "Credenziali errate",
    errRegister: "Errore di registrazione",
  },
  dashboard: {
    title: "I miei launcher",
    launchersCount: "launcher",
    publishedCount: "pubblicato/i",
    newBtn: "+ Nuovo launcher",
    emptyTitle: "Ancora nessun launcher",
    emptyDesc:
      "Crea il tuo primo launcher personalizzato in pochi minuti. È gratis.",
    emptyBtn: "Crea il mio primo launcher",
  },
  help: {
    title: "Come creare il tuo launcher",
    subtitle:
      "In pochi semplici passi, senza conoscenze tecniche. Ed è gratis.",
    steps: [
      {
        title: "Crea il tuo launcher",
        desc: "Dalla dashboard, clicca «Nuovo launcher». Dagli un nome e un codice.",
      },
      {
        title: "Personalizza l'aspetto",
        desc: "Scegli un modello, il tuo logo, lo sfondo e i colori. L'anteprima si aggiorna dal vivo.",
      },
      {
        title: "Configura Minecraft",
        desc: "Seleziona la versione, il mod loader, l'indirizzo del server e la RAM.",
      },
      {
        title: "Aggiungi mod e notizie",
        desc: "Tutto viene installato automaticamente per i tuoi giocatori all'avvio.",
      },
      {
        title: "Genera e condividi",
        desc: "Dai il codice ai tuoi giocatori: lo inseriscono nel launcher e giocano.",
      },
    ],
    faqTitle: "Domande frequenti",
    faq: [
      {
        q: "È davvero gratis?",
        a: "Sì, completamente gratis e senza carta, con un limite attuale di 3 launcher per account.",
      },
      {
        q: "I miei giocatori servono un altro launcher?",
        a: "No. Tutti usano la stessa app; il codice carica la tua configurazione all'avvio.",
      },
      {
        q: "Quali mod loader sono supportati?",
        a: "Vanilla, Fabric, Quilt, Forge e NeoForge.",
      },
      {
        q: "Devo installare Java?",
        a: "No, il launcher rileva e installa automaticamente il Java giusto.",
      },
    ],
    ctaTitle: "Pronto a lanciare il tuo?",
    ctaBtn: "Crea il mio launcher",
  },
};

const DICTS: Record<Locale, Dict> = { fr, en, es, de, pt, it };

export function getDictionary(locale: Locale): Dict {
  return DICTS[locale] ?? fr;
}
