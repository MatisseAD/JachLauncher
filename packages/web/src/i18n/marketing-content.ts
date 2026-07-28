import type { Locale } from "./config";

type MarketingCopy = {
  examples: string;
  operational: string;
  announcement: string;
  headline: string;
  headlineAccent: string;
  noCard: string;
  instantPreview: string;
  upToThree: string;
  interactiveDemo: string;
  desktopApp: string;
  creators: string;
  registered: string;
  launchers: string;
  configured: string;
  servers: string;
  published: string;
  supportedLoaders: string;
  inspirations: string;
  examplesTitle: string;
  examplesIntro: string;
  example: string;
  tryExample: string;
  players: string;
  preparing: string;
  showcaseTypes: [string, string, string];
  workflowIntro: string;
  createSpace: string;
};

const fr: MarketingCopy = {
  examples: "Exemples",
  operational: "Plateforme opérationnelle",
  announcement: "Plateforme gratuite pour créateurs Minecraft",
  headline: "Le launcher de ton serveur.",
  headlineAccent: "Prêt à jouer, sans coder.",
  noCard: "Sans carte bancaire",
  instantPreview: "Aperçu instantané",
  upToThree: "Jusqu’à 3 launchers",
  interactiveDemo: "Démo interactive",
  desktopApp: "Application desktop",
  creators: "créateur",
  registered: "inscrit",
  launchers: "launcher",
  configured: "configuré",
  servers: "serveur",
  published: "publié",
  supportedLoaders: "mod loaders supportés",
  inspirations: "Inspirations",
  examplesTitle: "Un launcher à l’image de chaque serveur",
  examplesIntro:
    "Pars d’une base professionnelle, puis adapte chaque détail à ton univers : couleurs, actualités, mods, événements et serveur.",
  example: "Exemple",
  tryExample: "Essayer ce launcher",
  players: "joueurs",
  preparing: "En préparation",
  showcaseTypes: ["Survie communautaire", "Aventure modée", "Mini-jeux"],
  workflowIntro:
    "Une expérience guidée, pensée pour avancer sans connaissance technique et publier sans friction.",
  createSpace: "Créer mon espace",
};

const en: MarketingCopy = {
  examples: "Examples",
  operational: "Platform operational",
  announcement: "Free platform for Minecraft creators",
  headline: "Your server’s launcher.",
  headlineAccent: "Ready to play, no coding.",
  noCard: "No credit card",
  instantPreview: "Instant preview",
  upToThree: "Up to 3 launchers",
  interactiveDemo: "Interactive demo",
  desktopApp: "Desktop application",
  creators: "creator",
  registered: "registered",
  launchers: "launcher",
  configured: "configured",
  servers: "server",
  published: "published",
  supportedLoaders: "supported mod loaders",
  inspirations: "Inspiration",
  examplesTitle: "A launcher that matches every server",
  examplesIntro:
    "Start with a professional base, then adapt every detail: colors, news, mods, events and server.",
  example: "Example",
  tryExample: "Try this launcher",
  players: "players",
  preparing: "Coming soon",
  showcaseTypes: ["Community survival", "Modded adventure", "Mini-games"],
  workflowIntro:
    "A guided experience designed to move forward without technical knowledge and publish smoothly.",
  createSpace: "Create my space",
};

const es: MarketingCopy = {
  examples: "Ejemplos",
  operational: "Plataforma operativa",
  announcement: "Plataforma gratuita para creadores de Minecraft",
  headline: "El launcher de tu servidor.",
  headlineAccent: "Listo para jugar, sin programar.",
  noCard: "Sin tarjeta bancaria",
  instantPreview: "Vista previa instantánea",
  upToThree: "Hasta 3 launchers",
  interactiveDemo: "Demo interactiva",
  desktopApp: "Aplicación de escritorio",
  creators: "creador",
  registered: "registrado",
  launchers: "launcher",
  configured: "configurado",
  servers: "servidor",
  published: "publicado",
  supportedLoaders: "mod loaders compatibles",
  inspirations: "Inspiración",
  examplesTitle: "Un launcher a la imagen de cada servidor",
  examplesIntro:
    "Parte de una base profesional y adapta colores, noticias, mods, eventos y servidor.",
  example: "Ejemplo",
  tryExample: "Probar este launcher",
  players: "jugadores",
  preparing: "En preparación",
  showcaseTypes: ["Survival comunitario", "Aventura con mods", "Minijuegos"],
  workflowIntro:
    "Una experiencia guiada para avanzar sin conocimientos técnicos y publicar sin fricción.",
  createSpace: "Crear mi espacio",
};

