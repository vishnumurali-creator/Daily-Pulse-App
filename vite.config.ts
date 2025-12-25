import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Makes process.env.API_KEY available in the browser code
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})