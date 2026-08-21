# Data policy

Do not add external product images, scraped catalog data, `.env` files, API keys,
passwords, Qdrant storage, or model caches to Git. Each catalog item must have an
owner and license in the manifest. `sourceUrl` documents provenance only; Style Finder
does not download it.

Legacy Naver Shopping crops and their migrated vectors are local verification data.
`catalog/manifest.json`, `catalog/images/*` and Qdrant volumes remain ignored and must
not be published or deployed as a public catalog. A public portfolio deployment requires
a separate rights-cleared manifest and a verifiable pinned model revision.
