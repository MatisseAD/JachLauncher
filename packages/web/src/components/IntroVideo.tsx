"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// Intro vidéo YourLauncher jouée une fois par session, à l'arrivée sur le site.
const KEY = "yl_intro_seen_v1";

export default function IntroVideo() {
  const [show, setShow] = useState(false);
  const [closing, setClosing] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dismissed = useRef(false);

  function dismiss() {
    if (dismissed.current) return;
    dismissed.current = true;
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setClosing(true);
    setTimeout(() => setShow(false), 450);
  }

  function unmute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setMuted(false);
    v.play().catch(() => {});
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted) v.play().catch(() => {});
  }

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
    } catch {
      return;
    }
    setShow(true);
  }, []);

  // Lance la lecture : tente AVEC le son, repli en muet si le navigateur bloque.
  useEffect(() => {
    if (!show) return;
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.play()
      .then(() => setMuted(false))
      .catch(() => {
        v.muted = true;
        setMuted(true);
        v.play().catch(() => {});
      });
    const t = setTimeout(dismiss, 30000); // filet de sécurité
    return () => clearTimeout(t);
  }, [show]);

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(800px 500px at 50% 30%, rgba(124,58,237,0.18), transparent 60%), #07050d",
        opacity: closing ? 0 : 1,
        transition: "opacity 0.45s ease",
      }}
    >
      <video
        ref={videoRef}
        src="/video.mp4"
        playsInline
        onEnded={dismiss}
        onError={dismiss}
        onClick={() => muted && unmute()}
        style={{
          maxWidth: "min(92vw, 760px)",
          maxHeight: "82vh",
          borderRadius: 18,
          boxShadow: "0 30px 90px rgba(124,58,237,0.45)",
          cursor: muted ? "pointer" : "default",
        }}
      />

      {/* Bouton son : visible surtout si le navigateur a forcé le muet */}
      <button onClick={toggleMute} style={{ ...pillBtn, left: 24, right: "auto" }}>
        {muted ? "🔊 Activer le son" : "🔇 Couper le son"}
      </button>

      <button onClick={dismiss} style={{ ...pillBtn, right: 24 }}>
        Passer ▸
      </button>
    </div>
  );
}

const pillBtn: CSSProperties = {
  position: "absolute",
  top: 22,
  padding: "9px 16px",
  borderRadius: 9,
  border: "1px solid rgba(168,130,255,0.35)",
  background: "rgba(255,255,255,0.08)",
  color: "#ece8f7",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  backdropFilter: "blur(6px)",
};
