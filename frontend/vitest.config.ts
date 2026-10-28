import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    define: {
      "import.meta.env.VITE_IPFS_GATEWAY": JSON.stringify(
        "https://ipfs.example.test/ipfs"
      ),
      "import.meta.env.VITE_BLOCK_EXPLORER_URL": JSON.stringify(
        "https://explorer.example.test"
      ),
    },

    test: {
      isolate: true,
      pool: "vmForks",
      maxWorkers: 1,
      fileParallelism: false,
    },
  })
);
