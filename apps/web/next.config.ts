import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The contract package ships TypeScript source.
  transpilePackages: ['@avero/contract'],
};

export default nextConfig;
