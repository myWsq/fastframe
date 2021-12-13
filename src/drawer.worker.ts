import { loadImageWithFetch, memo } from "./utils";
import { DrawerWorkerAcion } from "./types";

const imageTagStore = new Map();
const imageDataStore = new Map();

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;

const loadImageMemo = memo(loadImageWithFetch, imageTagStore);
const decodeImageMemo = memo(async (src: string) => {
  const data = await loadImageMemo(src);
  return createImageBitmap(data);
}, imageDataStore);

self.onmessage = async ({ data }) => {
  const { id, action } = data;
  try {
    switch (action as DrawerWorkerAcion) {
      case "register":
        canvas = data.canvas;
        if (canvas) {
          ctx = canvas.getContext("2d", {
            alpha: data.alpha,
          });
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
        const decoded = await decodeImageMemo(src);
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(decoded, 0, 0, width, height);
        break;

      case "destroy":
        imageTagStore.clear();
        imageDataStore.clear();
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
