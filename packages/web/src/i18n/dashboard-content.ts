import type { Locale } from "./config";

export type DashboardCopy = {
  shell: {
    overview: string;
    home: string;
    newLauncher: string;
    newShort: string;
    guide: string;
    account: string;
    creatorArea: string;
    supportTitle: string;
    supportText: string;
    openGuide: string;
    creatorAccount: string;
    operational: string;
    viewSite: string;
  };
  page: {
    overview: string;
    hello: string;
    intro: string;
    newLauncher: string;
    limit: string;
    launchers: string;
    available: string;
    production: string;
    drafts: string;
    loads: string;
    appSevenDays: string;
    content: string;
    contentKinds: string;
    playerActivity: string;
    launcherLoads: string;
    sevenDays: string;
    configOpenings: string;
    privateMetric: string;
    capacity: string;
    slots: string;
    freeSlots: string;
    quotaText: string;
    projects: string;
    myLaunchers: string;
    project: string;
    emptyTitle: string;
    emptyText: string;
    start: string;
    ready: string;
    playerApp: string;
    downloadTitle: string;
    downloadText: string;
    downloadSteps: [string, string, string];
    download: string;
    soon: string;
    fullGuide: string;
  };
  editor: {
    back: string;
    configuration: string;
    editIntro: string;
    published: string;
    ready: string;
    draft: string;
    guided: string;
    createTitle: string;
    createIntro: string;
    used: string;
    limitTitle: string;
    limitText: string;
    backToLaunchers: string;
  };
  card: {
    draft: string;
    ready: string;
    online: string;
    removeFavorite: string;
    addFavorite: string;
    publishError: string;
    duplicateError: string;
    deleteConfirm: string;
    deleteError: string;
    noDescription: string;
    updated: string;
    configure: string;
    openPreview: string;
    publish: string;
    unpublish: string;
    duplicate: string;
    remove: string;
  };
};

const fr: DashboardCopy = {
  shell: {
    overview: "Vue d’ensemble",
    home: "Accueil",
    newLauncher: "Nouveau launcher",
    newShort: "Nouveau",
    guide: "Guide d’utilisation",
    account: "Mon compte",
    creatorArea: "Espace créateur",
    supportTitle: "Besoin d’aide ?",
    supportText: "Le guide explique chaque étape, du code serveur au partage.",
    openGuide: "Ouvrir le guide",
    creatorAccount: "Compte créateur",
    operational: "Services opérationnels",
    viewSite: "Voir le site",
  },
  page: {
    overview: "Vue d’ensemble",
    hello: "Bonjour",
    intro:
      "Pilote tes launchers et publie tes mises à jour depuis un seul espace.",
    newLauncher: "Nouveau launcher",
    limit: "Limite atteinte",
    launchers: "Launchers",
    available: "disponibles",
    production: "En production",
    drafts: "brouillons",
    loads: "Projets modifiés",
    appSevenDays: "dernière mise à jour · 7 jours",
    content: "Contenus distribués",
    contentKinds: "mods, packs et shaders",
    playerActivity: "Activité des projets",
    launcherLoads: "Dernières mises à jour",
    sevenDays: "7 derniers jours",
    configOpenings: "projets modifiés au cours des 7 derniers jours",
    privateMetric: "Calculé à partir des mises à jour enregistrées du compte.",
    capacity: "Capacité du compte",
    slots: "Launchers disponibles",
    freeSlots: "places libres",
    quotaText: "La limite actuelle garantit une infrastructure stable.",
    projects: "Tes projets",
    myLaunchers: "Mes launchers",
    project: "projet",
    emptyTitle: "Crée ton premier launcher",
    emptyText:
      "Choisis son identité, connecte ton serveur et publie une expérience prête à jouer.",
    start: "Démarrer la création",
    ready: "Prêt à jouer",
    playerApp: "Application joueurs",
    downloadTitle: "Télécharger YourLauncher",
    downloadText:
      "Tes joueurs installent une seule application, saisissent le code publié et retrouvent automatiquement la bonne version et les contenus.",
    downloadSteps: [
      "Télécharge et installe l’application Windows.",
      "Connecte ton compte Minecraft.",
      "Entre le code du launcher publié.",
    ],
    download: "Télécharger pour Windows",
    soon: "Build Windows bientôt disponible",
    fullGuide: "Lire le guide complet",
  },
  editor: {
    back: "Retour au dashboard",
    configuration: "Configuration",
    editIntro: "Modifie l’expérience puis prévisualise avant de publier.",
    published: "Publié",
    ready: "Prêt",
    draft: "Brouillon",
    guided: "Assistant guidé",
    createTitle: "Créons ton launcher",
    createIntro:
      "Avance à ton rythme : chaque étape est expliquée et enregistrée.",
    used: "utilisés",
    limitTitle: "Limite de launchers atteinte",
    limitText:
      "Ton compte possède déjà {max} launchers. Supprime ou réutilise un projet existant avant d’en créer un autre.",
    backToLaunchers: "Revenir à mes launchers",
  },
  card: {
    draft: "Brouillon",
    ready: "Prêt",
    online: "En ligne",
    removeFavorite: "Retirer des favoris",
    addFavorite: "Ajouter aux favoris",
    publishError: "Impossible de modifier la publication.",
    duplicateError: "Impossible de dupliquer ce launcher.",
    deleteConfirm: "Supprimer ce launcher ? Cette action est définitive.",
    deleteError: "Impossible de supprimer ce launcher.",
    noDescription: "Aucune description pour le moment.",
    updated: "Mis à jour",
    configure: "Configurer",
    openPreview: "Ouvrir l’aperçu",
    publish: "Publier",
    unpublish: "Dépublier",
    duplicate: "Dupliquer",
    remove: "Supprimer",
  },
};

