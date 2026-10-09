"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import type { DioramaApp } from "@/diorama/core/DioramaApp";

const DioramaCanvas = dynamic(() => import("@/components/DioramaCanvas"), {
  ssr: false,
  loading: () => <div className="canvas-loading" aria-label="Loading village scene" />,
});

export default function HomePage() {
  const [paused, setPaused] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [app, setApp] = useState<DioramaApp | null>(null);
  const handleReady = useCallback((instance: DioramaApp | null) => setApp(instance), []);

  return (
    <main className="experience">
      <DioramaCanvas paused={paused} onAppReady={handleReady} />

      <header className="brand-block">
        <a className="brand-mark" href="#home" aria-label="Cloudrest home">
          <span className="brand-icon">✳</span>
          <span>CLOUDREST</span>
        </a>
        <div className="brand-caption">A living island in the clouds</div>
      </header>

      <div className="top-right">
        <div className="live-pill"><span className="live-dot" /> SIMULATION LIVE</div>
        <button
          className={`icon-button ${showGuide ? "selected" : ""}`}
          type="button"
          aria-label={showGuide ? "Hide scene guide" : "Show scene guide"}
          title="Scene guide"
          onClick={() => setShowGuide((value) => !value)}
        >
          <span>i</span>
        </button>
      </div>

      {showGuide && (
        <aside className="guide-card">
          <div className="guide-kicker">EXPLORE THE ISLAND</div>
          <p>Drag to orbit. Scroll to move closer. The villagers keep to their daily routines.</p>
          <div className="guide-key"><span className="key-glyph">↻</span> Drag to rotate</div>
          <div className="guide-key"><span className="key-glyph">⌕</span> Scroll to zoom</div>
        </aside>
      )}

      <section className="intro-card" aria-label="Village overview">
        <div className="eyebrow"><span className="sun-symbol">✦</span> THE NORTHWARD ISLES</div>
        <h1>Cloudrest</h1>
        <p>A little kingdom, floating a long way from anywhere.</p>
        <div className="intro-divider" />
        <div className="quick-stats">
          <div><strong>10</strong><span>ISLANDERS</span></div>
          <div><strong>04</strong><span>COTTAGES</span></div>
          <div><strong>01</strong><span>KEEP</span></div>
        </div>
      </section>

      <div className="place-label place-keep"><span className="label-line" />THE KEEP</div>
      <div className="place-label place-pond"><span className="label-line" />MIRROR POND</div>
      <div className="place-label place-wood"><span className="label-line" />WOODCUTTER&apos;S YARD</div>

      <footer className="bottom-bar">
        <div className="bottom-note"><span className="weather-icon">☀</span><span>Fair skies <i>·</i> gentle breeze</span></div>
        <div className="camera-hint"><span className="mouse-glyph">⌖</span> DRAG TO EXPLORE</div>
        <div className="scene-controls">
          <button className="control-button" type="button" onClick={() => app?.resetCamera()}>
            <span className="reset-icon">⟳</span><span>RESET VIEW</span>
          </button>
          <span className="control-separator" />
          <button className="control-button pause-button" type="button" onClick={() => setPaused((value) => !value)}>
            <span className="pause-icon">{paused ? "▶" : "Ⅱ"}</span><span>{paused ? "RESUME" : "PAUSE"}</span>
          </button>
        </div>
      </footer>
    </main>
  );
}
