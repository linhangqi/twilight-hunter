import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/twilight-hunter/",
  plugins: [react()],
});
