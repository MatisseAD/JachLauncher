"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import type { Locale } from "@/i18n/config";

// Mockup d'accueil dédié, aéré et propre (purple) — PAS le skin complet
// (qui était trop dense/illisible à cette taille).
const P = "#8b5cf6";
const P2 = "#c4b5fd";

export default function HeroMockup() {
  const { locale } = useI18n();
  const copy = MOCKUP_COPY[locale];
  const [pct, setPct] = useState(28);
  useEffect(() => {
    const t = setInterval(() => setPct((p) => (p >= 100 ? 12 : p + 3)), 250);
    return () => clearInterval(t);
  }, []);
  const labels = copy.progress;
  const label = labels[Math.min(labels.length - 1, Math.floor(pct / 26))];

  return (
    <div
      className="mockup-float"
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 11",
        borderRadius: 18,
        overflow: "hidden",
        border: "1px solid rgba(168,130,255,0.28)",
        boxShadow:
          "0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(139,92,246,0.18)",
        background:
          "radial-gradient(700px 360px at 78% -5%, rgba(139,92,246,0.35), transparent 60%), radial-gradient(500px 320px at 0% 105%, rgba(167,139,250,0.22), transparent 60%), #120c1e",
        color: "#ece8f7",
        fontFamily: "inherit",
      }}
    >
      {/* Barre de titre */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "13px 16px",
        }}
      >
        <span style={dot("#ff5f57")} />
        <span style={dot("#febc2e")} />
        <span style={dot("#28c840")} />
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "rgba(236,232,247,0.5)",
          }}
        >
          YourLauncher
        </span>
      </div>

      <div
        style={{
          padding: "4px 22px 22px",
          display: "flex",
          flexDirection: "column",
          height: "calc(100% - 46px)",
        }}
      >
        {/* En-tête serveur */}
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 13,
              background: `linear-gradient(135deg, ${P}, ${P2})`,
              boxShadow: `0 0 22px ${P}66`,
              flex: "none",
            }}
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: 21, lineHeight: 1.1 }}>
              {copy.title}
            </div>
            <div
              style={{
                color: "rgba(236,232,247,0.6)",
                fontSize: 12,
                marginTop: 2,
              }}
            >
              1.20.1 · Fabric · Survie
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <span style={chip("rgba(88,101,242,1)", "#fff")}>💬 Discord</span>
          </div>
        </div>

        {/* Statut serveur + actu, côte à côte */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr",
            gap: 12,
            marginTop: 16,
            flex: 1,
            minHeight: 0,
          }}
        >
          <div style={card()}>
            <div style={sectionTitle}>{copy.news.toUpperCase()}</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 9,
                  background: "linear-gradient(135deg,#2a2140,#3a2d5e)",
                  flex: "none",
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                  {copy.season}
                </div>
                <div style={{ fontSize: 11, color: "rgba(236,232,247,0.55)" }}>
                  {copy.twoDaysAgo}
                </div>
              </div>
            </div>
          </div>
          <div style={card()}>
            <div style={sectionTitle}>{copy.server.toUpperCase()}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: "#3ad07a",
                  boxShadow: "0 0 10px #3ad07a",
                }}
              />
              <span style={{ fontWeight: 700 }}>{copy.online}</span>
            </div>
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 800 }}>128</span>
              <span style={{ color: "rgba(236,232,247,0.55)", fontSize: 13 }}>
                {" "}
                / 500 {copy.players}
              </span>
            </div>
          </div>
        </div>

        {/* Bas : progression + bouton JOUER */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 14,
            marginTop: 16,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "rgba(236,232,247,0.6)",
                marginBottom: 6,
              }}
            >
              <span>{label}</span>
              <span>{pct}%</span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 999,
                background: "rgba(255,255,255,0.1)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${P}, ${P2})`,
                  transition: "width 0.25s linear",
                }}
              />
            </div>
          </div>
          <button
            style={{
              border: "none",
              borderRadius: 13,
              padding: "14px 38px",
              fontWeight: 800,
              fontSize: 17,
              color: "#fff",
              cursor: "default",
              background: `linear-gradient(120deg, ${P}, ${P2})`,
              boxShadow: `0 10px 34px ${P}77`,
              flex: "none",
            }}
          >
            ▶ {copy.play}
          </button>
        </div>
      </div>
    </div>
  );
}

