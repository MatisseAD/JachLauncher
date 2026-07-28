import type { Locale } from "./config";

type AccountCopy = {
  page: {
    settings: string;
    title: string;
    intro: string;
    creator: string;
    launchers: string;
    published: string;
    freeSlots: string;
    memberSince: string;
    identity: string;
    profile: string;
    security: string;
    passwordTitle: string;
    passwordText: string;
  };
  editor: {
    photo: string;
    photoHint: string;
    choose: string;
    sending: string;
    username: string;
    email: string;
    confirm: string;
    confirmHint: string;
    save: string;
    saving: string;
    profileSaved: string;
    avatarSaved: string;
    failed: string;
    uploadFailed: string;
  };
  password: {
    current: string;
    next: string;
    hint: string;
    update: string;
    updating: string;
    success: string;
    failed: string;
  };
};

const fr: AccountCopy = {
  page: {
    settings: "Paramètres",
    title: "Mon compte",
    intro: "Gère ton profil créateur et la sécurité de ta session.",
    creator: "Créateur YourLauncher",
    launchers: "Launchers",
    published: "Publiés",
    freeSlots: "Places libres",
    memberSince: "Membre depuis",
    identity: "Identité",
    profile: "Profil et coordonnées",
    security: "Sécurité",
    passwordTitle: "Modifier le mot de passe",
    passwordText:
      "Utilise un mot de passe unique d’au moins huit caractères pour protéger ton espace.",
  },
  editor: {
    photo: "Photo de profil",
    photoHint: "PNG, JPG ou WebP · 4 Mo maximum",
    choose: "Choisir une image",
    sending: "Envoi…",
    username: "Pseudo public",
    email: "Adresse e-mail",
    confirm: "Mot de passe actuel pour confirmer",
    confirmHint:
      "Demandé uniquement lorsque tu enregistres le pseudo ou l’e-mail.",
    save: "Enregistrer le profil",
    saving: "Enregistrement…",
    profileSaved: "Profil mis à jour.",
    avatarSaved: "Photo de profil mise à jour.",
    failed: "Modification impossible.",
    uploadFailed: "Envoi impossible.",
  },
  password: {
    current: "Mot de passe actuel",
    next: "Nouveau mot de passe",
    hint: "Minimum 8 caractères.",
    update: "Mettre à jour",
    updating: "Mise à jour…",
    success: "Mot de passe mis à jour ✓",
    failed: "Connexion impossible. Réessaie dans quelques instants.",
  },
};
const en: AccountCopy = {
  page: {
    settings: "Settings",
    title: "My account",
    intro: "Manage your creator profile and session security.",
    creator: "YourLauncher creator",
    launchers: "Launchers",
    published: "Published",
    freeSlots: "Free slots",
    memberSince: "Member since",
    identity: "Identity",
    profile: "Profile and contact details",
    security: "Security",
    passwordTitle: "Change password",
    passwordText:
      "Use a unique password of at least eight characters to protect your space.",
  },
  editor: {
    photo: "Profile picture",
    photoHint: "PNG, JPG or WebP · 4 MB maximum",
    choose: "Choose an image",
    sending: "Uploading…",
    username: "Public username",
    email: "Email address",
    confirm: "Current password to confirm",
    confirmHint: "Only required when saving your username or email.",
    save: "Save profile",
    saving: "Saving…",
    profileSaved: "Profile updated.",
    avatarSaved: "Profile picture updated.",
    failed: "Update failed.",
    uploadFailed: "Upload failed.",
  },
  password: {
    current: "Current password",
    next: "New password",
    hint: "At least 8 characters.",
    update: "Update",
    updating: "Updating…",
    success: "Password updated ✓",
    failed: "Connection failed. Please try again shortly.",
  },
};
const es: AccountCopy = {
  page: {
    settings: "Ajustes",
    title: "Mi cuenta",
    intro: "Gestiona tu perfil y la seguridad de la sesión.",
    creator: "Creador YourLauncher",
    launchers: "Launchers",
    published: "Publicados",
    freeSlots: "Plazas libres",
    memberSince: "Miembro desde",
    identity: "Identidad",
    profile: "Perfil y contacto",
    security: "Seguridad",
    passwordTitle: "Cambiar contraseña",
    passwordText: "Usa una contraseña única de al menos ocho caracteres.",
  },
  editor: {
    photo: "Foto de perfil",
    photoHint: "PNG, JPG o WebP · máximo 4 MB",
    choose: "Elegir imagen",
    sending: "Subiendo…",
    username: "Usuario público",
    email: "Correo electrónico",
    confirm: "Contraseña actual para confirmar",
    confirmHint: "Solo se pide al guardar usuario o correo.",
    save: "Guardar perfil",
    saving: "Guardando…",
    profileSaved: "Perfil actualizado.",
    avatarSaved: "Foto actualizada.",
    failed: "No se pudo modificar.",
    uploadFailed: "No se pudo subir.",
  },
  password: {
    current: "Contraseña actual",
    next: "Nueva contraseña",
    hint: "Mínimo 8 caracteres.",
    update: "Actualizar",
    updating: "Actualizando…",
    success: "Contraseña actualizada ✓",
    failed: "Error de conexión. Inténtalo de nuevo.",
  },
};
const de: AccountCopy = {
  page: {
    settings: "Einstellungen",
    title: "Mein Konto",
    intro: "Verwalte Profil und Sitzungssicherheit.",
    creator: "YourLauncher-Ersteller",
    launchers: "Launcher",
    published: "Veröffentlicht",
    freeSlots: "Freie Plätze",
    memberSince: "Mitglied seit",
    identity: "Identität",
    profile: "Profil und Kontaktdaten",
    security: "Sicherheit",
    passwordTitle: "Passwort ändern",
    passwordText:
      "Nutze ein einzigartiges Passwort mit mindestens acht Zeichen.",
  },
  editor: {
    photo: "Profilbild",
    photoHint: "PNG, JPG oder WebP · maximal 4 MB",
    choose: "Bild wählen",
    sending: "Wird hochgeladen…",
    username: "Öffentlicher Name",
    email: "E-Mail-Adresse",
    confirm: "Aktuelles Passwort zur Bestätigung",
    confirmHint: "Nur beim Speichern von Name oder E-Mail nötig.",
    save: "Profil speichern",
    saving: "Wird gespeichert…",
    profileSaved: "Profil aktualisiert.",
    avatarSaved: "Profilbild aktualisiert.",
    failed: "Änderung fehlgeschlagen.",
    uploadFailed: "Upload fehlgeschlagen.",
  },
  password: {
    current: "Aktuelles Passwort",
    next: "Neues Passwort",
    hint: "Mindestens 8 Zeichen.",
    update: "Aktualisieren",
    updating: "Wird aktualisiert…",
    success: "Passwort aktualisiert ✓",
    failed: "Verbindung fehlgeschlagen. Bitte erneut versuchen.",
  },
};
const pt: AccountCopy = {
  page: {
    settings: "Configurações",
    title: "Minha conta",
    intro: "Gerencie seu perfil e a segurança da sessão.",
    creator: "Criador YourLauncher",
    launchers: "Launchers",
    published: "Publicados",
    freeSlots: "Vagas livres",
    memberSince: "Membro desde",
    identity: "Identidade",
    profile: "Perfil e contato",
    security: "Segurança",
    passwordTitle: "Alterar senha",
    passwordText: "Use uma senha única com pelo menos oito caracteres.",
  },
  editor: {
    photo: "Foto de perfil",
    photoHint: "PNG, JPG ou WebP · máximo 4 MB",
    choose: "Escolher imagem",
    sending: "Enviando…",
    username: "Nome público",
    email: "E-mail",
    confirm: "Senha atual para confirmar",
    confirmHint: "Necessária apenas ao salvar nome ou e-mail.",
    save: "Salvar perfil",
    saving: "Salvando…",
    profileSaved: "Perfil atualizado.",
    avatarSaved: "Foto atualizada.",
    failed: "Não foi possível alterar.",
    uploadFailed: "Falha no envio.",
  },
  password: {
    current: "Senha atual",
    next: "Nova senha",
    hint: "Mínimo de 8 caracteres.",
    update: "Atualizar",
    updating: "Atualizando…",
    success: "Senha atualizada ✓",
    failed: "Falha de conexão. Tente novamente.",
  },
};
const it: AccountCopy = {
  page: {
    settings: "Impostazioni",
    title: "Il mio account",
    intro: "Gestisci profilo e sicurezza della sessione.",
    creator: "Creator YourLauncher",
    launchers: "Launcher",
    published: "Pubblicati",
    freeSlots: "Posti liberi",
    memberSince: "Membro dal",
    identity: "Identità",
    profile: "Profilo e contatti",
    security: "Sicurezza",
    passwordTitle: "Cambia password",
    passwordText: "Usa una password unica di almeno otto caratteri.",
  },
  editor: {
    photo: "Foto profilo",
    photoHint: "PNG, JPG o WebP · massimo 4 MB",
    choose: "Scegli immagine",
    sending: "Invio…",
    username: "Nome pubblico",
    email: "Indirizzo e-mail",
    confirm: "Password attuale per confermare",
    confirmHint: "Richiesta solo quando salvi nome o e-mail.",
    save: "Salva profilo",
    saving: "Salvataggio…",
    profileSaved: "Profilo aggiornato.",
    avatarSaved: "Foto aggiornata.",
    failed: "Modifica non riuscita.",
    uploadFailed: "Invio non riuscito.",
  },
  password: {
    current: "Password attuale",
    next: "Nuova password",
    hint: "Minimo 8 caratteri.",
    update: "Aggiorna",
    updating: "Aggiornamento…",
    success: "Password aggiornata ✓",
    failed: "Connessione non riuscita. Riprova.",
  },
};
const copies: Record<Locale, AccountCopy> = { fr, en, es, de, pt, it };
export function getAccountCopy(locale: Locale): AccountCopy {
  return copies[locale] ?? fr;
}
