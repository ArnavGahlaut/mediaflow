import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    tanstackStart({
      server: {
        entry: "server",
      },
    }),
    nitro({
	    preset: process.env.NITRO_PRESET || "vercel",
	  }),
    react(),
  ],
});
