import type { ApiEnvelope, Health } from '@avero/contract';
import styles from '../lab.module.css';

// Always fetch at request time; the API is not available during `next build`.
export const dynamic = 'force-dynamic';

async function getHealth(): Promise<{ data?: ApiEnvelope<Health>; error?: string }> {
  const baseUrl = process.env.API_URL ?? 'http://localhost:4000';
  try {
    const res = await fetch(`${baseUrl}/api/v1/health`, { cache: 'no-store' });
    if (!res.ok) return { error: `API responded ${res.status}` };
    return { data: (await res.json()) as ApiEnvelope<Health> };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export default async function ApiLabPage() {
  const { data, error } = await getHealth();

  return (
    <main className={styles.panel}>
      <h1>GET /api/v1/health</h1>
      {error ? <p>Error: {error}</p> : null}
      {data ? <pre className={styles.json}>{JSON.stringify(data, null, 2)}</pre> : null}
    </main>
  );
}
