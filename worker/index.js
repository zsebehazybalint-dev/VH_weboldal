// Egyetlen Worker belépési pont - a Cloudflare projekt ("vh-weboldal") a
// "Workers" platformon fut (nem a klasszikus Pages-en, lásd ADMIN_SETUP.md),
// ezért a `functions/` mappa automatikus Pages-routingja nem működik: ez a
// fájl kézzel route-olja a kéréseket ugyanazokra a handler-ekre, amiket a
// functions/ mappa exportál, a többit pedig a statikus asset-kiszolgálóra
// engedi át.
import { onRequestGet as adminGet } from '../functions/admin.js';
import { onRequestGet as defaultsGet } from '../functions/api/episode-defaults.js';
import { onRequestPost as episodePost } from '../functions/api/episode.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/admin' && request.method === 'GET') {
      return adminGet({ request, env, ctx });
    }
    if (url.pathname === '/api/episode-defaults' && request.method === 'GET') {
      return defaultsGet({ request, env, ctx });
    }
    if (url.pathname === '/api/episode' && request.method === 'POST') {
      return episodePost({ request, env, ctx });
    }

    // Az assets binding `html_handling = "none"`-ra van állítva (hogy a
    // meglévő canonical/OG/sitemap ".html"-es URL-eket ne írja át/irányítsa
    // át a Cloudflare), ezért a "/" -> "index.html" directory-index logikát
    // itt kell kézzel pótolni.
    if (url.pathname === '/') {
      return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
    }

    return env.ASSETS.fetch(request);
  },
};
