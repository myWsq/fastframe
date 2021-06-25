import memoize from "fast-memoize";

/**
 * 使用 image 元素加载图片, 会创建一个脱离屏幕的 image element.
 * 加载会阻塞主线程
 * @param src - 图片地址
 */
export const loadImageWithTag = (src: string) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const onload = () => {
      resolve(image);
      image.removeEventListener("load", onload, false);
    };
    const onerror = () => {
      reject(`Frame "${src}" loading failed`);
      image.removeEventListener("error", onload, false);
    };
    image.addEventListener("load", onload, false);
    image.addEventListener("error", onerror, false);
    image.src = src;
  });
};

/**
 * 使用 fetch 加载图片, 发起 xhr 请求并将文件内容转为 blob.
 * 可以在 worker 内调用.
 * @param src - 图片地址
 * */
export const loadImageWithFetch = async (src: string) => {
  const res = await fetch(src);
  return res.blob();
};

/**
 * 使用 canvas 解码图片，会创建一个脱离屏幕的 canvas 元素
 * 解码会阻塞主线程
 * @param src - 图片地址
 */
export const decodeImageWithCanvas = (
  _key: string,
  width: number,
  height: number,
  data: HTMLImageElement
) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(data, 0, 0, width, height);
  return canvas;
};

/**
 * 生成间隔排列的数组的有序不重复数组
 * @param count - 数组内元素个数
 */
export function genLinOrder(count: number) {
  // 默认应包含头尾
  const order = new Set<number>([0, count - 1]);

  for (let round = 2; round <= count; round++) {
    // 计算每轮的间隔
    const step = Math.floor(count / 2 ** round);

    // 根据间隔计算每轮的顺序
    for (let i = step; i < count; i += step) {
      order.add(i);
    }

    // 所有顺序已加载，退出循环
    if (order.size === count) {
      break;
    }
  }

  return order;
}

/**
 * 判断数字是否在范围内
 * @param num - 数字
 * @param min - 最小范围
 * @param max - 最大范围
 * @returns 是否在范围内
 */
export function isBetween(num: number, min: number, max: number) {
  return num >= min && num <= max;
}

export function memo<T extends (...args: any[]) => any>(
  fn: T,
  store: Map<any, any>
): T {
  return memoize(fn, {
    cache: {
      create: () => ({
        has: (key) => store.has(key),
        get: (key) => store.get(key),
        set: (key, value) => store.set(key, value),
      }),
    },
  });
}
