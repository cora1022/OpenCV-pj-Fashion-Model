# Local catalog

Only images that you own or may redistribute belong in `catalog/images`. Copy
`manifest.example.json` to the ignored `manifest.json`, add an item for every local
image, and record its owner and license in `rights`.

The indexer never downloads `sourceUrl`; it is metadata only. `imagePath` is always
resolved below `catalog/images`, so absolute paths and `..` are rejected.

```powershell
uv run python -m backend.app.catalog.indexer validate --manifest catalog/manifest.json
uv run python -m backend.app.catalog.indexer index --manifest catalog/manifest.json
```

Use `--recreate` only when intentionally replacing an incompatible collection.

## Local legacy Naver catalog

Previously collected Naver Shopping crops may be used for local development only.
Their redistribution rights are not assumed: `catalog/manifest.json` and every file
under `catalog/images` are ignored by Git and must not be pushed to the public
repository.

The migration tool does not call the Naver API or download product images. It copies
only crop files already present on the local machine and reuses their existing
FashionCLIP vectors from the legacy Qdrant collection.

```powershell
uv run python -m backend.app.catalog.import_legacy_naver prepare `
  --source-url http://127.0.0.1:6335 `
  --source-images ../OpenCV-pj-Fashion-Model/saved_cropped_images_fashionclip `
  --target-images catalog/images `
  --manifest catalog/manifest.json

docker compose --env-file .env.example exec backend python -m backend.app.catalog.import_legacy_naver index-vectors `
  --source-url http://host.docker.internal:6335 `
  --target-url http://qdrant:6333 `
  --manifest /app/catalog/manifest.json `
  --recreate
```

Use the local catalog only as a temporary search demonstration. Replace it with a
rights-cleared catalog before publishing images or deploying a public portfolio.
