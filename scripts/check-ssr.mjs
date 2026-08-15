delete globalThis.window;
delete globalThis.document;
delete globalThis.customElements;
await import(new URL("../dist/index.js", import.meta.url));
console.log("SSR-safe package import passed.");
