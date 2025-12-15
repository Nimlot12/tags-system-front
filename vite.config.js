// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Загружаем переменные окружения
  const env = loadEnv(mode, process.cwd(), '')
  
  // Базовый URL бэкенда
  const target = env.VITE_API_BASE_URL || 'http://localhost:80'
  const app_port_front = env.FRONTEND_PORT || 3000  

  console.log('Vite config loaded:')
  console.log('  Mode:', mode)
  console.log('  API target:', target)
  
  return {
    plugins: [react()],
    server: {
      port: app_port_front,
      host: 'localhost',
      middlewareMode: false,
      proxy: {
        '/api': {
          target: target,
          changeOrigin: true,
          rewrite: (path) => {
            // Убираем /api из пути
            const newPath = path.replace(/^\/api/, '')
            console.log(`Proxy: ${path} → ${target}${newPath}`)
            return newPath
          },
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log(`[PROXY] ${req.method} ${req.url} → ${proxyReq.path}`)
            })
          }
        },
      },
    },
  }
})
