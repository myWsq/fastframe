import { decodeImageWithCanvas, loadImageWithTag } from "./utils";
import DrawerWorker from "./drawer.worker.ts";
import { createWorkerRunner } from "./create-worker-runner";
import { Acion as DrawerWorkerAction } from "./drawer.worker";

/**
 * @public
 *
 * drawer 实例
 */
export interface Drawer {
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
}

/**
 * @public
 *
 * 创建 drawer 实例, drawer 实例可将帧绘制在 canvas 上
 * @param canvas - canvas element
 * @param isWorkerEnabled -  是否启用 worker 加速
 * @returns drawer 实例
 */
export function createDrawer(
  canvas: HTMLCanvasElement,
  isWorkerEnabled: boolean
): Drawer {
  const width = canvas.width;
  const height = canvas.height;
  canvas.width = width * window.devicePixelRatio;
  canvas.height = height * window.devicePixelRatio;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";

  // 启用 worker 的情况
  if (isWorkerEnabled) {
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

    const preload: Drawer["preload"] = async (src: string) => {
      // 必须在 worker 内完成预加载操作，原因如下:
      // 1. 避免加载数据产生的性能开销影响主线程
      // 2. 缓存的数据 transfer 到 worker 内依然是耗时操作, 最终起不到加速作用
      await runner("preload", {
        src,
      });
    };

    const draw: Drawer["draw"] = async (src: string) => {
      // 同下, draw 之前设置当前帧, 防止冲突
      await runner("set_current_frame", {
        src,
      });
      await runner("draw", {
        src,
      });
    };

    return {
      draw,
      preload,
    };
  }
  // 不使用 Worker 的情况
  else {
    let currentFrameSrc = "";

    const ctx = canvas.getContext("2d");
    ctx?.scale(window.devicePixelRatio, window.devicePixelRatio);

    const preload: Drawer["preload"] = async (src: string) => {
      await loadImageWithTag(src);
    };

    const draw: Drawer["draw"] = async (src: string) => {
      currentFrameSrc = src;

      if (!ctx) {
        throw new Error("Your browser does not support canvas 2d context");
      }

      const data = await decodeImageWithCanvas(src);
      // 加载完成后验证是否还需要渲染此帧, 防止影响其他帧的渲染
      if (currentFrameSrc === src) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(data, 0, 0, width, height);
      }
    };

    return {
      draw,
      preload,
    };
  }
}
