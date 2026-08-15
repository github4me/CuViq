# CuViq model delivery guide

## Preferred assets

Use a single GLB whenever possible. A hosted GLTF is supported when its buffer and texture URLs resolve relative to the GLTF document and all responses are reachable from the page under browser CORS rules.

Recommended engineering budgets:

| Asset property | Recommendation | High-risk threshold |
| --- | --- | --- |
| Transfer size | 3–8 MB | Above 20 MB |
| Triangles | At most 300,000 | Above 800,000 |
| Individual texture | At most 2048 × 2048 | 4096 × 4096 without demonstrated benefit |

Keep model transforms finite and include visible geometry. CuViq rejects empty, non-finite, and effectively zero-sized bounds.

## HTTP and CORS

- Serve GLB as `model/gltf-binary` or `application/octet-stream`.
- Serve GLTF as `model/gltf+json` or JSON.
- Serve every GLTF dependency with a correct content type and `Access-Control-Allow-Origin` covering the page origin.
- Preserve relative paths when publishing a GLTF and its dependencies.
- Use compression at the HTTP layer where appropriate and long-lived immutable caching for versioned assets.

## Compression extensions

The default V1 entry contains no Draco, KTX2/Basis, or Meshopt decoder payload. Re-export assets without those extensions unless a separately approved decoder entry is available.

## Product checks

Before release, inspect representative metallic, painted/plastic, dark, elongated, and offset-origin products. Verify initial framing, a complete horizontal orbit, bounded pinch/wheel zoom, portrait/landscape resize, and repeated loading on target phones.
