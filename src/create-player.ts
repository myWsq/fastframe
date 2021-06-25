import { createDrawer } from "./create-drawer";
import mitt, { Emitter } from "mitt";
import { genLinOrder, isBetween } from "./utils";
import { createTimer, setStyle } from "@folmejs/core";
import { Properties } from "csstype";

/**
 * @public
 *
 * 创建 Player 的配置项
 */
export type CreatePlayerOptions = {
  /** 容器元素 */
  container: HTMLElement;
  /** canvas 高度 */
  height: number;
  /** canvas 宽度 */
  width: number;
  /** canvas 布局方式 */
  layout: "intrinsic" | "responsive" | "fixed" | "fill";
  /** 为 canvas 元素设置 object-fit, 默认值: cover */
  objectFit?: Properties["objectFit"];
  /** 为 canvas 元素设置 object-position, 默认值: center */
  objectPosition?: Properties["objectPosition"];
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
  /** 是否自动播放, 仅当 `autoload` 为 true 时有效, 默认值: `false` */
  autoplay?: boolean;
  /** 是否循环播放, 默认值: `false` */
  loop?: boolean;
  /** 播放完成时是否自动倒放, 仅当 `loop` 为 true 时有效, 默认值: `false` */
  yoyo?: boolean;
};

/**
 * @public
 *
 * Player 事件类型
 */
export type PlayerEventMap = {
  /** 帧加载完成触发 */
  frameloaded: {
    /** 是否成功加载 */
    isSuccess: boolean;
    /** 加载耗时 */
    time: number;
    /** 帧下标 */
    index: number;
    /** 已加载完成的帧数量 */
    current: number;
    /** 总共帧数量 */
    total: number;
    /** player */
    player: Player;
  };

  /** 全部帧加载完成 */
  loaded: {
    /** player */
    player: Player;
    /** 总共帧数量 */
    total: number;
  };

  /** 帧绘制完成后触发 */
  tick: {
    /** player */
    player: Player;
    /** 当前绘制的帧下标 */
    frame: number;
  };

  /** 播放时触发 */
  play: {
    /** player */
    player: Player;
  };

  /** 暂停时触发 */
  pause: {
    /** player */
    player: Player;
  };
};

/**
 * @public
 *
 * Player 实例
 */
export type Player = {
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
   * 修改播放顺序
   */
  reverse: () => void;

  /**
   * 监听事件 player 事件
   * @see https://github.com/developit/mitt#on
   */
  on: Emitter<PlayerEventMap>["on"];

  /**
   * 移除 player 事件监听
   * @see https://github.com/developit/mitt#off
   */
  off: Emitter<PlayerEventMap>["off"];

  /** 销毁播放器, 释放内存 */
  destroy: () => Promise<void>;
};

/**
 * @public
 *
 * 创建 Player
 * @param options - 配置项
 * @returns Player 实例
 */
