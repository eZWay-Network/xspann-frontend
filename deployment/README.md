# XSpann production deployment

Frontend: https://xspann.webermelon.dev
Backend: https://dash-xspann.webermelon.dev

The supplied `dashj-xspann.webermelon.dev` hostname did not resolve during deployment. The existing `dash-xspann.webermelon.dev/api/v1/feed` endpoint was verified and is configured instead.

## Runtime

- Node.js 22, locked dependencies installed with `npm ci`.
- Production build served by `xspann-frontend.service` as `xspan6811`, listening only on `127.0.0.1:3100`.
- Service enabled at boot with automatic restart.
- OpenLiteSpeed proxies this domain to Node; HTTP redirects to HTTPS. Existing SSL and ACME challenge settings are retained.
- Browser requests use `/api/v1`; Next.js rewrites forward to the backend over HTTPS. This avoids the backend's current cross-origin browser restriction and preserves bearer-token authentication and multipart requests.
- Backend `/storage/**` and `/media/**` image URLs are allowed by Next.js image configuration.

The ignored `.env.production` contains:

```dotenv
NEXT_PUBLIC_API_URL=/api/v1
API_BACKEND_URL=https://dash-xspann.webermelon.dev
NEXT_TELEMETRY_DISABLED=1
```

Both URL settings require a rebuild when changed. `API_BACKEND_URL` is an origin, without `/api/v1`.

## Operations

```bash
systemctl status xspann-frontend.service
journalctl -u xspann-frontend.service -n 100 --no-pager
systemctl restart xspann-frontend.service
```

The installed service is `/etc/systemd/system/xspann-frontend.service`; its source is `deployment/xspann-frontend.service`. The virtual host is `/usr/local/lsws/conf/vhosts/xspann.webermelon.dev/vhost.conf`. Original virtual-host backup: `vhost.conf.pre-next-20260924T103557Z` in the same directory. Proxy and HTTPS rewrite snippets are included alongside this document.

The configuration follows the [OpenLiteSpeed reverse-proxy guide](https://docs.openlitespeed.org/config/reverseproxy/).

For future in-place deployments, schedule maintenance: stop the service before replacing dependencies or `.next`, preserve the production environment and configuration changes, install with `npm ci`, run lint and build, set `.next` ownership, and start the service after the build succeeds. Run these commands as root from this project directory:

```bash
systemctl stop xspann-frontend.service
npm ci --no-audit --no-fund
npm run lint
NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=1536 npm run build
# Only continue after the build succeeds:
chown -R xspan6811:xspan6811 .next
chown xspan6811:xspan6811 .env.production
chmod 600 .env.production
systemctl start xspann-frontend.service
curl --fail --silent --show-error https://xspann.webermelon.dev/api/v1/feed?limit=1
```

## Verification and remaining application limitations

Deployment passed production build, TypeScript, ESLint, and browser checks at desktop and mobile sizes. Public/auth pages render, protected routes redirect to login, the feed API returns 200, and an intentionally invalid login returns the backend's 422 validation response. No browser JavaScript errors were observed. Project files and environment files return 404 through the frontend proxy. Authentication requests send `Accept: application/json`; unauthenticated `/api/v1/auth/me` returns 401 with that header.

No real-account credentials were supplied, so successful sign-in, account creation, uploads, and account-specific actions were not exercised. No test account was created.

The backend currently returns zero published videos. Existing application code displays bundled demo posts in that case; their view requests return 404 because those IDs do not exist in the backend. The search page also uses bundled mock data. These behaviors are in the pulled application code. Optional Jamendo music search has no client ID configured and retains its built-in local-track fallback.

The global OpenLiteSpeed configuration check reports pre-existing errors for other virtual hosts. Comparison with the original XSpann configuration found no new issues from the proxy change. No other virtual-host configurations were edited.
