import type { RequestHandler } from 'express';
import { createProxyMiddleware, type Options } from 'http-proxy-middleware';
import { fail } from '@ecom/shared';
import type { Logger } from '@ecom/service-kit';

export interface ProxyRouteOptions {
  /** Public prefix as the browser sees it, e.g. `/api/products`. */
  prefix: string;
  /** The path the upstream actually serves, e.g. `/products`. */
  upstreamPrefix: string;
  target: string;
  logger: Logger;
}

/**
 * Mounted at the app root rather than with `app.use(prefix, ...)` on purpose:
 * an Express mount path is stripped from req.url before the handler runs, which
 * would leave pathRewrite with nothing to match. Filtering by prefix instead
 * keeps the full path intact so the rewrite works.
 */
export function proxyRoute({
  prefix,
  upstreamPrefix,
  target,
  logger,
}: ProxyRouteOptions): RequestHandler {
  const options: Options = {
    target,
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: 10_000,
    timeout: 10_000,
    pathFilter: (path) => path === prefix || path.startsWith(`${prefix}/`),
    pathRewrite: { [`^${prefix}`]: upstreamPrefix },
    on: {
      proxyReq: (proxyReq, req) => {
        const requestId = (req as { requestId?: string }).requestId;
        if (requestId) {
          proxyReq.setHeader('x-request-id', requestId);
        }
      },
      error: (err, _req, res) => {
        logger.error({ err, target }, 'Upstream proxy error');

        // `res` here is a raw ServerResponse, not an Express response.
        if ('writeHead' in res && !res.headersSent) {
          res.writeHead(503, { 'content-type': 'application/json' });
          res.end(
            JSON.stringify(
              fail(
                'SERVICE_UNAVAILABLE',
                'That service is temporarily unavailable — try again shortly'
              )
            )
          );
        }
      },
    },
  };

  return createProxyMiddleware(options);
}
