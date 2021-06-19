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
  });

  let index = 1;

  player.load();
  player.play();

  setInterval(() => {
    player.pin(index++ % frames.length);
  }, 60);
}

main();
