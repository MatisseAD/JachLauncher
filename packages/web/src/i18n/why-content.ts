import type { Locale } from "./config";

type Reason = { icon: string; title: string; desc: string };
type Row = { label: string; us: string; others: string };

export type WhyCopy = {
  kicker: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  reasonsTitle: string;
  reasonsIntro: string;
  reasons: Reason[];
  compareTitle: string;
  compareIntro: string;
  compareUs: string;
  compareOthers: string;
  rows: Row[];
  finalTitle: string;
  finalSubtitle: string;
};

const fr: WhyCopy = {
  kicker: "Pourquoi YourLauncher",
  title: "Le launcher que tes joueurs",
  titleAccent: "vont vraiment garder.",
  subtitle:
    "Créer un launcher Minecraft demandait un développeur, des semaines de travail et un budget. Ici : quelques minutes, aucune ligne de code, et c’est gratuit.",
  ctaPrimary: "Créer mon launcher",
  ctaSecondary: "Voir un exemple",
  reasonsTitle: "Six raisons de le choisir",
  reasonsIntro:
    "Pensé pour les serveurs qui veulent une expérience pro sans équipe technique.",
  reasons: [
    {
      icon: "⚡",
      title: "Prêt en quelques minutes",
      desc: "Rien à compiler, rien à héberger. Tu configures, tu publies, tes joueurs entrent un code.",
    },
    {
      icon: "🔄",
      title: "Mises à jour automatiques",
      desc: "Tu changes un mod sur le site ? Le launcher le détecte au démarrage suivant et l’applique tout seul.",
    },
    {
      icon: "☕",
      title: "Zéro support technique",
      desc: "Java est installé automatiquement, les fichiers sont vérifiés, et un bouton Réparer règle l’essentiel des soucis.",
    },
    {
      icon: "🎨",
      title: "À ton image",
      desc: "Logo, couleurs, fond, actualités, événements : le launcher porte l’identité de ton serveur, pas la nôtre.",
    },
    {
      icon: "🧩",
      title: "Mods en un clic",
      desc: "Recherche Modrinth et CurseForge intégrée. Fabric, Forge, Quilt et NeoForge gérés automatiquement.",
    },
    {
      icon: "💚",
      title: "Gratuit, sans piège",
      desc: "Pas d’abonnement, pas de fonctionnalité réservée aux payants, pas de carte bancaire.",
    },
  ],
  compareTitle: "YourLauncher ou launcher fait maison ?",
  compareIntro: "Ce que tu économises en choisissant une plateforme prête.",
  compareUs: "YourLauncher",
  compareOthers: "Launcher fait maison",
  rows: [
    {
      label: "Temps de mise en place",
      us: "Quelques minutes",
      others: "Des semaines de développement",
    },
    { label: "Compétences requises", us: "Aucune", others: "Java / Electron" },
    { label: "Coût", us: "Gratuit", others: "Développeur + hébergement" },
    {
      label: "Mise à jour des mods",
      us: "Automatique",
      others: "Recompiler et redistribuer",
    },
    {
      label: "Installation de Java",
      us: "Automatique",
      others: "À la charge du joueur",
    },
    { label: "Maintenance", us: "Incluse", others: "À ta charge" },
  ],
  finalTitle: "Convaincu ? Lance-toi.",
  finalSubtitle:
    "Gratuit, sans engagement, ton premier launcher en quelques minutes.",
};

