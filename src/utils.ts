/**
 * 使用 image 元素加载图片, 会创建一个脱离屏幕的 image element.
 * 加载会阻塞主线程
 * @param src - 图片地址
 */
export const loadImageWithTag = (src: string) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener(
      "load",
      () => {
        resolve(image);
      },
      false
    );
    image.addEventListener(
      "error",
      () => {
        reject(`Frame "${src}" loading failed`);
      },
      false
    );
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
export const decodeImageWithCanvas = (data: HTMLImageElement) => {
  const canvas = document.createElement("canvas");
  canvas.width = data.width;
  canvas.height = data.height;
  canvas.getContext("2d")!.drawImage(data, 0, 0, data.width, data.height);
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
