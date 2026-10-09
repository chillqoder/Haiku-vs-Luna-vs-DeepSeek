import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { DEFAULT_SIMULATION_MANIFEST } from "@/diorama/defaultManifest";
import type { SimulationManifest } from "@/diorama/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isSimulationManifest(value: unknown): value is SimulationManifest {
  if (!value || typeof value !== "object") return false;
  const manifest = value as Partial<SimulationManifest>;
  return Number.isInteger(manifest.version) &&
    Array.isArray(manifest.island?.center) &&
    Array.isArray(manifest.island?.topRadius) &&
    Array.isArray(manifest.characters);
}

export async function GET() {
  let manifest = DEFAULT_SIMULATION_MANIFEST;
  try {
    const source = await readFile(path.join(process.cwd(), "public", "simulation-config.json"), "utf8");
    const candidate: unknown = JSON.parse(source);
    if (!isSimulationManifest(candidate)) throw new Error("simulation-config.json does not match the manifest contract");
    manifest = candidate;
  } catch (error) {
    console.error("Could not read the live simulation manifest; returning the bundled fallback.", error);
  }

  return NextResponse.json(manifest, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Simulation-Version": String(manifest.version),
    },
  });
}
