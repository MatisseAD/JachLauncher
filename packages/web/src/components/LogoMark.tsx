"use client";

import { useState } from "react";

/**
 * Marque YourLauncher : vrai logo (image) + wordmark texte.
 * Repli sur le cube CSS si le fichier /logo.png est absent.
 */
export default function LogoMark({
  size = 34,
  text = true,
}: {
  size?: number;
  text?: boolean;
}) {
  const [err, setErr] = useState(false);
  return (
    <>
      {err ? (
        <span className="cube" />
      ) : (
        <img
          src="/logo.png"
          alt="YourLauncher"
          width={size}
          height={size}
          style={{ display: "block", borderRadius: 7, objectFit: "contain" }}
          onError={() => setErr(true)}
        />
      )}
      {text && (
        <span>
          Your<b>Launcher</b>
        </span>
      )}
    </>
  );
}
