import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { ManifestError, parseSimulationManifest } from '@/diorama/simulation/manifest';

// Манифест читается с диска на каждый запрос: правка JSON применяется после перезагрузки страницы,
// без пересборки 3D-клиента.
export const dynamic = 'force-dynamic';

const MANIFEST_PATH = path.join(process.cwd(), 'config', 'simulation-manifest.json');

export async function GET() {
  try {
    const raw = await readFile(MANIFEST_PATH, 'utf8');
    const manifest = parseSimulationManifest(JSON.parse(raw));
    return NextResponse.json(manifest, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const isManifestError = error instanceof ManifestError;
    const detail = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return NextResponse.json(
      { error: isManifestError ? 'Некорректный манифест симуляции' : 'Не удалось прочитать манифест', detail },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
