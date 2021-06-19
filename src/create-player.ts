import { createDrawer } from "./create-drawer";
import mitt from "mitt";
import { genLinOrder } from "./utils";
import { createTimer } from "@folmejs/core";

/**
 * @public
 *
 * 创建 Player 的配置项
 */
export interface CreatePlayerOptions {
  /** canvas element */
  canvas: HTMLCanvasElement;
  /** 图片帧地址  */
  frames: string[];
  /** 是否使用 worker, 默认为自动检测. */
  useWorker?: boolean;
  /** 加载时一个区块的大小, 默认值: `10` */
  chunkSize?: number;
  /** 播放帧率, 默认值: `30` */
  fps?: number;
  /** 是否自动加载, 默认值: `true`  */
  autoload?: boolean;
  /** 是否启用懒加载, 仅当 `autoload` 为 true 时有效, 默认值: `true` */
  lazyload?: boolean;
  /** 是否自动播放, 仅当 `autoload` 为 true 时有效, 默认值 `true` */
  autoplay?: boolean;
  /** 是否循环播放 */
  loop?: boolean;
}

/**
 * @public
 *
 * Player 事件类型
 */
export type PlayerEventTypes =
  | "frameloaded"
  | "loaded"
  | "tick"
  | "play"
  | "pause"
  | "*";

/**
 * @public
 *
 * Player 实例
 */
export interface Player {
  /** 当前播放的帧 */
  readonly curFrame: number;

  /** 是否处于倒放状态 */
  readonly isReversed: boolean;

  /**
   * 加载全部帧图片, 仅执行网络请求
   * 使用抽帧加载的方法，即优先加载间隔的关键帧
   * `[-,-,-,-,-] -> [+,-,+,-,+] -> [+,+,+,+,+]`
   */
  load: () => Promise<void>;

  /**
   * 切换至某一帧
   * @param index - frame index
   */
  pin: (index: number) => Promise<void>;

  /**
   * 开始播放
   */
  play: () => void;

  /**
   * 暂停播放
   */
  pause: () => void;

  /**
   * 监听事件 player 事件
   * @param eventType - 事件类型
   * @param handler - 事件处理函数
   */
  on: (eventType: PlayerEventTypes, handler: (event: any) => void) => void;

  /**
   * 移除 player 事件监听
   * @param eventType - 事件类型
   * @param handler - 事件处理函数
   */
  off: (eventType: PlayerEventTypes, handler: (event: any) => void) => void;
}

/**
 * @public
 *
 * 创建 Player
 * @param options - 配置项
 * @returns Player 实例
 */
export function createPlayer(options: CreatePlayerOptions): Player {
  const {
    canvas,
    frames,
    useWorker = "OffscreenCanvas" in window,
    chunkSize = 10,
    fps = 30,
  } = options;

  const emitter = mitt();
  const drawer = createDrawer(canvas, useWorker);
  const timer = createTimer();
  const loadedFrameIndex = new Set<number>();

  let curFrame = 0;
  let timeline = 0;
  let isReversed = false;

  // 加载某一帧, 触发相应事件
  const loadFrame = async (index: number) => {
    // 如果此帧已经被加载, 则跳过
    if (loadedFrameIndex.has(index)) {
      return;
    }
    const timeBefore = Date.now();
    let isSuccess = true;
    try {
      await drawer.preload(frames[index]);
    } catch (error) {
      console.warn("Frame load failed", error);
      isSuccess = false;
    } finally {
      loadedFrameIndex.add(index);
      const timeAfter = Date.now();

      emitter.emit("frameloaded", {
        isSuccess,
        time: timeAfter - timeBefore,
        index,
        current: loadedFrameIndex.size,
        total: frames.length,
        player,
      });

      // 全部帧加载完成
      if (loadedFrameIndex.size === frames.length) {
        emitter.emit("loaded", {
          player,
          total: frames.length,
        });
      }
    }
  };

  const load: Player["load"] = async () => {
    const linOrder = genLinOrder(frames.length);

    let promises: Promise<any>[] = [];

    for (const index of linOrder) {
      if (promises.length < chunkSize) {
        promises.push(loadFrame(index));
      } else {
        // 加载图片
        await Promise.all(promises);
        // 清空数组
        promises.length = 0;
        promises.push(loadFrame(index));
      }
    }

    // 加载剩余不足一个 chunk 的图片
    if (promises.length) {
      await Promise.all(promises);
    }
  };

  const pin: Player["pin"] = async (index) => {
    const i = Math.max(0, Math.min(frames.length, Math.round(index)));
    await loadFrame(index);
    await drawer.draw(frames[i]);
    loadedFrameIndex.add(index);
    curFrame = index;
    emitter.emit("tick", {
      player,
      frame: index,
    });
  };

  const play: Player["play"] = () => {
    timer.start();
    emitter.emit("play", {
      player,
    });
  };

  // 用于播放的 timer
  timer.listen((dt) => {
    timeline += isReversed ? -dt : dt;
    const frame = Math.floor(timeline * fps) % frames.length;
  });

  const pause: Player["pause"] = () => {
    timer.stop();
    emitter.emit("pause", {
      player,
    });
  };

  const player = {
    get curFrame() {
      return curFrame;
    },
    get isReversed() {
      return isReversed;
    },
    load,
    play,
    pause,
    pin,
    on: emitter.on,
    off: emitter.off,
  };

  return player;
}