const en: WhyCopy = {
  kicker: "Why YourLauncher",
  title: "The launcher your players",
  titleAccent: "will actually keep.",
  subtitle:
    "Building a Minecraft launcher used to need a developer, weeks of work and a budget. Here: a few minutes, no code, and it’s free.",
  ctaPrimary: "Create my launcher",
  ctaSecondary: "See an example",
  reasonsTitle: "Six reasons to pick it",
  reasonsIntro:
    "Built for servers that want a pro experience without a technical team.",
  reasons: [
    {
      icon: "⚡",
      title: "Ready in minutes",
      desc: "Nothing to compile, nothing to host. Configure, publish, and your players just enter a code.",
    },
    {
      icon: "🔄",
      title: "Automatic updates",
      desc: "Changed a mod on the site? The launcher detects it on next start and applies it on its own.",
    },
    {
      icon: "☕",
      title: "Zero tech support",
      desc: "Java is installed automatically, files are verified, and one Repair button fixes most issues.",
    },
    {
      icon: "🎨",
      title: "Your brand",
      desc: "Logo, colors, background, news, events: the launcher carries your server’s identity, not ours.",
    },
    {
      icon: "🧩",
      title: "Mods in one click",
      desc: "Built-in Modrinth and CurseForge search. Fabric, Forge, Quilt and NeoForge handled automatically.",
    },
    {
      icon: "💚",
      title: "Free, no catch",
      desc: "No subscription, no paywalled features, no credit card.",
    },
  ],
  compareTitle: "YourLauncher or a custom-built launcher?",
  compareIntro: "What you save by choosing a ready-made platform.",
  compareUs: "YourLauncher",
  compareOthers: "Custom-built launcher",
  rows: [
    {
      label: "Setup time",
      us: "A few minutes",
      others: "Weeks of development",
    },
    { label: "Skills required", us: "None", others: "Java / Electron" },
    { label: "Cost", us: "Free", others: "Developer + hosting" },
    {
      label: "Updating mods",
      us: "Automatic",
      others: "Rebuild and redistribute",
    },
    { label: "Java installation", us: "Automatic", others: "Player’s problem" },
    { label: "Maintenance", us: "Included", others: "On you" },
  ],
  finalTitle: "Convinced? Get started.",
  finalSubtitle: "Free, no commitment, your first launcher in minutes.",
};

const es: WhyCopy = {
  kicker: "Por qué YourLauncher",
  title: "El launcher que tus jugadores",
  titleAccent: "van a conservar.",
  subtitle:
    "Crear un launcher de Minecraft requería un desarrollador, semanas de trabajo y presupuesto. Aquí: unos minutos, sin código y gratis.",
  ctaPrimary: "Crear mi launcher",
  ctaSecondary: "Ver un ejemplo",
  reasonsTitle: "Seis razones para elegirlo",
  reasonsIntro:
    "Pensado para servidores que quieren una experiencia profesional sin equipo técnico.",
  reasons: [
    {
      icon: "⚡",
      title: "Listo en minutos",
      desc: "Nada que compilar ni alojar. Configuras, publicas y tus jugadores solo escriben un código.",
    },
    {
      icon: "🔄",
      title: "Actualizaciones automáticas",
      desc: "¿Cambias un mod en la web? El launcher lo detecta al iniciar y lo aplica solo.",
    },
    {
      icon: "☕",
      title: "Cero soporte técnico",
      desc: "Java se instala automáticamente, los archivos se verifican y el botón Reparar resuelve casi todo.",
    },
    {
      icon: "🎨",
      title: "Con tu identidad",
      desc: "Logo, colores, fondo, noticias y eventos: el launcher lleva la identidad de tu servidor.",
    },
    {
      icon: "🧩",
      title: "Mods en un clic",
      desc: "Búsqueda integrada de Modrinth y CurseForge. Fabric, Forge, Quilt y NeoForge automáticos.",
    },
    {
      icon: "💚",
      title: "Gratis, sin trampas",
      desc: "Sin suscripción, sin funciones de pago, sin tarjeta.",
    },
  ],
  compareTitle: "¿YourLauncher o un launcher propio?",
  compareIntro: "Lo que ahorras al elegir una plataforma lista.",
  compareUs: "YourLauncher",
  compareOthers: "Launcher propio",
  rows: [
    {
      label: "Tiempo de puesta en marcha",
      us: "Unos minutos",
      others: "Semanas de desarrollo",
    },
    {
      label: "Conocimientos necesarios",
      us: "Ninguno",
      others: "Java / Electron",
    },
    { label: "Coste", us: "Gratis", others: "Desarrollador + hosting" },
    {
      label: "Actualizar mods",
      us: "Automático",
      others: "Recompilar y redistribuir",
    },
    {
      label: "Instalación de Java",
      us: "Automática",
      others: "Problema del jugador",
    },
    { label: "Mantenimiento", us: "Incluido", others: "Tuyo" },
  ],
  finalTitle: "¿Convencido? Empieza ya.",
  finalSubtitle: "Gratis, sin compromiso, tu primer launcher en minutos.",
};

