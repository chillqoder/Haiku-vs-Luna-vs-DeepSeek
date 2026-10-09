'use client';

import dynamic from 'next/dynamic';

const DioramaCanvas = dynamic(() => import('@/components/DioramaCanvas'), {
  ssr: false,
  loading: () => (
    <div className="boot-screen">
      <div className="boot-spinner" />
      <p>Preparing the sky island…</p>
    </div>
  ),
});

export default function DioramaCanvasMount() {
  return <DioramaCanvas />;
}
