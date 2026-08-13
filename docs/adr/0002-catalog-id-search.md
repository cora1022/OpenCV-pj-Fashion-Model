# ADR 0002: Catalog ID search

Re-search uses a stored `catalogItemId` vector instead of downloading the result image
URL. This removes the server-side request forgery surface and makes re-search stable.