const de: WhyCopy = {
  kicker: "Warum YourLauncher",
  title: "Der Launcher, den deine Spieler",
  titleAccent: "wirklich behalten.",
  subtitle:
    "Einen Minecraft-Launcher zu bauen brauchte früher Entwickler, Wochen Arbeit und Budget. Hier: wenige Minuten, kein Code, kostenlos.",
  ctaPrimary: "Meinen Launcher erstellen",
  ctaSecondary: "Beispiel ansehen",
  reasonsTitle: "Sechs Gründe dafür",
  reasonsIntro:
    "Für Server, die ein professionelles Erlebnis ohne Technikteam wollen.",
  reasons: [
    {
      icon: "⚡",
      title: "In Minuten bereit",
      desc: "Nichts kompilieren, nichts hosten. Konfigurieren, veröffentlichen – Spieler geben nur einen Code ein.",
    },
    {
      icon: "🔄",
      title: "Automatische Updates",
      desc: "Mod auf der Website geändert? Der Launcher erkennt es beim nächsten Start und wendet es selbst an.",
    },
    {
      icon: "☕",
      title: "Kein Support-Aufwand",
      desc: "Java wird automatisch installiert, Dateien geprüft, und ein Reparieren-Knopf löst das meiste.",
    },
    {
      icon: "🎨",
      title: "Dein Branding",
      desc: "Logo, Farben, Hintergrund, News, Events: der Launcher trägt die Identität deines Servers.",
    },
    {
      icon: "🧩",
      title: "Mods mit einem Klick",
      desc: "Integrierte Modrinth- und CurseForge-Suche. Fabric, Forge, Quilt und NeoForge automatisch.",
    },
    {
      icon: "💚",
      title: "Kostenlos, ohne Haken",
      desc: "Kein Abo, keine Bezahlfunktionen, keine Kreditkarte.",
    },
  ],
  compareTitle: "YourLauncher oder Eigenbau?",
  compareIntro: "Was du mit einer fertigen Plattform sparst.",
  compareUs: "YourLauncher",
  compareOthers: "Eigenbau-Launcher",
  rows: [
    {
      label: "Einrichtungszeit",
      us: "Wenige Minuten",
      others: "Wochen Entwicklung",
    },
    { label: "Nötige Kenntnisse", us: "Keine", others: "Java / Electron" },
    { label: "Kosten", us: "Kostenlos", others: "Entwickler + Hosting" },
    {
      label: "Mods aktualisieren",
      us: "Automatisch",
      others: "Neu bauen und verteilen",
    },
    {
      label: "Java-Installation",
      us: "Automatisch",
      others: "Sache des Spielers",
    },
    { label: "Wartung", us: "Inklusive", others: "Deine Sache" },
  ],
  finalTitle: "Überzeugt? Leg los.",
  finalSubtitle: "Kostenlos, unverbindlich, dein erster Launcher in Minuten.",
};

const pt: WhyCopy = {
  kicker: "Porquê o YourLauncher",
  title: "O launcher que os teus jogadores",
  titleAccent: "vão mesmo manter.",
  subtitle:
    "Criar um launcher de Minecraft exigia um programador, semanas de trabalho e orçamento. Aqui: alguns minutos, sem código e grátis.",
  ctaPrimary: "Criar o meu launcher",
  ctaSecondary: "Ver um exemplo",
  reasonsTitle: "Seis razões para escolher",
  reasonsIntro:
    "Feito para servidores que querem uma experiência profissional sem equipa técnica.",
  reasons: [
    {
      icon: "⚡",
      title: "Pronto em minutos",
      desc: "Nada para compilar nem alojar. Configuras, publicas e os jogadores só introduzem um código.",
    },
    {
      icon: "🔄",
      title: "Atualizações automáticas",
      desc: "Mudaste um mod no site? O launcher deteta no arranque seguinte e aplica sozinho.",
    },
    {
      icon: "☕",
      title: "Zero suporte técnico",
      desc: "O Java é instalado automaticamente, os ficheiros são verificados e o botão Reparar resolve quase tudo.",
    },
    {
      icon: "🎨",
      title: "Com a tua identidade",
      desc: "Logo, cores, fundo, notícias e eventos: o launcher leva a identidade do teu servidor.",
    },
    {
      icon: "🧩",
      title: "Mods num clique",
      desc: "Pesquisa integrada de Modrinth e CurseForge. Fabric, Forge, Quilt e NeoForge automáticos.",
    },
    {
      icon: "💚",
      title: "Grátis, sem truques",
      desc: "Sem subscrição, sem funcionalidades pagas, sem cartão.",
    },
  ],
  compareTitle: "YourLauncher ou launcher próprio?",
  compareIntro: "O que poupas ao escolher uma plataforma pronta.",
  compareUs: "YourLauncher",
  compareOthers: "Launcher próprio",
  rows: [
    {
      label: "Tempo de arranque",
      us: "Alguns minutos",
      others: "Semanas de desenvolvimento",
    },
    {
      label: "Competências necessárias",
      us: "Nenhuma",
      others: "Java / Electron",
    },
    { label: "Custo", us: "Grátis", others: "Programador + alojamento" },
    {
      label: "Atualizar mods",
      us: "Automático",
      others: "Recompilar e redistribuir",
    },
    {
      label: "Instalação do Java",
      us: "Automática",
      others: "Problema do jogador",
    },
    { label: "Manutenção", us: "Incluída", others: "Tua" },
  ],
  finalTitle: "Convencido? Começa já.",
  finalSubtitle: "Grátis, sem compromisso, o teu primeiro launcher em minutos.",
};

