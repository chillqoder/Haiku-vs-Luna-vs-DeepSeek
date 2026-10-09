'use client';

import { useEffect, useRef, useState } from 'react';
import { DioramaApp, type DioramaStatus } from '@/diorama/core/DioramaApp';

/**
 * Мост между React и движком: монтирует DioramaApp в контейнер и освобождает WebGL-контекст
 * при размонтировании. Строго-режим React монтирует компонент дважды, поэтому dispose() идемпотентен.
 */
export default function DioramaCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<DioramaStatus>({ state: 'loading' });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const app = new DioramaApp(container, { onStatus: setStatus });
    app.start();
    return () => app.dispose();
  }, []);

  return (
    <div className="diorama">
      <div ref={containerRef} className="diorama__stage" />
      <header className="diorama__title">
        <h1>Деревня на небесном острове</h1>
        <p>{describe(status)}</p>
      </header>
      {status.state === 'error' && (
        <p className="diorama__status" role="alert">
          Не удалось запустить симуляцию: {status.message}
        </p>
      )}
    </div>
  );
}

function describe(status: DioramaStatus): string {
  switch (status.state) {
    case 'loading':
      return 'Загружаем жителей…';
    case 'ready':
      return `Жителей на острове: ${status.characters}. Тяните, чтобы вращать, колесо — приблизить.`;
    case 'error':
      return 'Сцена показана без персонажей.';
  }
}
