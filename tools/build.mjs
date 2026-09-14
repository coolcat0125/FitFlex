/**
 * 构建脚本（esbuild）
 *
 * 为什么不用 Vite：本项目位于 D:\#AI\... 这类含 "#" 的路径下，
 * Vite 内部把路径转成 URL 时 "#" 会被当成片段分隔符，导致资源解析失败
 * （EISDIR: illegal operation on a directory, read）。
 * esbuild 使用原生路径处理，不受该规则影响，且构建更快、依赖更少。
 */

import { build } from "esbuild";
import { cp, mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { existsSync, lstatSync, readdirSync, rmdirSync, unlinkSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");
const PUBLIC = path.join(ROOT, "public");
// 发布用的独立目录。部署工具会把 dist/ 当成构建产物排除掉，
// 所以另外维护一份 site/（内容与 dist 一致，只是换个不会被过滤的名字）。
const SITE = path.join(ROOT, "site");

/**
 * 递归删除。
 *
 * 不能用 fs.rm —— 本机 NODE_OPTIONS 注入了 safe-delete shim，会把 rm 重定向到
 * 回收站，而回收站对目录树操作经常失败（Error during a 'trash' operation:
 * Some operations were aborted），构建直接中断。逐层 unlink + rmdir 不经过 shim。
 */
function hardRemove(target) {
  if (!existsSync(target)) return;
  const st = lstatSync(target);
  if (st.isDirectory()) {
    for (const name of readdirSync(target)) hardRemove(path.join(target, name));
    rmdirSync(target);
  } else {
    unlinkSync(target);
  }
}

const gzip = async (file) => {
  const { gzipSync } = await import("node:zlib");
  const buf = await readFile(file);
  return gzipSync(buf, { level: 9 }).length;
};

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

async function main() {
  hardRemove(DIST);
  await mkdir(path.join(DIST, "assets"), { recursive: true });

  const result = await build({
    entryPoints: [path.join(ROOT, "src", "main.ts")],
    bundle: true,
    minify: true,
    format: "esm",
    target: ["es2020"],
    platform: "browser",
    outdir: path.join(DIST, "assets"),
    entryNames: "[name]-[hash]",
    assetNames: "[name]-[hash]",
    loader: { ".css": "css" },
    charset: "utf8",
    legalComments: "none",
    metafile: true,
    logLevel: "warning",
  });

  // 找出产出的 js / css 文件名，用于改写 index.html
  const outputs = Object.keys(result.metafile.outputs).map((p) =>
    path.relative(ROOT, p).split(path.sep).join("/"),
  );
  const js = outputs.find((o) => o.endsWith(".js"));
  const css = outputs.find((o) => o.endsWith(".css"));
  if (!js) throw new Error("未产出 JS 文件");

  const rel = (p) => "./" + p.replace(/^dist\//, "");

  let html = await readFile(path.join(ROOT, "index.html"), "utf8");
  html = html.replace(
    "</head>",
    `${css ? `    <link rel="stylesheet" href="${rel(css)}" />\n` : ""}  </head>`,
  );
  html = html.replace(
    /<script type="module" src="\/src\/main\.ts"><\/script>/,
    `<script type="module" src="${rel(js)}"></script>`,
  );
  await writeFile(path.join(DIST, "index.html"), html, "utf8");

  // 静态资源（数据、manifest、图标、Service Worker）
  if (existsSync(PUBLIC)) {
    await cp(PUBLIC, DIST, { recursive: true });
  }

  // 把预缓存清单注入 Service Worker。
  // JS/CSS 文件名带 hash，SW 是静态文件拿不到，只能构建时写进去——
  // 否则离线时外壳缓存不全会白屏。
  const swPath = path.join(DIST, "sw.js");
  if (existsSync(swPath)) {
    const precache = [
      "./",
      "./index.html",
      "./manifest.webmanifest",
      "./icon.svg",
      rel(js),
      css ? rel(css) : null,
      "./data/index.json",
      "./data/facets.json",
      "./data/meta.json",
    ].filter((u) => typeof u === "string");
    const sw = await readFile(swPath, "utf8");
    if (!sw.includes("__PRECACHE__")) {
      throw new Error("public/sw.js 里找不到 __PRECACHE__ 占位符，预缓存清单没注入");
    }
    await writeFile(swPath, sw.replace("__PRECACHE__", JSON.stringify(precache, null, 2)), "utf8");
    console.log(`\nService Worker 预缓存 ${precache.length} 项`);
  }

  // 报告
  const jsPath = path.join(DIST, js.replace(/^dist\//, ""));
  const cssPath = css ? path.join(DIST, css.replace(/^dist\//, "")) : null;
  const jsRaw = (await stat(jsPath)).size;
  const jsGz = await gzip(jsPath);

  console.log("\n构建完成 → dist/");
  console.log(`  ${js}   ${kb(jsRaw)}  (gzip ${kb(jsGz)})`);
  if (cssPath) {
    const cssRaw = (await stat(cssPath)).size;
    console.log(`  ${css}  ${kb(cssRaw)}  (gzip ${kb(await gzip(cssPath))})`);
  }
  const idx = await stat(path.join(DIST, "data", "index.json"));
  console.log(`  data/index.json  ${kb(idx.size)}`);
  console.log(`\n  首屏关键体积（JS+CSS gzip）：${kb(jsGz + (cssPath ? await gzip(cssPath) : 0))}`);

  // 同步一份到 site/，供「发布为应用」上传
  hardRemove(SITE);
  await cp(DIST, SITE, { recursive: true });
  console.log(`\n已同步发布副本 → site/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