const en: DashboardCopy = {
  shell: {
    overview: "Overview",
    home: "Home",
    newLauncher: "New launcher",
    newShort: "New",
    guide: "User guide",
    account: "My account",
    creatorArea: "Creator space",
    supportTitle: "Need help?",
    supportText: "The guide explains every step, from server code to sharing.",
    openGuide: "Open the guide",
    creatorAccount: "Creator account",
    operational: "Services operational",
    viewSite: "View website",
  },
  page: {
    overview: "Overview",
    hello: "Hello",
    intro: "Manage your launchers and publish updates from one place.",
    newLauncher: "New launcher",
    limit: "Limit reached",
    launchers: "Launchers",
    available: "available",
    production: "In production",
    drafts: "drafts",
    loads: "Projects updated",
    appSevenDays: "latest update · 7 days",
    content: "Distributed content",
    contentKinds: "mods, packs and shaders",
    playerActivity: "Project activity",
    launcherLoads: "Latest updates",
    sevenDays: "Last 7 days",
    configOpenings: "projects updated during the last 7 days",
    privateMetric: "Calculated from updates recorded on this account.",
    capacity: "Account capacity",
    slots: "Available launchers",
    freeSlots: "free slots",
    quotaText: "The current limit keeps the infrastructure stable.",
    projects: "Your projects",
    myLaunchers: "My launchers",
    project: "project",
    emptyTitle: "Create your first launcher",
    emptyText:
      "Choose its identity, connect your server and publish a ready-to-play experience.",
    start: "Start creating",
    ready: "Ready to play",
    playerApp: "Player application",
    downloadTitle: "Download YourLauncher",
    downloadText:
      "Players install one app, enter your published code and automatically get the correct version and content.",
    downloadSteps: [
      "Download and install the Windows app.",
      "Sign in to your Minecraft account.",
      "Enter the published launcher code.",
    ],
    download: "Download for Windows",
    soon: "Windows build coming soon",
    fullGuide: "Read the full guide",
  },
  editor: {
    back: "Back to dashboard",
    configuration: "Configuration",
    editIntro: "Edit the experience, preview it, then publish.",
    published: "Published",
    ready: "Ready",
    draft: "Draft",
    guided: "Guided assistant",
    createTitle: "Let’s build your launcher",
    createIntro: "Move at your own pace: every step is explained and saved.",
    used: "used",
    limitTitle: "Launcher limit reached",
    limitText:
      "Your account already has {max} launchers. Delete or reuse an existing project before creating another.",
    backToLaunchers: "Back to my launchers",
  },
  card: {
    draft: "Draft",
    ready: "Ready",
    online: "Online",
    removeFavorite: "Remove from favorites",
    addFavorite: "Add to favorites",
    publishError: "Could not change publication.",
    duplicateError: "Could not duplicate this launcher.",
    deleteConfirm: "Delete this launcher? This cannot be undone.",
    deleteError: "Could not delete this launcher.",
    noDescription: "No description yet.",
    updated: "Updated",
    configure: "Configure",
    openPreview: "Open preview",
    publish: "Publish",
    unpublish: "Unpublish",
    duplicate: "Duplicate",
    remove: "Delete",
  },
};