const MOCKUP_COPY: Record<
  Locale,
  {
    title: string;
    news: string;
    season: string;
    twoDaysAgo: string;
    server: string;
    online: string;
    players: string;
    play: string;
    progress: [string, string, string, string];
  }
> = {
  fr: {
    title: "Skyblock Légendaire",
    news: "Actualités",
    season: "Ouverture saison 3 !",
    twoDaysAgo: "Il y a 2 jours",
    server: "Serveur",
    online: "En ligne",
    players: "joueurs",
    play: "JOUER",
    progress: [
      "Vérification des fichiers…",
      "Téléchargement des mods…",
      "Optimisation du lancement…",
      "Minecraft démarre…",
    ],
  },
  en: {
    title: "Legendary Skyblock",
    news: "News",
    season: "Season 3 is open!",
    twoDaysAgo: "2 days ago",
    server: "Server",
    online: "Online",
    players: "players",
    play: "PLAY",
    progress: [
      "Checking files…",
      "Downloading mods…",
      "Optimizing launch…",
      "Starting Minecraft…",
    ],
  },
  es: {
    title: "Skyblock Legendario",
    news: "Noticias",
    season: "¡Temporada 3 abierta!",
    twoDaysAgo: "Hace 2 días",
    server: "Servidor",
    online: "En línea",
    players: "jugadores",
    play: "JUGAR",
    progress: [
      "Verificando archivos…",
      "Descargando mods…",
      "Optimizando…",
      "Iniciando Minecraft…",
    ],
  },
  de: {
    title: "Legendäres Skyblock",
    news: "Neuigkeiten",
    season: "Saison 3 ist eröffnet!",
    twoDaysAgo: "Vor 2 Tagen",
    server: "Server",
    online: "Online",
    players: "Spieler",
    play: "SPIELEN",
    progress: [
      "Dateien werden geprüft…",
      "Mods werden geladen…",
      "Start wird optimiert…",
      "Minecraft startet…",
    ],
  },
  pt: {
    title: "Skyblock Lendário",
    news: "Notícias",
    season: "Temporada 3 aberta!",
    twoDaysAgo: "Há 2 dias",
    server: "Servidor",
    online: "Online",
    players: "jogadores",
    play: "JOGAR",
    progress: [
      "Verificando arquivos…",
      "Baixando mods…",
      "Otimizando…",
      "Iniciando Minecraft…",
    ],
  },
  it: {
    title: "Skyblock Leggendario",
    news: "Notizie",
    season: "Stagione 3 aperta!",
    twoDaysAgo: "2 giorni fa",
    server: "Server",
    online: "Online",
    players: "giocatori",
    play: "GIOCA",
    progress: [
      "Verifica dei file…",
      "Download delle mod…",
      "Ottimizzazione…",
      "Avvio di Minecraft…",
    ],
  },
};

function dot(c: string): CSSProperties {
  return { width: 11, height: 11, borderRadius: "50%", background: c };
}
function chip(bg: string, color: string): CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 700,
    padding: "5px 10px",
    borderRadius: 8,
    background: bg,
    color,
  };
}
function card(): CSSProperties {
  return {
    background: "rgba(20,14,32,0.6)",
    border: "1px solid rgba(168,130,255,0.16)",
    borderRadius: 13,
    padding: 13,
    backdropFilter: "blur(6px)",
  };
}
const sectionTitle: CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.08em",
  color: "rgba(236,232,247,0.5)",
  marginBottom: 9,
  fontWeight: 700,
};
