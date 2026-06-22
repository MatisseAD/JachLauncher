"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// Intro vidéo YourLauncher jouée une fois par session, à l'arrivée sur le site.
const KEY = "yl_intro_seen_v1";

export default function IntroVideo() {
  const [show, setShow] = useState(false);
  const [closing, setClosing] = useState(false);
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

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
    } catch {
      return;
    }
    setShow(true);
    // Filet de sécurité si l'événement "ended" ne se déclenche pas.
    const t = setTimeout(dismiss, 30000);
    return () => clearTimeout(t);
  }, []);

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
        src="/video.mp4"
        autoPlay
        muted
        playsInline
        onEnded={dismiss}
        onError={dismiss}
        style={{
          maxWidth: "min(92vw, 760px)",
          maxHeight: "82vh",
          borderRadius: 18,
          boxShadow: "0 30px 90px rgba(124,58,237,0.45)",
        }}
      />
      <button onClick={dismiss} style={skipBtn}>
        Passer ▸
      </button>
    </div>
  );
}

const skipBtn: CSSProperties = {
  position: "absolute",
  top: 22,
  right: 24,
  padding: "9px 16px",
  borderRadius: 9,
  border: "1px solid rgba(168,130,255,0.35)",
  background: "rgba(255,255,255,0.06)",
  color: "#ece8f7",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  backdropFilter: "blur(6px)",
};
