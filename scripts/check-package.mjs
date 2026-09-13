import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFile, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Validate what npm consumers install, with no source aliases or skipLibCheck.
// Keep the isolated fixture after a failure so it can be inspected locally.
const root = fileURLToPath(new URL("../", import.meta.url));
const fixture = await mkdtemp(join(tmpdir(), "cuviq-package-check-"));
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run this check with npm run check:package.");
const npm = (args, cwd = fixture, capture = false) => execFileSync(
  process.execPath, [npmCli, ...args],
  { cwd, stdio: capture ? "pipe" : "inherit", encoding: "utf8" },
);

const lock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
console.log(`Installed-package fixture: ${fixture}`);
// Older npm versions can mix lifecycle logs into --json output. The tarball
// filename is deterministic, so do not parse command output as package data.
const tarball = join(fixture, `${lock.name.replace(/^@/, "").replace("/", "-")}-${lock.version}.tgz`);
npm(["pack", root, "--ignore-scripts"], fixture, true);
const version = (name) => lock.packages[`node_modules/${name}`].version;
await writeFile(join(fixture, "package.json"), JSON.stringify({ private: true, type: "module" }));
await copyFile(new URL("../tests/types/package-consumer.tsx.fixture", import.meta.url), join(fixture, "consumer.tsx"));
npm([
  "install", "--ignore-scripts", "--no-audit", "--no-fund", "--no-package-lock",
  tarball,
  `typescript@${version("typescript")}`, `react@${version("react")}`,
  `@types/react@${version("@types/react")}`,
]);

const installed = JSON.parse(await readFile(join(fixture, "node_modules/cuviq-viewer/package.json"), "utf8"));
assert.equal(installed.version, lock.version);
for (const resolution of ["Bundler", "NodeNext", "Node16"]) {
  const config = {
    compilerOptions: {
      target: "ES2022", lib: ["ES2022", "DOM", "DOM.Iterable"],
      module: resolution === "Bundler" ? "ESNext" : resolution,
      moduleResolution: resolution, jsx: "react-jsx", strict: true,
      exactOptionalPropertyTypes: true, skipLibCheck: false, noEmit: true,
      types: ["react"],
    },
    include: ["consumer.tsx"],
  };
  await writeFile(join(fixture, "tsconfig.json"), JSON.stringify(config, null, 2));
  execFileSync(process.execPath, [join(fixture, "node_modules/typescript/bin/tsc"), "-p", "tsconfig.json"], {
    cwd: fixture, stdio: "inherit",
  });
  console.log(`Packed ${installed.name}@${installed.version}: ${resolution} types passed.`);
}

execFileSync(process.execPath, ["--input-type=module", "-e", `
  import assert from 'node:assert/strict';
  assert.equal(typeof document, 'undefined');
  const pkg = await import('cuviq-viewer');
  await import('cuviq-viewer/auto');
  await import('cuviq-viewer/react');
  assert.equal(pkg.CUVIQ_VIEWER_TAG, 'cuviq-viewer');
  pkg.defineCuviqViewer();
`], { cwd: fixture, stdio: "inherit" });
console.log("Packed root, auto, and React entries: Node SSR import passed.");
