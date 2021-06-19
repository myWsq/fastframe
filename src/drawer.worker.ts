import { decodeImageWithBitmap, loadImageWithFetch } from "./utils";

export type Acion = "register" | "preload" | "set_current_frame" | "draw";

let currentFrameSrc = "";
let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;

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
        await loadImageWithFetch(data.src);
        break;

      case "set_current_frame":
        currentFrameSrc = data.src;
        break;

      case "draw":
        if (!ctx || !canvas) {
          throw new Error("You should call 'register' before drawing");
        }
        const { src } = data;
        const { width, height } = canvas;
        const decoded = await decodeImageWithBitmap(src);
        if (currentFrameSrc === src) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(decoded, 0, 0, width, height);
        }
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
