import { gzipSync } from "node:zlib";
import { readFile, readdir, stat } from "node:fs/promises";

const distUrl = new URL("../dist/", import.meta.url);
const authoredFiles = (await readdir(distUrl)).filter((name) => name.endsWith(".js"));
const authoredBuffers = await Promise.all(authoredFiles.map((name) => readFile(new URL(name, distUrl))));
const browserPath = new URL("../dist/browser/cuviq.js", import.meta.url);
const browser = await readFile(browserPath);
const authoredGzip = authoredBuffers.reduce((total, buffer) => total + gzipSync(buffer).byteLength, 0);
const totalGzip = gzipSync(browser).byteLength;
const browserRaw = (await stat(browserPath)).size;

console.log(`CuViq-authored ESM: ${(authoredGzip / 1024).toFixed(1)} KiB gzip`);
console.log(`Standalone browser ESM: ${(totalGzip / 1024).toFixed(1)} KiB gzip (${(browserRaw / 1024).toFixed(1)} KiB raw)`);

if (authoredGzip > 35 * 1024) {
  throw new Error("CuViq-authored bundle exceeds the 35 KiB gzip budget.");
}

if (totalGzip > 250 * 1024) {
  throw new Error("Standalone viewer exceeds the 250 KiB gzip target.");
}
