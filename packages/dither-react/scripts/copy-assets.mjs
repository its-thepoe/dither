import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcAssets = path.join(pkgRoot, "src", "assets");
const distAssets = path.join(pkgRoot, "dist", "assets");

fs.mkdirSync(path.join(pkgRoot, "dist"), { recursive: true });
fs.cpSync(srcAssets, distAssets, { recursive: true });
