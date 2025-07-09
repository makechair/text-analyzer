import tailwindcss from '@tailwindcss/vite'; 
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      path: 'path-browserify',
    },
  },
  assetsInclude: ['**/*.dat.gzip'],
  // Vite が Rust のエラーを不明瞭にするのを防止します
  clearScreen: false,
  server: {
    // Tauri は固定ポートで動作しているので、そのポートが見つからない場合機能しません
    strictPort: true,
    // Tauri が要求しているホストが設定されている場合は、それを使用します
    host: host || false,
    port: 5173,
  },
  // `envPrefix` の項目で始まる環境変数は `import.meta.env` を通じて Tauri のソース・コードから参照できます
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    // Tauriは、Windows では Chromium を、macOS と Linux では WebKit を使用しています
    target:
      process.env.TAURI_ENV_PLATFORM == 'windows'
        ? 'chrome105'
        : 'safari13',
    // デバッグ・ビルドでは「ファイルの軽量化（ミニファイ）」をさせない
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    // デバッグ・ビルドで「SourceMap」を作成します
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
})