const es: DashboardCopy = {
  shell: {
    overview: "Vista general",
    home: "Inicio",
    newLauncher: "Nuevo launcher",
    newShort: "Nuevo",
    guide: "Guía de uso",
    account: "Mi cuenta",
    creatorArea: "Espacio del creador",
    supportTitle: "¿Necesitas ayuda?",
    supportText: "La guía explica cada paso, del código al reparto.",
    openGuide: "Abrir la guía",
    creatorAccount: "Cuenta de creador",
    operational: "Servicios operativos",
    viewSite: "Ver el sitio",
  },
  page: {
    overview: "Vista general",
    hello: "Hola",
    intro:
      "Gestiona tus launchers y publica actualizaciones desde un solo lugar.",
    newLauncher: "Nuevo launcher",
    limit: "Límite alcanzado",
    launchers: "Launchers",
    available: "disponibles",
    production: "En producción",
    drafts: "borradores",
    loads: "Proyectos modificados",
    appSevenDays: "última actualización · 7 días",
    content: "Contenido distribuido",
    contentKinds: "mods, packs y shaders",
    playerActivity: "Actividad de proyectos",
    launcherLoads: "Últimas actualizaciones",
    sevenDays: "Últimos 7 días",
    configOpenings: "proyectos modificados durante los últimos 7 días",
    privateMetric: "Calculado a partir de las actualizaciones de la cuenta.",
    capacity: "Capacidad de la cuenta",
    slots: "Launchers disponibles",
    freeSlots: "plazas libres",
    quotaText: "El límite actual mantiene estable la infraestructura.",
    projects: "Tus proyectos",
    myLaunchers: "Mis launchers",
    project: "proyecto",
    emptyTitle: "Crea tu primer launcher",
    emptyText:
      "Elige su identidad, conecta el servidor y publica una experiencia lista.",
    start: "Empezar a crear",
    ready: "Listo para jugar",
    playerApp: "Aplicación para jugadores",
    downloadTitle: "Descargar YourLauncher",
    downloadText:
      "Los jugadores instalan una app, introducen el código y reciben versión y contenidos.",
    downloadSteps: [
      "Descarga e instala la app de Windows.",
      "Conecta tu cuenta de Minecraft.",
      "Introduce el código publicado.",
    ],
    download: "Descargar para Windows",
    soon: "Build de Windows próximamente",
    fullGuide: "Leer la guía completa",
  },
  editor: {
    back: "Volver al panel",
    configuration: "Configuración",
    editIntro: "Modifica la experiencia, revisa la vista previa y publica.",
    published: "Publicado",
    ready: "Listo",
    draft: "Borrador",
    guided: "Asistente guiado",
    createTitle: "Creemos tu launcher",
    createIntro: "Avanza a tu ritmo: cada paso está explicado y se guarda.",
    used: "usados",
    limitTitle: "Límite de launchers alcanzado",
    limitText:
      "Tu cuenta ya tiene {max} launchers. Elimina o reutiliza un proyecto antes de crear otro.",
    backToLaunchers: "Volver a mis launchers",
  },
  card: {
    draft: "Borrador",
    ready: "Listo",
    online: "En línea",
    removeFavorite: "Quitar de favoritos",
    addFavorite: "Añadir a favoritos",
    publishError: "No se pudo cambiar la publicación.",
    duplicateError: "No se pudo duplicar.",
    deleteConfirm: "¿Eliminar este launcher? Es definitivo.",
    deleteError: "No se pudo eliminar.",
    noDescription: "Sin descripción por ahora.",
    updated: "Actualizado",
    configure: "Configurar",
    openPreview: "Abrir vista previa",
    publish: "Publicar",
    unpublish: "Retirar",
    duplicate: "Duplicar",
    remove: "Eliminar",
  },
};

