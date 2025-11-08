/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Extend Window interface for ethereum
interface Window {
  ethereum?: any
  Buffer: typeof import('buffer').Buffer
}
