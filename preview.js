const viewer = document.querySelector("#viewer");
const fileInput = document.querySelector("#file");
const message = document.querySelector("#message");

fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  message.textContent = `Loading ${file.name}…`;
  try {
    await viewer.load(file);
    message.textContent = `Showing ${file.name}`;
  } catch {
    message.textContent = `Could not display ${file.name}. Use a single-file, uncompressed GLB.`;
  }
});
