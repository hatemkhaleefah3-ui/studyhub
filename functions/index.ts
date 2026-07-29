const CANONICAL_URL = 'https://study-hub-97u.pages.dev/';

/**
 * Serve a markdown representation of the homepage when an agent explicitly
 * requests text/markdown. Normal browser requests continue to receive the
 * existing Vite application unchanged.
 */
export const onRequestGet: PagesFunction = async ({ request, env }) => {
  const accept = request.headers.get('accept')?.toLowerCase() ?? '';

  if (!accept.includes('text/markdown')) {
    return env.ASSETS.fetch(request);
  }

  const markdownUrl = new URL('/index.md', request.url);
  const asset = await env.ASSETS.fetch(markdownUrl);
  const headers = new Headers(asset.headers);
  headers.set('Content-Type', 'text/markdown; charset=utf-8');
  headers.set('Link', `<${CANONICAL_URL}>; rel="canonical"`);
  headers.set('Vary', 'Accept');

  return new Response(asset.body, {
    status: asset.status,
    statusText: asset.statusText,
    headers,
  });
};
