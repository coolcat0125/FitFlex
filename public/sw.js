/* FitFlex Service Worker
   策略：
   - 应用外壳（HTML/JS/CSS/manifest/图标）+ 首屏数据：安装时预缓存，cache-first，
     秒开且离线可用
   - 详情分片（data/detail/*.json）：激活后后台预热，离线时也能打开任意动作
   - 媒体（CDN 图片/GIF）：cache-first 且限制条目数，避免无限占用存储

   PRECACHE 由 tools/build.mjs 在构建时注入（含 hash 后的 JS/CSS 文件名）。
*/

const VERSION = "fitflex-v4";
const SHELL = VERSION + "-shell";
const DATA = VERSION + "-data";
const MEDIA = VERSION + "-media";
const MEDIA_MAX = 200;

const PRECACHE = __PRECACHE__;

/* ---------------------------- 安装：预缓存外壳 ---------------------------- */

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL);
      const data = await caches.open(DATA);
      // 逐个 add，单个失败不影响整体（例如某个图标 404）。
      // 数据类放进 DATA 缓存，其余进 SHELL，便于分别统计离线就绪状态。
      await Promise.all(
        PRECACHE.map((url) => {
          const target = url.includes("/data/") ? data : shell;
          return target.add(new Request(url, { cache: "reload" })).catch(() => undefined);
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

/* ---------------------------- 激活：清旧缓存 + 预热 ---------------------------- */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
      // 必须放进 waitUntil：否则 SW 在预热跑完前就被浏览器挂起，只缓存几个分片就停。
      // 已缓存的分片会被跳过，所以即使这次超时，下次激活也能接着补完。
      await warmDetails();
    })(),
  );
});

/** 把全部详情分片拉进缓存，让离线时能打开任意动作 */
async function warmDetails() {
  try {
    const cache = await caches.open(DATA);
    const hit = await cache.match("./data/meta.json");
    const metaRes = hit || (await fetch("./data/meta.json"));
    if (!metaRes || !metaRes.ok) return;
    const meta = await metaRes.json();
    const shards = Array.isArray(meta.shards) ? meta.shards : [];
    // 并发拉取，比串行快得多（37 个分片串行容易撞上 waitUntil 超时）
    await Promise.all(
      shards.map((s) => {
        const url = "./data/detail/" + s + ".json";
        return cache.match(url).then((existing) => {
          if (existing) return undefined;
          return cache.add(url).catch(() => undefined);
        });
      }),
    );
  } catch {
    /* 离线或网络异常，下次激活再试 */
  }
}

/* ---------------------------- 媒体缓存裁剪 ---------------------------- */

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  for (const k of keys.slice(0, keys.length - max)) await cache.delete(k);
}

/* ---------------------------- 请求拦截 ---------------------------- */

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;

  // 1. 媒体（CDN 上的图片与 GIF）：cache-first + 限量
  if (!sameOrigin && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok || res.type === "opaque") {
              const copy = res.clone();
              caches.open(MEDIA).then((c) => {
                c.put(req, copy).then(() => trim(MEDIA, MEDIA_MAX));
              });
            }
            return res;
          }),
      ),
    );
    return;
  }

  if (!sameOrigin) return;

  // 2. 数据：stale-while-revalidate（先用缓存，后台更新）
  if (url.pathname.includes("/data/")) {
    event.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(DATA).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => hit);
        return hit || net;
      }),
    );
    return;
  }

  // 3. 应用外壳：cache-first，离线回退到 index.html
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(SHELL).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => caches.match("./index.html")),
    ),
  );
});
