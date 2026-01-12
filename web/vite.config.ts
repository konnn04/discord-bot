import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, "..")

  const env = loadEnv(mode, envDir, '')

  return {
    envDir,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@shared": path.resolve(__dirname, "../src/shared"),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui': [
              '@radix-ui/react-dialog', 
              '@radix-ui/react-label', 
              '@radix-ui/react-slot', 
              'class-variance-authority', 
              'clsx', 
              'tailwind-merge', 
              'lucide-react'
            ],
            'vendor-socket': ['socket.io-client'],
            'vendor-utils': ['axios', 'date-fns'],
          },
        },
      },
    },
  }
})
