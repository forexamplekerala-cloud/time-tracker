self.addEventListener('install', (event) => {
  // Skip caching for Phase 1 MVP, just ensure installability
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Network first, falling back to basic offline page if implemented
  // For Phase 1, just pass through everything
});
