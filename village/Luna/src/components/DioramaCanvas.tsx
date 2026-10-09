"use client";

import { useEffect, useRef, useState } from "react";
import { DioramaApp } from "@/diorama/core/DioramaApp";

interface DioramaCanvasProps {
  paused: boolean;
  onAppReady?: (app: DioramaApp | null) => void;
}

export default function DioramaCanvas({ paused, onAppReady }: DioramaCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<DioramaApp | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    let app: DioramaApp | null = null;
    try {
      app = new DioramaApp(container);
      app.setPaused(paused);
      appRef.current = app;
      app.start();
      onAppReady?.(app);
    } catch (cause) {
      console.error("Could not initialize the WebGL scene.", cause);
      setError("This browser could not start the 3D scene. Try enabling WebGL or opening the page in a modern browser.");
    }

    return () => {
      app?.dispose();
      appRef.current = null;
      onAppReady?.(null);
    };
  }, [onAppReady]);

  useEffect(() => {
    appRef.current?.setPaused(paused);
  }, [paused]);

  return (
    <div ref={mountRef} className="canvas-root" aria-label="Cloudrest village scene">
      {error && <div className="canvas-error" role="status">{error}</div>}
    </div>
  );
}
