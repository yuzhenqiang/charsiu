import { UserConfig, defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';

export default defineConfig((env) => {
  const config: UserConfig = {
    server: {
      port: 3000
    },
    build: {
      rollupOptions: {
        input: 'index.html'
      }
    },
    plugins: [vue(), vueJsx()]
  }
  return config
})