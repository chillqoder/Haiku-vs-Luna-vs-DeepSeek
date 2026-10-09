import manifest from "../../public/simulation-config.json";
import type { SimulationManifest } from "./types";

/** Bundled fallback; the API reads the same JSON file at request time. */
export const DEFAULT_SIMULATION_MANIFEST = manifest as unknown as SimulationManifest;
