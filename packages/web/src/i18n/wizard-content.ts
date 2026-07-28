import type { Locale } from "./config";

type WizardCopy = {
  shorts: string[];
  step: string;
  of: string;
  progressLabel: string;
  stepsLabel: string;
  reassurance: string;
  showPreview: string;
  hidePreview: string;
  previous: string;
  continue: string;
  dashboard: string;
  livePreview: string;
  fullscreen: string;
  previewText: string;
  saveError: string;
  saving: string;
  saved: string;
  autosaved: string;
};

const fr: WizardCopy = {
  shorts: [
    "Modèle",
    "Identité",
    "Design",
    "Minecraft",
    "Contenu",
    "Actualités",
    "Communauté",
    "Serveur",
    "Publication",
  ],
  step: "Étape",
  of: "sur",
  progressLabel: "Progression de la configuration",
  stepsLabel: "Étapes de configuration",
  reassurance:
    "Tout est enregistré automatiquement dès que ton projet est créé.",
  showPreview: "Voir l’aperçu",
  hidePreview: "Masquer l’aperçu",
  previous: "Précédent",
  continue: "Continuer",
  dashboard: "Revenir au dashboard",
  livePreview: "Aperçu en direct",
  fullscreen: "Plein écran",
  previewText:
    "Le rendu se met à jour immédiatement. C’est cette interface que tes joueurs utiliseront.",
  saveError: "Erreur de sauvegarde",
  saving: "Sauvegarde…",
  saved: "Enregistré",
  autosaved: "Modifications auto-sauvegardées",
};

const en: WizardCopy = {
  shorts: [
    "Template",
    "Identity",
    "Design",
    "Minecraft",
    "Content",
    "News",
    "Community",
    "Server",
    "Publish",
  ],
  step: "Step",
  of: "of",
  progressLabel: "Configuration progress",
  stepsLabel: "Configuration steps",
  reassurance: "Everything is saved automatically once your project exists.",
  showPreview: "Show preview",
  hidePreview: "Hide preview",
  previous: "Previous",
  continue: "Continue",
  dashboard: "Back to dashboard",
  livePreview: "Live preview",
  fullscreen: "Full screen",
  previewText:
    "The rendering updates instantly. This is the interface your players will use.",
  saveError: "Save error",
  saving: "Saving…",
  saved: "Saved",
  autosaved: "Changes saved automatically",
};

const es: WizardCopy = {
  shorts: [
    "Plantilla",
    "Identidad",
    "Diseño",
    "Minecraft",
    "Contenido",
    "Noticias",
    "Comunidad",
    "Servidor",
    "Publicación",
  ],
  step: "Paso",
  of: "de",
  progressLabel: "Progreso de configuración",
  stepsLabel: "Pasos de configuración",
  reassurance: "Todo se guarda automáticamente al crear el proyecto.",
  showPreview: "Ver vista previa",
  hidePreview: "Ocultar vista previa",
  previous: "Anterior",
  continue: "Continuar",
  dashboard: "Volver al panel",
  livePreview: "Vista previa en directo",
  fullscreen: "Pantalla completa",
  previewText:
    "El resultado se actualiza al instante. Esta es la interfaz que usarán tus jugadores.",
  saveError: "Error al guardar",
  saving: "Guardando…",
  saved: "Guardado",
  autosaved: "Cambios guardados automáticamente",
};

const de: WizardCopy = {
  shorts: [
    "Vorlage",
    "Identität",
    "Design",
    "Minecraft",
    "Inhalte",
    "Neuigkeiten",
    "Community",
    "Server",
    "Veröffentlichen",
  ],
  step: "Schritt",
  of: "von",
  progressLabel: "Fortschritt der Einrichtung",
  stepsLabel: "Einrichtungsschritte",
  reassurance: "Nach dem Erstellen wird alles automatisch gespeichert.",
  showPreview: "Vorschau zeigen",
  hidePreview: "Vorschau ausblenden",
  previous: "Zurück",
  continue: "Weiter",
  dashboard: "Zurück zum Dashboard",
  livePreview: "Live-Vorschau",
  fullscreen: "Vollbild",
  previewText:
    "Die Darstellung wird sofort aktualisiert. Diese Oberfläche sehen deine Spieler.",
  saveError: "Speicherfehler",
  saving: "Wird gespeichert…",
  saved: "Gespeichert",
  autosaved: "Änderungen automatisch gespeichert",
};

const pt: WizardCopy = {
  shorts: [
    "Modelo",
    "Identidade",
    "Design",
    "Minecraft",
    "Conteúdo",
    "Notícias",
    "Comunidade",
    "Servidor",
    "Publicação",
  ],
  step: "Etapa",
  of: "de",
  progressLabel: "Progresso da configuração",
  stepsLabel: "Etapas da configuração",
  reassurance: "Tudo é salvo automaticamente depois de criar o projeto.",
  showPreview: "Ver prévia",
  hidePreview: "Ocultar prévia",
  previous: "Anterior",
  continue: "Continuar",
  dashboard: "Voltar ao painel",
  livePreview: "Prévia ao vivo",
  fullscreen: "Tela cheia",
  previewText:
    "O resultado é atualizado imediatamente. Esta é a interface que seus jogadores usarão.",
  saveError: "Erro ao salvar",
  saving: "Salvando…",
  saved: "Salvo",
  autosaved: "Alterações salvas automaticamente",
};

const it: WizardCopy = {
  shorts: [
    "Modello",
    "Identità",
    "Design",
    "Minecraft",
    "Contenuti",
    "Notizie",
    "Community",
    "Server",
    "Pubblicazione",
  ],
  step: "Passaggio",
  of: "di",
  progressLabel: "Avanzamento della configurazione",
  stepsLabel: "Passaggi di configurazione",
  reassurance: "Tutto viene salvato automaticamente dopo la creazione.",
  showPreview: "Mostra anteprima",
  hidePreview: "Nascondi anteprima",
  previous: "Indietro",
  continue: "Continua",
  dashboard: "Torna alla dashboard",
  livePreview: "Anteprima dal vivo",
  fullscreen: "Schermo intero",
  previewText:
    "Il risultato si aggiorna subito. Questa è l’interfaccia che useranno i giocatori.",
  saveError: "Errore di salvataggio",
  saving: "Salvataggio…",
  saved: "Salvato",
  autosaved: "Modifiche salvate automaticamente",
};

const content: Record<Locale, WizardCopy> = { fr, en, es, de, pt, it };

export function getWizardCopy(locale: Locale): WizardCopy {
  return content[locale] ?? fr;
}
