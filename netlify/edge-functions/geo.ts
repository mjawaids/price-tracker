// GET /api/geo → { country, countryName, city } for the visitor's connection, from the
// host's own IP lookup (Netlify `context.geo`). Used once, on the first run, to suggest a
// city (src/lib/geo.ts). Nothing is stored or logged, and the answer is never cached.

interface Geo {
  city?: string;
  country?: { code?: string; name?: string };
}

export default (_request: Request, context: { geo?: Geo }) => {
  const geo = context.geo ?? {};
  return new Response(
    JSON.stringify({
      country: geo.country?.code ?? null,
      countryName: geo.country?.name ?? null,
      city: geo.city ?? null,
    }),
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff',
      },
    },
  );
};

export const config = {
  path: '/api/geo',
  method: 'GET',
  // If it fails, the request falls through to the app's page, which the client reads as "no answer".
  onError: 'bypass',
};
