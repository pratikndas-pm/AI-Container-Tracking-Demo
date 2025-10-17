import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/track': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/weather': 'http://localhost:8000',
      '/summary': 'http://localhost:8000',
      '/shipments': 'http://localhost:8000',
      '/kpis': 'http://localhost:8000'
    }
  }
})
