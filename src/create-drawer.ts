import { decodeImageWithCanvas, loadImageWithTag } from "./utils";
import DrawerWorker from "./drawer.worker.ts";
import { createWorkerRunner } from "./create-worker-runner";
import { Acion as DrawerWorkerAction } from "./drawer.worker";
import memo from "memoizee";

/**
 * @public
 *
 * drawer 实例
 */
export type Drawer = {
  /**
   * 预加载某一帧，仅影响网络请求
   * @param src - 图片地址
   */
  preload: (src: string) => Promise<void>;

  /**
   * 绘制某一帧
   * @param src - 图片地址
   */
  draw: (src: string) => Promise<void>;

  /** 销毁 drawer, 释放内存 */
  destroy: () => Promise<void>;
};

/**
 * @public
 *
 * 创建 drawer 实例, drawer 实例可将帧绘制在 canvas 上
 * @param canvas - canvas element
 * @param parallel - 是否启用多线程加速
 * @returns drawer 实例
 */
export function createDrawer(
  canvas: HTMLCanvasElement,
  parallel: boolean
): Drawer {
  // 启动多线程的情况
  if (parallel) {
    const runner = createWorkerRunner<DrawerWorkerAction>(new DrawerWorker());
    const offscreenCanvas = canvas.transferControlToOffscreen();

    // offscreen transfer 一旦执行, 主线程就会失去 canvas 的控制权,
    // 所以需要提前执行一次 register 操作，以便 worker 记录
    runner(
      "register",
      {
        canvas: offscreenCanvas,
      },
      [offscreenCanvas]
    );

    const preload: Drawer["preload"] = async (src) => {
      // 必须在 worker 内完成预加载操作，原因如下:
      // 1. 避免加载数据产生的性能开销影响主线程
      // 2. 缓存的数据 transfer 到 worker 内依然是耗时操作, 最终起不到加速作用
      await runner("preload", {
        src,
      });
    };

    const draw: Drawer["draw"] = async (src) => {
      await runner("draw", {
        src,
      });
    };

    const destroy: Drawer["destroy"] = async () => {
      await runner("destroy");
    };

    return {
      preload,
      draw,
      destroy,
    };
  }
  // 单线程
  else {
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    if (!ctx) {
      throw new Error("Your browser does not support canvas 2d context");
    }

    const loadImageMemo = memo(loadImageWithTag, {
      promise: true,
    });

    const decodeImageMemo = memo(decodeImageWithCanvas);

    const preload: Drawer["preload"] = async (src: string) => {
      await loadImageMemo(src);
    };

    const draw: Drawer["draw"] = async (src: string) => {
      const data = await loadImageMemo(src).then(decodeImageMemo);
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(data, 0, 0, width, height);
    };

    const destroy: Drawer["destroy"] = async () => {
      loadImageMemo.clear();
      decodeImageMemo.clear();
    };

    return {
      draw,
      preload,
      destroy,
    };
  }
}