const de: DashboardCopy = {
  shell: {
    overview: "Übersicht",
    home: "Start",
    newLauncher: "Neuer Launcher",
    newShort: "Neu",
    guide: "Benutzerhandbuch",
    account: "Mein Konto",
    creatorArea: "Erstellerbereich",
    supportTitle: "Brauchst du Hilfe?",
    supportText: "Der Leitfaden erklärt jeden Schritt.",
    openGuide: "Leitfaden öffnen",
    creatorAccount: "Erstellerkonto",
    operational: "Dienste betriebsbereit",
    viewSite: "Website ansehen",
  },
  page: {
    overview: "Übersicht",
    hello: "Hallo",
    intro: "Verwalte Launcher und Updates an einem Ort.",
    newLauncher: "Neuer Launcher",
    limit: "Limit erreicht",
    launchers: "Launcher",
    available: "verfügbar",
    production: "In Produktion",
    drafts: "Entwürfe",
    loads: "Geänderte Projekte",
    appSevenDays: "letzte Aktualisierung · 7 Tage",
    content: "Verteilte Inhalte",
    contentKinds: "Mods, Packs und Shader",
    playerActivity: "Projektaktivität",
    launcherLoads: "Letzte Aktualisierungen",
    sevenDays: "Letzte 7 Tage",
    configOpenings: "in den letzten 7 Tagen geänderte Projekte",
    privateMetric: "Berechnet aus den gespeicherten Kontoaktualisierungen.",
    capacity: "Kontokapazität",
    slots: "Verfügbare Launcher",
    freeSlots: "freie Plätze",
    quotaText: "Das aktuelle Limit hält die Infrastruktur stabil.",
    projects: "Deine Projekte",
    myLaunchers: "Meine Launcher",
    project: "Projekt",
    emptyTitle: "Erstelle deinen ersten Launcher",
    emptyText: "Wähle Identität, verbinde den Server und veröffentliche.",
    start: "Erstellung starten",
    ready: "Spielbereit",
    playerApp: "Spieler-App",
    downloadTitle: "YourLauncher herunterladen",
    downloadText:
      "Spieler installieren eine App, geben den Code ein und erhalten Version und Inhalte.",
    downloadSteps: [
      "Windows-App laden und installieren.",
      "Minecraft-Konto verbinden.",
      "Veröffentlichten Code eingeben.",
    ],
    download: "Für Windows herunterladen",
    soon: "Windows-Build bald verfügbar",
    fullGuide: "Vollständigen Leitfaden lesen",
  },
  editor: {
    back: "Zurück zum Dashboard",
    configuration: "Konfiguration",
    editIntro: "Bearbeite das Erlebnis, prüfe die Vorschau und veröffentliche.",
    published: "Veröffentlicht",
    ready: "Bereit",
    draft: "Entwurf",
    guided: "Geführter Assistent",
    createTitle: "Erstellen wir deinen Launcher",
    createIntro:
      "Arbeite in deinem Tempo: Jeder Schritt wird erklärt und gespeichert.",
    used: "verwendet",
    limitTitle: "Launcher-Limit erreicht",
    limitText:
      "Dein Konto hat bereits {max} Launcher. Lösche oder verwende ein Projekt erneut, bevor du ein weiteres erstellst.",
    backToLaunchers: "Zurück zu meinen Launchern",
  },
  card: {
    draft: "Entwurf",
    ready: "Bereit",
    online: "Online",
    removeFavorite: "Aus Favoriten entfernen",
    addFavorite: "Zu Favoriten",
    publishError: "Veröffentlichung konnte nicht geändert werden.",
    duplicateError: "Duplizieren fehlgeschlagen.",
    deleteConfirm: "Launcher endgültig löschen?",
    deleteError: "Löschen fehlgeschlagen.",
    noDescription: "Noch keine Beschreibung.",
    updated: "Aktualisiert",
    configure: "Konfigurieren",
    openPreview: "Vorschau öffnen",
    publish: "Veröffentlichen",
    unpublish: "Zurückziehen",
    duplicate: "Duplizieren",
    remove: "Löschen",
  },
};