const it: WhyCopy = {
  kicker: "Perché YourLauncher",
  title: "Il launcher che i tuoi giocatori",
  titleAccent: "terranno davvero.",
  subtitle:
    "Creare un launcher Minecraft richiedeva uno sviluppatore, settimane di lavoro e un budget. Qui: pochi minuti, nessun codice, ed è gratis.",
  ctaPrimary: "Crea il mio launcher",
  ctaSecondary: "Vedi un esempio",
  reasonsTitle: "Sei motivi per sceglierlo",
  reasonsIntro:
    "Pensato per server che vogliono un’esperienza professionale senza team tecnico.",
  reasons: [
    {
      icon: "⚡",
      title: "Pronto in pochi minuti",
      desc: "Niente da compilare né da ospitare. Configuri, pubblichi e i giocatori inseriscono un codice.",
    },
    {
      icon: "🔄",
      title: "Aggiornamenti automatici",
      desc: "Cambi un mod sul sito? Il launcher lo rileva al riavvio e lo applica da solo.",
    },
    {
      icon: "☕",
      title: "Zero supporto tecnico",
      desc: "Java è installato automaticamente, i file vengono verificati e il pulsante Ripara risolve quasi tutto.",
    },
    {
      icon: "🎨",
      title: "Con la tua identità",
      desc: "Logo, colori, sfondo, notizie ed eventi: il launcher porta l’identità del tuo server.",
    },
    {
      icon: "🧩",
      title: "Mod in un clic",
      desc: "Ricerca integrata Modrinth e CurseForge. Fabric, Forge, Quilt e NeoForge automatici.",
    },
    {
      icon: "💚",
      title: "Gratis, senza trucchi",
      desc: "Nessun abbonamento, nessuna funzione a pagamento, nessuna carta.",
    },
  ],
  compareTitle: "YourLauncher o launcher fatto in casa?",
  compareIntro: "Quello che risparmi scegliendo una piattaforma pronta.",
  compareUs: "YourLauncher",
  compareOthers: "Launcher fatto in casa",
  rows: [
    {
      label: "Tempo di avvio",
      us: "Pochi minuti",
      others: "Settimane di sviluppo",
    },
    { label: "Competenze richieste", us: "Nessuna", others: "Java / Electron" },
    { label: "Costo", us: "Gratis", others: "Sviluppatore + hosting" },
    {
      label: "Aggiornare i mod",
      us: "Automatico",
      others: "Ricompilare e ridistribuire",
    },
    {
      label: "Installazione di Java",
      us: "Automatica",
      others: "Problema del giocatore",
    },
    { label: "Manutenzione", us: "Inclusa", others: "A tuo carico" },
  ],
  finalTitle: "Convinto? Inizia ora.",
  finalSubtitle:
    "Gratis, senza impegno, il tuo primo launcher in pochi minuti.",
};

const copies: Record<Locale, WhyCopy> = { fr, en, es, de, pt, it };

export function getWhyCopy(locale: Locale): WhyCopy {
  return copies[locale] ?? fr;
}
