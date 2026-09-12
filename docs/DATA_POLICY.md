# Data policy

Do not add external product images, scraped catalog data, `.env` files, API keys,
passwords, Qdrant storage, or model caches to Git. Each catalog item must have an
owner and license in the manifest. `sourceUrl` documents provenance only; Style Finder
does not download it.

Legacy Naver Shopping crops and their migrated vectors are local verification data.
`catalog/manifest.json`, `catalog/images/*` and Qdrant volumes remain ignored and must
not be published or deployed as a public catalog. A public portfolio deployment requires
a separate rights-cleared manifest and a verifiable pinned model revision.

New public-catalog indexing defaults to FashionCLIP commit
`7e3ba62ce16b379a1ab479346b66f192e76f51b7`. This pin applies only to vectors produced by the
current indexer. The historical Naver vectors were created before revision evidence was recorded;
`main` in an old local manifest is an unverified historical label, not proof that those vectors use
the current commit. New legacy imports therefore use the explicit label `legacy-unverified`.

Local legacy images, manifests and vectors must remain on the developer machine. The public catalog
directory keeps only an example manifest and `.gitkeep`; no network image downloader is provided.
