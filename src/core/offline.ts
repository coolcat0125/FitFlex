/**
 * 离线就绪状态检测。
 *
 * 用户装到桌面后最关心的是「现在断网能不能用」。这里把 Service Worker 的
 * 缓存实况读出来，让「我的」页面能给出明确答复，而不是让用户自己去试。
 */

export interface OfflineStatus {
  /** 浏览器是否支持 Service Worker / Cache Storage */
  supported: boolean;
  /** SW 是否已激活并接管页面 */
  active: boolean;
  /** 外壳缓存条目数（HTML/JS/CSS/图标） */
  shell: number;
  /** 数据缓存条目数（索引 + 全部详情分片） */
  data: number;
  /** 媒体缓存条目数（缩略图/GIF） */
  media: number;
  /** 数据缓存的目标条目数（索引 3 项 + 分片数） */
  dataTarget: number;
  /** 外壳与全部数据都缓存完毕 = 可以完全离线使用 */
  ready: boolean;
}

const EMPTY: OfflineStatus = {
  supported: false,
  active: false,
  shell: 0,
  data: 0,
  media: 0,
  dataTarget: 0,
  ready: false,
};

async function countIn(keys: string[], suffix: string): Promise<number> {
  const name = keys.find((k) => k.endsWith(suffix));
  if (!name) return 0;
  try {
    const cache = await caches.open(name);
    return (await cache.keys()).length;
  } catch {
    return 0;
  }
}

/** 读取当前离线缓存状态。shardCount 来自 meta.shards.length。 */
export async function getOfflineStatus(shardCount: number): Promise<OfflineStatus> {
  const dataTarget = shardCount + 3; // index / facets / meta
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || !("caches" in window)) {
    return { ...EMPTY, dataTarget };
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const keys = await caches.keys();
    const [shell, data, media] = await Promise.all([
      countIn(keys, "-shell"),
      countIn(keys, "-data"),
      countIn(keys, "-media"),
    ]);
    const active = Boolean(reg?.active);
    return {
      supported: true,
      active,
      shell,
      data,
      media,
      dataTarget,
      ready: active && data >= dataTarget,
    };
  } catch {
    return { ...EMPTY, dataTarget };
  }
}
