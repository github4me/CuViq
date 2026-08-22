<script setup lang="ts">
import "cuviq/auto";
import type { CuviqErrorDetail, CuviqReadyDetail } from "cuviq";

function onReady(event: Event): void {
  const { source } = (event as CustomEvent<CuviqReadyDetail>).detail;
  console.log(`Loaded ${String(source)}`);
}

function onError(event: Event): void {
  const { code, message } = (event as CustomEvent<CuviqErrorDetail>).detail;
  console.error(code, message);
}
</script>

<template>
  <cuviq-viewer
    src="/models/product.glb"
    poster="/images/product.webp"
    alt="Interactive 3D product model"
    :width="640"
    :height="480"
    @cuviq-ready="onReady"
    @cuviq-error="onError"
  />
</template>