const de: MarketingCopy = {
  examples: "Beispiele",
  operational: "Plattform betriebsbereit",
  announcement: "Kostenlose Plattform für Minecraft-Ersteller",
  headline: "Der Launcher deines Servers.",
  headlineAccent: "Spielbereit, ohne Programmierung.",
  noCard: "Keine Kreditkarte",
  instantPreview: "Sofortige Vorschau",
  upToThree: "Bis zu 3 Launcher",
  interactiveDemo: "Interaktive Demo",
  desktopApp: "Desktop-Anwendung",
  creators: "Ersteller",
  registered: "registriert",
  launchers: "Launcher",
  configured: "konfiguriert",
  servers: "Server",
  published: "veröffentlicht",
  supportedLoaders: "unterstützte Mod-Loader",
  inspirations: "Inspiration",
  examplesTitle: "Ein Launcher passend zu jedem Server",
  examplesIntro:
    "Starte professionell und passe Farben, News, Mods, Events und Server an.",
  example: "Beispiel",
  tryExample: "Launcher ausprobieren",
  players: "Spieler",
  preparing: "In Vorbereitung",
  showcaseTypes: ["Community-Survival", "Mod-Abenteuer", "Minispiele"],
  workflowIntro:
    "Eine geführte Erfahrung ohne technische Vorkenntnisse und mit reibungsloser Veröffentlichung.",
  createSpace: "Bereich erstellen",
};

const pt: MarketingCopy = {
  examples: "Exemplos",
  operational: "Plataforma operacional",
  announcement: "Plataforma gratuita para criadores de Minecraft",
  headline: "O launcher do seu servidor.",
  headlineAccent: "Pronto para jogar, sem programar.",
  noCard: "Sem cartão bancário",
  instantPreview: "Prévia instantânea",
  upToThree: "Até 3 launchers",
  interactiveDemo: "Demo interativa",
  desktopApp: "Aplicativo desktop",
  creators: "criador",
  registered: "cadastrado",
  launchers: "launcher",
  configured: "configurado",
  servers: "servidor",
  published: "publicado",
  supportedLoaders: "mod loaders compatíveis",
  inspirations: "Inspiração",
  examplesTitle: "Um launcher com a identidade de cada servidor",
  examplesIntro:
    "Comece com uma base profissional e adapte cores, notícias, mods, eventos e servidor.",
  example: "Exemplo",
  tryExample: "Testar este launcher",
  players: "jogadores",
  preparing: "Em preparação",
  showcaseTypes: ["Survival comunitário", "Aventura com mods", "Minijogos"],
  workflowIntro:
    "Uma experiência guiada para avançar sem conhecimento técnico e publicar sem atrito.",
  createSpace: "Criar meu espaço",
};

const it: MarketingCopy = {
  examples: "Esempi",
  operational: "Piattaforma operativa",
  announcement: "Piattaforma gratuita per creator Minecraft",
  headline: "Il launcher del tuo server.",
  headlineAccent: "Pronto da giocare, senza programmare.",
  noCard: "Nessuna carta",
  instantPreview: "Anteprima istantanea",
  upToThree: "Fino a 3 launcher",
  interactiveDemo: "Demo interattiva",
  desktopApp: "Applicazione desktop",
  creators: "creator",
  registered: "registrato",
  launchers: "launcher",
  configured: "configurato",
  servers: "server",
  published: "pubblicato",
  supportedLoaders: "mod loader supportati",
  inspirations: "Ispirazione",
  examplesTitle: "Un launcher adatto a ogni server",
  examplesIntro:
    "Parti da una base professionale e adatta colori, notizie, mod, eventi e server.",
  example: "Esempio",
  tryExample: "Prova questo launcher",
  players: "giocatori",
  preparing: "In preparazione",
  showcaseTypes: ["Survival community", "Avventura moddata", "Minigiochi"],
  workflowIntro:
    "Un’esperienza guidata per procedere senza conoscenze tecniche e pubblicare facilmente.",
  createSpace: "Crea il mio spazio",
};

const copies: Record<Locale, MarketingCopy> = { fr, en, es, de, pt, it };

export function getMarketingCopy(locale: Locale): MarketingCopy {
  return copies[locale] ?? fr;
}
