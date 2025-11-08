import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    // 为浏览器环境定义Node.js全局变量
    global: 'globalThis',
    'process.env': {},
  },
  resolve: {
    alias: {
      // 解决Buffer等Node.js模块在浏览器中的兼容性
      buffer: 'buffer',
      process: 'process/browser',
      util: 'util',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js全局变量注入到浏览器环境
      define: {
        global: 'globalThis',
      },
    },
    include: ['buffer', 'process'],
  },
});
