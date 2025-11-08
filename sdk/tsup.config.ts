import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  minify: false,
  // Mark large dependencies as external to reduce bundle size
  // They will be installed automatically via dependencies in package.json
  external: ['ethers', '@zama-fhe/relayer-sdk'],
  // Bundle small utility libraries like crypto-js
  noExternal: ['crypto-js'],
  esbuildOptions(options) {
    // Only remove debugger in production build, keep console for error tracking
    options.drop = ['debugger']
  },
  // Generate sourcemaps for better debugging
  sourcemap: true,
  // Split chunks for better tree-shaking (only works with ESM)
  splitting: false,
})