const pt: DashboardCopy = {
  shell: {
    overview: "Visão geral",
    home: "Início",
    newLauncher: "Novo launcher",
    newShort: "Novo",
    guide: "Guia de uso",
    account: "Minha conta",
    creatorArea: "Espaço do criador",
    supportTitle: "Precisa de ajuda?",
    supportText: "O guia explica cada etapa.",
    openGuide: "Abrir o guia",
    creatorAccount: "Conta de criador",
    operational: "Serviços operacionais",
    viewSite: "Ver o site",
  },
  page: {
    overview: "Visão geral",
    hello: "Olá",
    intro: "Gerencie launchers e publique atualizações em um só lugar.",
    newLauncher: "Novo launcher",
    limit: "Limite atingido",
    launchers: "Launchers",
    available: "disponíveis",
    production: "Em produção",
    drafts: "rascunhos",
    loads: "Projetos alterados",
    appSevenDays: "última atualização · 7 dias",
    content: "Conteúdo distribuído",
    contentKinds: "mods, packs e shaders",
    playerActivity: "Atividade dos projetos",
    launcherLoads: "Últimas atualizações",
    sevenDays: "Últimos 7 dias",
    configOpenings: "projetos alterados nos últimos 7 dias",
    privateMetric: "Calculado a partir das atualizações salvas da conta.",
    capacity: "Capacidade da conta",
    slots: "Launchers disponíveis",
    freeSlots: "vagas livres",
    quotaText: "O limite atual mantém a infraestrutura estável.",
    projects: "Seus projetos",
    myLaunchers: "Meus launchers",
    project: "projeto",
    emptyTitle: "Crie seu primeiro launcher",
    emptyText: "Defina a identidade, conecte o servidor e publique.",
    start: "Começar a criar",
    ready: "Pronto para jogar",
    playerApp: "Aplicativo dos jogadores",
    downloadTitle: "Baixar YourLauncher",
    downloadText:
      "Os jogadores instalam um app, digitam o código e recebem versão e conteúdos.",
    downloadSteps: [
      "Baixe e instale o app Windows.",
      "Conecte sua conta Minecraft.",
      "Digite o código publicado.",
    ],
    download: "Baixar para Windows",
    soon: "Build Windows em breve",
    fullGuide: "Ler o guia completo",
  },
  editor: {
    back: "Voltar ao painel",
    configuration: "Configuração",
    editIntro: "Edite a experiência, confira a prévia e publique.",
    published: "Publicado",
    ready: "Pronto",
    draft: "Rascunho",
    guided: "Assistente guiado",
    createTitle: "Vamos criar seu launcher",
    createIntro: "Avance no seu ritmo: cada etapa é explicada e salva.",
    used: "usados",
    limitTitle: "Limite de launchers atingido",
    limitText:
      "Sua conta já tem {max} launchers. Exclua ou reutilize um projeto antes de criar outro.",
    backToLaunchers: "Voltar aos meus launchers",
  },
  card: {
    draft: "Rascunho",
    ready: "Pronto",
    online: "Online",
    removeFavorite: "Remover dos favoritos",
    addFavorite: "Adicionar aos favoritos",
    publishError: "Não foi possível alterar a publicação.",
    duplicateError: "Não foi possível duplicar.",
    deleteConfirm: "Excluir este launcher definitivamente?",
    deleteError: "Não foi possível excluir.",
    noDescription: "Sem descrição por enquanto.",
    updated: "Atualizado",
    configure: "Configurar",
    openPreview: "Abrir prévia",
    publish: "Publicar",
    unpublish: "Despublicar",
    duplicate: "Duplicar",
    remove: "Excluir",
  },
};

