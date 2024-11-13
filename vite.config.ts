import { AliasOptions, defineConfig } from "vite";
//@ts-ignore
import path from "path";

//@ts-ignore
const root = path.resolve(__dirname, "src");

// https://vitejs.dev/config/
export default defineConfig({
    resolve: {
        alias: {
            "@": root,
        } as AliasOptions,
    },
});