export function createPlayer(options: CreatePlayerOptions): Player {
  const {
    container,
    frames,
    width,
    height,
    layout,
    objectFit = "cover",
    objectPosition = "center",
    useWorker = typeof window !== "undefined" && "OffscreenCanvas" in window,
    chunkSize = 10,
    fps = 30,
    autoload = true,
    lazyload = true,
    autoplay = false,
    loop = false,
    yoyo = false,
  } = options;

  // 创建用于绘制的 canvas 元素
  const canvas = document.createElement("canvas");
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.cssText = `
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
  `;

  // 添加必要样式
  container.style.position = "relative";
  let placeholder: HTMLDivElement;

  if (layout === "intrinsic" || layout === "responsive") {
    // 创建用于按比例撑开容器的元素
    placeholder = document.createElement("div");
    placeholder.className = "ff-placeholder";
    setStyle(placeholder, {
      paddingBottom: (height / width) * 100 + "%",
    });
    container.append(placeholder, canvas);
  }

  if (layout === "fill") {
    setStyle(container, {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
    });
  } else {
    setStyle(container, {
      position: "relative",
    });
  }

  if (layout === "fixed") {
    setStyle(container, {
      width: width + "px",
      height: height + "px",
    });
  }

  if (layout === "intrinsic") {
    setStyle(container, {
      width: "100%",
      maxWidth: width + "px",
    });
  }

  if (layout === "responsive") {
    setStyle(container, {
      width: "100%",
    });
  }

  setStyle(canvas, {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    objectFit,
    objectPosition,
  });

  container.appendChild(canvas);

  // 创建 drawer 用于加载和绘制
  const drawer = createDrawer(canvas, useWorker);

  /** 某一帧停留累计的时间, 配合 timer 计算播放逻辑 */
  let tickTime = 0;
  // 创建 timer 用于控制时间轴
  const timer = createTimer();
  // timer 的播放逻辑
  timer.listen((dt) => {
    tickTime += dt;
    const min = 0;
    const max = frames.length - 1;

    // 累计时间大于 fps 对应的帧时间，则切换至下一帧
    if (tickTime > 1 / fps) {
      // 重置 tickTime
      tickTime = 0;

      // 计算下一帧
      const nextFrame = curFrame + (isReversed ? -1 : 1);

      // 当超出边界时
      if (!isBetween(nextFrame, min, max)) {
        // 处理循环播放逻辑
        if (loop) {
          if (yoyo) {
            reverse();
          } else {
            pin(isReversed ? max : min);
          }
        }
        // 循环播放未激活则停止播放
        else {
          pause();
        }
      }
      // 未超出边界
      else {
        pin(nextFrame);
      }
    }
  });

  // 创建 emitter 用于组织事件
  const emitter = mitt<PlayerEventMap>();

  /** 所有已加载的帧 */
  const loadedFrameIndex = new Set<number>();

  /** 是否已经开始加载 */
  let isStartLoading = false;

  /**
   * @property
   * @see {Player.curFrame}
   */
  let curFrame = 0;

  /**
   * @property
   * @see {Player.isReversed}
   */
  let isReversed = false;

  /**
   *
   * 加载某一帧，并触发相应事件。调用后将形成记录，已加载的帧不会重复加载。
   * @param index 帧下标
   */
  const _loadFrame = async (index: number) => {
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

  /**
   * @method
   * @see {Player.load}
   */
  const load: Player["load"] = async () => {
    isStartLoading = true;
    const linOrder = genLinOrder(frames.length);
    const promises: Promise<any>[] = [];

    for (const index of linOrder) {
      if (promises.length < chunkSize) {
        promises.push(_loadFrame(index));
      } else {
        // 加载图片
        await Promise.all(promises);
        // 清空数组
        promises.length = 0;
        promises.push(_loadFrame(index));
      }
    }

    // 加载剩余不足一个 chunk 的图片
    if (promises.length) {
      await Promise.all(promises);
    }
  };

  /**
   * @method
   * @see {Player.pin}
   */
  const pin: Player["pin"] = async (index) => {
    // 如果未开始加载, 则运行 load
    if (!isStartLoading) {
      load();
    }

    curFrame = index;

    // 计算帧下标
    const i = Math.max(0, Math.min(frames.length - 1, Math.round(index)));

    // 仅当帧加载完成绘制
    if (loadedFrameIndex.has(index)) {
      emitter.emit("tick", {
        player,
        frame: index,
      });
      await drawer.draw(frames[i]);
    }
  };

  /**
   * @method
   * @see {Player.play}
   */
  const play: Player["play"] = () => {
    tickTime = 0;
    timer.start();
    emitter.emit("play", {
      player,
    });
  };

  /**
   * @method
   * @see {Player.pause}
   */
  const pause: Player["pause"] = () => {
    timer.stop();
    emitter.emit("pause", {
      player,
    });
  };

  /**
   * @method
   * @see {Player.reverse}
   */
  const reverse: Player["reverse"] = () => {
    isReversed = !isReversed;
  };

  /**
   * @method
   * @see {Player.destroy}
   */
  const destroy: Player["destroy"] = async () => {
    await drawer.destroy();
    emitter.all.clear();
    placeholder?.remove();
    canvas.remove();
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
    reverse,
    pin,
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    destroy,
  };

  return player;
}
