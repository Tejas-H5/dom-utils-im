import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: "/",
  // plugins: [viteSingleFile()],
  build: {
    // Would like people to see the source code of the thing they're using actually - it should 
    // make bug reporting and open source contributions a bit easier.
    // Also this is somewhat the only demo of this framework in existance at the moment. 
    minify: false,
    rollupOptions: {
      input: {
        "index": path.resolve(__dirname , 'index.html'),
        "input-test": path.resolve(__dirname , 'examples/input-test.html'),
        "random-stuff": path.resolve(__dirname , 'examples/random-stuff.html'),
        "readme-example": path.resolve(__dirname , 'examples/readme-example.html'),
      }
    },
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, "src/")
    }
  }
});