const it: DashboardCopy = {
  shell: {
    overview: "Panoramica",
    home: "Home",
    newLauncher: "Nuovo launcher",
    newShort: "Nuovo",
    guide: "Guida utente",
    account: "Il mio account",
    creatorArea: "Area creator",
    supportTitle: "Serve aiuto?",
    supportText: "La guida spiega ogni passaggio.",
    openGuide: "Apri la guida",
    creatorAccount: "Account creator",
    operational: "Servizi operativi",
    viewSite: "Visita il sito",
  },
  page: {
    overview: "Panoramica",
    hello: "Ciao",
    intro: "Gestisci launcher e aggiornamenti da un unico spazio.",
    newLauncher: "Nuovo launcher",
    limit: "Limite raggiunto",
    launchers: "Launcher",
    available: "disponibili",
    production: "In produzione",
    drafts: "bozze",
    loads: "Progetti modificati",
    appSevenDays: "ultimo aggiornamento · 7 giorni",
    content: "Contenuti distribuiti",
    contentKinds: "mod, pack e shader",
    playerActivity: "Attività dei progetti",
    launcherLoads: "Ultimi aggiornamenti",
    sevenDays: "Ultimi 7 giorni",
    configOpenings: "progetti modificati negli ultimi 7 giorni",
    privateMetric: "Calcolato dagli aggiornamenti salvati dell’account.",
    capacity: "Capacità account",
    slots: "Launcher disponibili",
    freeSlots: "posti liberi",
    quotaText: "Il limite attuale mantiene stabile l’infrastruttura.",
    projects: "I tuoi progetti",
    myLaunchers: "I miei launcher",
    project: "progetto",
    emptyTitle: "Crea il primo launcher",
    emptyText: "Scegli l’identità, collega il server e pubblica.",
    start: "Inizia a creare",
    ready: "Pronto a giocare",
    playerApp: "App giocatori",
    downloadTitle: "Scarica YourLauncher",
    downloadText:
      "I giocatori installano un’app, inseriscono il codice e ricevono versione e contenuti.",
    downloadSteps: [
      "Scarica e installa l’app Windows.",
      "Collega l’account Minecraft.",
      "Inserisci il codice pubblicato.",
    ],
    download: "Scarica per Windows",
    soon: "Build Windows in arrivo",
    fullGuide: "Leggi la guida completa",
  },
  editor: {
    back: "Torna alla dashboard",
    configuration: "Configurazione",
    editIntro: "Modifica l’esperienza, controlla l’anteprima e pubblica.",
    published: "Pubblicato",
    ready: "Pronto",
    draft: "Bozza",
    guided: "Procedura guidata",
    createTitle: "Creiamo il tuo launcher",
    createIntro: "Procedi al tuo ritmo: ogni passaggio è spiegato e salvato.",
    used: "utilizzati",
    limitTitle: "Limite di launcher raggiunto",
    limitText:
      "Il tuo account ha già {max} launcher. Elimina o riutilizza un progetto prima di crearne un altro.",
    backToLaunchers: "Torna ai miei launcher",
  },
  card: {
    draft: "Bozza",
    ready: "Pronto",
    online: "Online",
    removeFavorite: "Rimuovi dai preferiti",
    addFavorite: "Aggiungi ai preferiti",
    publishError: "Impossibile cambiare la pubblicazione.",
    duplicateError: "Impossibile duplicare.",
    deleteConfirm: "Eliminare definitivamente il launcher?",
    deleteError: "Impossibile eliminare.",
    noDescription: "Nessuna descrizione.",
    updated: "Aggiornato",
    configure: "Configura",
    openPreview: "Apri anteprima",
    publish: "Pubblica",
    unpublish: "Ritira",
    duplicate: "Duplica",
    remove: "Elimina",
  },
};

const copies: Record<Locale, DashboardCopy> = { fr, en, es, de, pt, it };
export function getDashboardCopy(locale: Locale): DashboardCopy {
  return copies[locale] ?? fr;
}
