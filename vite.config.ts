import { defineConfig } from "vite";
import path from "path";
import pkg from "./package.json";

export default defineConfig(({ command }) => {
  if (command === "build") {
    return {
      build: {
        lib: {
          entry: path.resolve(__dirname, "src/index.ts"),
          formats: ["cjs", "es"],
        },
        rollupOptions: {
          external: Object.keys(pkg.dependencies),
        },
      },
    };
  } else {
    return {
      root: path.resolve(__dirname, "example"),
    };
  }
});
