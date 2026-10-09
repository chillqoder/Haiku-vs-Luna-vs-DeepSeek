'use client';

import dynamic from 'next/dynamic';

// WebGL и window недоступны на сервере, поэтому 3D-клиент подгружается только в браузере.
const DioramaCanvas = dynamic(() => import('@/components/DioramaCanvas'), {
  ssr: false,
  loading: () => <div className="diorama__fallback">Загрузка сцены…</div>,
});

export default function Page() {
  return <DioramaCanvas />;
}
