import { createPlayer } from "../src";

const frames: string[] = [];

for (let i = 1; i < 90; i++) {
  frames.push(
    `https://cdna.sec.miui.com/hello-world/o${i}.png?width=1000&format=webp&quality=80`
  );
}

async function main() {
  const player = createPlayer({
    canvas: document.getElementById("canvas") as HTMLCanvasElement,
    frames,
    fps: 10,
    // useWorker: false,
  });

  let index = 0;

  const interval = setInterval(() => {
    player.pin(index++ % frames.length);
  }, 30);

  // player.on("loaded", (e) => {
  //   clearInterval(interval);
  //   player.destroy();
  // });
}

main();
