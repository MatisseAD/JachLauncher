import type { Locale } from "./config";

type AuthCopy = {
  creatorSpace: string;
  loginHero: string;
  loginIntro: string;
  metrics: string;
  secure: string;
  preview: string;
  madeFor: string;
  back: string;
  loginSubtitle: string;
  identifier: string;
  identifierPlaceholder: string;
  free: string;
  registerHero: string;
  registerIntro: string;
  promise: string;
  promiseText: string;
  registerSubtitle: string;
  email: string;
  optional: string;
  emailHint: string;
  usernamePlaceholder: string;
};
const fr: AuthCopy = {
  creatorSpace: "Espace créateur",
  loginHero: "Retrouve tous tes launchers au même endroit.",
  loginIntro:
    "Modifie une version, publie une actualité et suis l’activité de tes joueurs depuis ton dashboard.",
  metrics: "Historique des mises à jour sur 7 jours",
  secure: "Session sécurisée",
  preview: "Prévisualisation instantanée",
  madeFor: "Créé pour Minecraft",
  back: "Retour au site",
  loginSubtitle: "Entre tes identifiants pour accéder à ton espace.",
  identifier: "Pseudo ou adresse e-mail",
  identifierPlaceholder: "Pseudo ou e-mail",
  free: "Gratuit pour commencer",
  registerHero: "Transforme ton serveur en vraie expérience de jeu.",
  registerIntro:
    "Crée jusqu’à trois launchers, personnalise-les entièrement et partage un simple code avec tes joueurs.",
  promise: "Pas de code. Pas de carte bancaire.",
  promiseText: "Ton premier launcher peut être prêt en quelques minutes.",
  registerSubtitle: "Trois informations suffisent pour créer ton espace.",
  email: "Adresse e-mail",
  optional: "facultatif",
  emailHint: "Utile pour identifier ton compte avec une adresse unique.",
  usernamePlaceholder: "Choisis ton identifiant",
};
const en: AuthCopy = {
  creatorSpace: "Creator space",
  loginHero: "Find all your launchers in one place.",
  loginIntro:
    "Change a version, publish news and track player activity from your dashboard.",
  metrics: "7-day update history",
  secure: "Secure session",
  preview: "Instant preview",
  madeFor: "Built for Minecraft",
  back: "Back to website",
  loginSubtitle: "Enter your credentials to access your space.",
  identifier: "Username or email",
  identifierPlaceholder: "Username or email",
  free: "Free to get started",
  registerHero: "Turn your server into a complete game experience.",
  registerIntro:
    "Create up to three launchers, fully customize them and share one simple code.",
  promise: "No code. No credit card.",
  promiseText: "Your first launcher can be ready in minutes.",
  registerSubtitle: "Three details are enough to create your space.",
  email: "Email address",
  optional: "optional",
  emailHint: "Useful for identifying your account with a unique address.",
  usernamePlaceholder: "Choose your username",
};
const es: AuthCopy = {
  creatorSpace: "Espacio del creador",
  loginHero: "Todos tus launchers en un solo lugar.",
  loginIntro:
    "Cambia versiones, publica noticias y sigue la actividad desde el panel.",
  metrics: "Historial de cambios de 7 días",
  secure: "Sesión segura",
  preview: "Vista previa instantánea",
  madeFor: "Creado para Minecraft",
  back: "Volver al sitio",
  loginSubtitle: "Introduce tus datos para acceder.",
  identifier: "Usuario o correo",
  identifierPlaceholder: "Usuario o correo",
  free: "Gratis para empezar",
  registerHero: "Convierte tu servidor en una verdadera experiencia.",
  registerIntro:
    "Crea hasta tres launchers, personalízalos y comparte un código.",
  promise: "Sin código. Sin tarjeta.",
  promiseText: "Tu primer launcher puede estar listo en minutos.",
  registerSubtitle: "Tres datos bastan para crear tu espacio.",
  email: "Correo electrónico",
  optional: "opcional",
  emailHint: "Permite identificar tu cuenta con una dirección única.",
  usernamePlaceholder: "Elige tu usuario",
};
const de: AuthCopy = {
  creatorSpace: "Erstellerbereich",
  loginHero: "Alle deine Launcher an einem Ort.",
  loginIntro: "Ändere Versionen, veröffentliche News und verfolge Aktivität.",
  metrics: "7-Tage-Änderungsverlauf",
  secure: "Sichere Sitzung",
  preview: "Sofortige Vorschau",
  madeFor: "Für Minecraft entwickelt",
  back: "Zur Website",
  loginSubtitle: "Gib deine Daten ein, um den Bereich zu öffnen.",
  identifier: "Benutzername oder E-Mail",
  identifierPlaceholder: "Name oder E-Mail",
  free: "Kostenlos starten",
  registerHero: "Mach deinen Server zum echten Spielerlebnis.",
  registerIntro:
    "Erstelle bis zu drei Launcher, passe sie an und teile einen Code.",
  promise: "Kein Code. Keine Kreditkarte.",
  promiseText: "Dein erster Launcher ist in Minuten bereit.",
  registerSubtitle: "Drei Angaben genügen für dein Konto.",
  email: "E-Mail-Adresse",
  optional: "optional",
  emailHint: "Hilft, dein Konto eindeutig zu erkennen.",
  usernamePlaceholder: "Benutzernamen wählen",
};
const pt: AuthCopy = {
  creatorSpace: "Espaço do criador",
  loginHero: "Todos os seus launchers em um só lugar.",
  loginIntro: "Altere versões, publique notícias e acompanhe a atividade.",
  metrics: "Histórico de alterações de 7 dias",
  secure: "Sessão segura",
  preview: "Prévia instantânea",
  madeFor: "Criado para Minecraft",
  back: "Voltar ao site",
  loginSubtitle: "Digite seus dados para acessar.",
  identifier: "Usuário ou e-mail",
  identifierPlaceholder: "Usuário ou e-mail",
  free: "Grátis para começar",
  registerHero: "Transforme o servidor em uma experiência completa.",
  registerIntro:
    "Crie até três launchers, personalize e compartilhe um código.",
  promise: "Sem código. Sem cartão.",
  promiseText: "Seu primeiro launcher fica pronto em minutos.",
  registerSubtitle: "Três dados bastam para criar seu espaço.",
  email: "E-mail",
  optional: "opcional",
  emailHint: "Ajuda a identificar sua conta.",
  usernamePlaceholder: "Escolha seu usuário",
};
const it: AuthCopy = {
  creatorSpace: "Area creator",
  loginHero: "Tutti i launcher in un unico posto.",
  loginIntro: "Cambia versioni, pubblica notizie e segui l’attività.",
  metrics: "Cronologia modifiche di 7 giorni",
  secure: "Sessione sicura",
  preview: "Anteprima istantanea",
  madeFor: "Creato per Minecraft",
  back: "Torna al sito",
  loginSubtitle: "Inserisci i dati per accedere.",
  identifier: "Nome utente o e-mail",
  identifierPlaceholder: "Nome o e-mail",
  free: "Gratis per iniziare",
  registerHero: "Trasforma il server in una vera esperienza.",
  registerIntro:
    "Crea fino a tre launcher, personalizzali e condividi un codice.",
  promise: "Niente codice. Nessuna carta.",
  promiseText: "Il primo launcher può essere pronto in pochi minuti.",
  registerSubtitle: "Bastano tre dati per creare lo spazio.",
  email: "Indirizzo e-mail",
  optional: "facoltativo",
  emailHint: "Utile per identificare il tuo account.",
  usernamePlaceholder: "Scegli il nome utente",
};
const copies: Record<Locale, AuthCopy> = { fr, en, es, de, pt, it };
export function getAuthCopy(locale: Locale): AuthCopy {
  return copies[locale] ?? fr;
}
