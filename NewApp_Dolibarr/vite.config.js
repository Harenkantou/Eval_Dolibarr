import { defineConfig, loadEnv } from 'vite'
import vue                        from '@vitejs/plugin-vue'
import { fileURLToPath, URL }     from 'node:url'

export default defineConfig(({ mode }) => {

  // Charge les variables du fichier .env
  const env = loadEnv(mode, process.cwd(), '')

  return {

    plugins: [
      vue()
    ],

    // Alias @ → src/
    // Permet d'écrire @/services/xxx
    // au lieu de ../../services/xxx
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },

    // Serveur de développement
    server: {

      // NewApp tourne sur le port 5173 pour Vite/Vue
      port: 5173,

      // Proxy pour éviter les erreurs CORS
      // Toute requête vers /api/...
      // est redirigée vers Dolibarr automatiquement
      proxy: {
        '/api': {
          target      : env.VITE_DOLIBARR_TARGET || 'http://localhost/dolibarr23',
          changeOrigin: true,
          rewrite     : (path) => path.replace(/^\/api/, '/dolibarr23/api')
        }
      }
    }
  }
})