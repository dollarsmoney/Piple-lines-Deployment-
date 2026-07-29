import type { HealthReport } from '@ecom/shared';
import { config } from './config.js';

async function ping(url: string): Promise<'ok' | 'unreachable'> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.healthTimeoutMs);

  try {
    const res = await fetch(`${url}/health`, { signal: controller.signal });
    return res.ok ? 'ok' : 'unreachable';
  } catch {
    return 'unreachable';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Reports "degraded" (503) if any backing service is down, which is what makes
 * `depends_on: service_healthy` meaningful for the web container.
 */
export async function checkUpstreams(): Promise<Pick<HealthReport, 'status' | 'dependencies'>> {
  const entries = Object.entries(config.upstreams);
  const results = await Promise.all(entries.map(([, url]) => ping(url)));

  const dependencies = Object.fromEntries(
    entries.map(([name], index) => [name, results[index]!])
  ) as Record<string, 'ok' | 'unreachable'>;

  const status = Object.values(dependencies).every((state) => state === 'ok') ? 'ok' : 'degraded';

  return { status, dependencies };
}
