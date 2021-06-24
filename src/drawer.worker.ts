import { loadImageWithFetch } from "./utils";
import memo from "memoizee";

export type Acion = "register" | "preload" | "draw" | "destroy";

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;

const loadImageMemo = memo(loadImageWithFetch, {
  promise: true,
});
const deocdeImageMemo = memo(createImageBitmap, {
  promise: true,
});

self.onmessage = async ({ data }) => {
  const { id, action } = data;

  try {
    switch (action as Acion) {
      case "register":
        canvas = data.canvas;
        if (canvas) {
          ctx = canvas.getContext("2d");
        }
        if (!ctx) {
          throw new Error("Your browser does not support offscreen rendering");
        }
        break;

      case "preload":
        await loadImageMemo(data.src);
        break;

      case "draw":
        if (!ctx || !canvas) {
          throw new Error("You should call 'register' before drawing");
        }
        const { src } = data;
        const { width, height } = canvas;
        const decoded = await loadImageMemo(src).then(deocdeImageMemo);
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(decoded, 0, 0, width, height);
        break;

      case "destroy":
        loadImageMemo.clear();
        deocdeImageMemo.clear();
        break;

      default:
        break;
    }
    self.postMessage({
      id,
    });
  } catch (error) {
    self.postMessage({
      id,
      error,
    });
  }
};
