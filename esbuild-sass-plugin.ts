import path from "path";
import { readFileSync } from "fs";
import type { Plugin } from "esbuild";
import { initAsyncCompiler, Logger } from "sass-embedded";
import postcss from "postcss";
import tailwindPostcss from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";

const TAILWIND_IMPORT = /@import\s+["']tailwindcss["']\s*;?\s*\n?/g;
const PREFIX = "[sass]";

export interface SassPluginOptions {
  quiet?: boolean;
}

let compiler: Awaited<ReturnType<typeof initAsyncCompiler>> | null = null;

async function getCompiler() {
  if (!compiler) {
    compiler = await initAsyncCompiler();
  }
  return compiler;
}

function log(msg: string) {
  console.log(`${PREFIX} ${msg}`);
}

export function sassEmbeddedLoader(options: SassPluginOptions = {}): Plugin {
  const quiet = options.quiet ?? true;
  const sassLogger = quiet ? Logger.silent : undefined;

  return {
    name: "sass-embedded",
    setup(build) {
      const cwd = process.cwd();
      const postcssPipeline = postcss([tailwindPostcss(), autoprefixer()]);

      build.onLoad({ filter: /\.(scss|sass)$/ }, async (args) => {
        const start = Date.now();
        const rel = path.relative(cwd, args.path);

        const source = readFileSync(args.path, "utf-8");
        const stripped = source.replace(TAILWIND_IMPORT, "");
        const basedir = path.dirname(args.path);

        const c = await getCompiler();
        const result = await c.compileStringAsync(stripped, {
          url: new URL(`file://${args.path}`),
          loadPaths: [cwd, basedir],
          style: "expanded",
          ...(sassLogger && { logger: sassLogger }),
        });

        const withTailwind = `@import "tailwindcss";\n${result.css}`;
        const processed = await postcssPipeline.process(withTailwind, {
          from: args.path,
        });

        if (!quiet) {
          log(`${rel} ${Date.now() - start}ms`);
        }

        return {
          contents: processed.css,
          loader: "css",
        };
      });
    },
  };
}
