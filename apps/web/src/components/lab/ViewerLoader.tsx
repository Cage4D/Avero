'use client';

import dynamic from 'next/dynamic';

// WebGL is browser-only, so the scene is never server-rendered.
const ViewerScene = dynamic(() => import('./ViewerScene'), {
  ssr: false,
  loading: () => <p>Loading viewer…</p>,
});

export default function ViewerLoader() {
  return <ViewerScene />;
}
