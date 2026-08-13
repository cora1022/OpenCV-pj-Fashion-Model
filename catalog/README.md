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
