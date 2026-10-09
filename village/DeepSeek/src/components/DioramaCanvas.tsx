'use client';

import { useEffect, useRef, useState } from 'react';
import type { DioramaApp, AppStatus } from '@/diorama/core/DioramaApp';

export interface DioramaCanvasProps {
  configUrl?: string;
}

const STATUS_LABEL: Record<AppStatus, string> = {
  booting: 'Booting renderer…',
  loading: 'Loading simulation manifest…',
  ready: 'Simulation live',
  error: 'Failed to start',
};

export default function DioramaCanvas({
  configUrl = '/api/simulation-config',
}: DioramaCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<AppStatus>('booting');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let app: DioramaApp | null = null;

    const boot = async () => {
      try {
        const { DioramaApp: App } = await import('@/diorama/core/DioramaApp');
        if (disposed) return;
        app = new App({ container: host, configUrl, onStatus: setStatus });
        await app.start();
      } catch (error) {
        console.error('[diorama] failed to boot', error);
        setStatus('error');
      }
    };

    void boot();

    return () => {
      disposed = true;
      app?.dispose();
      app = null;
    };
  }, [configUrl]);

  return (
    <div className="diorama-host" ref={hostRef}>
      <div className="hud hud-title">
        <h1>Skyhold Village</h1>
        <p>Living medieval diorama · drag to orbit · scroll to zoom</p>
      </div>
      <div className={`hud hud-status status-${status}`}>{STATUS_LABEL[status]}</div>
      <div className="hud hud-legend">
        <span>
          <strong>13</strong> residents
        </span>
        <span>
          <strong>King</strong> surveys from the balcony
        </span>
        <span>
          <strong>Guards</strong> patrol gate &amp; perimeter
        </span>
        <span>
          <strong>Villagers</strong> chop, cook, fish &amp; play tag
        </span>
      </div>
    </div>
  );
}
