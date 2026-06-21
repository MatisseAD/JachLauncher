"use client";

// Particules pixel flottantes (CSS only) pour l'ambiance gaming.
// Valeurs DÉTERMINISTES (dérivées de l'index) pour éviter tout décalage
// d'hydratation entre le rendu serveur et le rendu client.
const COLORS = ["#8b5cf6", "#a78bfa", "#c4b5fd", "#7c3aed"];

// Pseudo-aléatoire déterministe par hash entier (uint32) : bit-identique
// serveur/client (arithmétique entière), donc aucun décalage d'hydratation.
function rand(n: number): number {
  let x = (n * 2654435761) >>> 0;
  x = ((x ^ (x >>> 15)) * 2246822519) >>> 0;
  x = ((x ^ (x >>> 13)) * 3266489917) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return x / 4294967296;
}

export default function Particles({ count = 16 }: { count?: number }) {
  const items = Array.from({ length: count }).map((_, i) => ({
    left: Math.round(rand(i + 1) * 100),
    size: 6 + Math.round(rand(i + 2) * 12),
    duration: 9 + Math.round(rand(i + 3) * 12),
    delay: Math.round(rand(i + 4) * 12),
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="particles" aria-hidden>
      {items.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 12px ${p.color}`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
