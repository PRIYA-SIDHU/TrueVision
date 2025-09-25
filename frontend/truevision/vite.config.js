<<<<<<< HEAD
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // HTTP video feed
      '/video_feed': 'http://localhost:8000',
      // WebSocket logs
      '/ws/logs': {
        target: 'ws://localhost:8000',
        ws: true
      }
    }
  }
});
=======
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
     tailwindcss()
  ],
   
})
>>>>>>> upstream/main
