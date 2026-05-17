import { defineConfig } from 'vite';

// itch.io / 静态托管子路径友好：用相对路径基址，dist/index.html 引用形如 './assets/...'。
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    sourcemap: false,
  },
});
