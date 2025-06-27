import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  base: "/", // This ensures assets load correctly on all routes
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})