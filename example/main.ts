import { createPlayer } from "../src";

const frames: string[] = [];

for (let i = 1; i < 90; i++) {
  frames.push(
    `https://cdna.sec.miui.com/hello-world/o${i}.png?width=600&format=webp&quality=60`
  );
}

async function main() {
  const player = createPlayer({
    container: document.getElementById("ff-container"),
    width: 400,
    height: 600,
    layout: "responsive",
    frames,
    fps: 60,
    useWorker: false,
    loop: true,
    yoyo: true,
  });

  player.play();

  // const interval = setInterval(() => {
  //   player.pin(index++ % frames.length);
  // }, 30);

  player.on("loaded", (e) => {
    // player.reverse();
  });
}

main();
