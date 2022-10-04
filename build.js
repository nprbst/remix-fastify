#!/usr/bin/env node

let path = require("node:path");
let { build, ts, tsconfig, log } = require("estrella");
let glob = require("glob");

let packages = glob.sync("packages/*/package.json", { absolute: true });

for (let package of packages) {
  let pkg = require(package);
  let packageDir = path.dirname(package);

  build({
    entry: glob.sync(path.join(packageDir, "src", "**", "*.ts")),
    outdir: path.join(packageDir, path.dirname(pkg.main)),
    minify: false,
    target: "node14",
    format: "cjs",
    platform: "node",
    sourcemap: true,
    onEnd(config) {
      generateTypeDefs(tsconfig(config), config.entry, config.outdir);
    },
  });
}

function generateTypeDefs(tsconfig, entryfiles, outdir) {
  let entries = Array.isArray(entryfiles) ? entryfiles : [entryfiles];
  let all = [...entries, ...(tsconfig.include || [])];
  let unique = [...new Set(all)];
  let files = unique
    .flatMap((t) => glob.sync(t, { absolute: true }))
    .filter((file) => file);
  let rootdir = path.dirname(outdir);

  log.info(
    "Generating type declaration files for",
    files.map((file) => path.relative(rootdir, file)).join(", ")
  );

  let compilerOptions = {
    ...tsconfig.compilerOptions,
    moduleResolution: undefined,
    declaration: true,
    noEmit: false,
    outDir: outdir,
  };
  let program = ts.ts.createProgram(files, compilerOptions);
  let targetSourceFile = undefined;
  let writeFile = undefined;
  let cancellationToken = undefined;
  let emitOnlyDtsFiles = true;
  program.emit(
    targetSourceFile,
    writeFile,
    cancellationToken,
    emitOnlyDtsFiles
  );
  let generated = glob.sync(`${outdir}/*.d.ts`);
  log.info(`Wrote ${generated.length} files`, generated.join(", "));
}
