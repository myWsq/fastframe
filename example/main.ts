import { createPlayer } from "../src";

async function main() {
  const player = createPlayer({
    container: document.getElementById("ff-container"),
    width: 400,
    height: 600,
    layout: "intrinsic",
    frames: {
      total: 80,
      iterator: (i) =>
        `https://cdna.sec.miui.com/hello-world/o${
          i + 1
        }.png?width=600&format=webp&quality=80`,
    },
    fps: 60,
    loop: true,
    yoyo: true,
    autoplay: true,
  });

  player.on("*", (type) => {
    console.log(type);
  });

  const player1 = createPlayer({
    container: document.getElementById("macbook"),
    width: 600,
    height: 400,
    layout: "intrinsic",
    frames: {
      total: 120,
      iterator: (i) =>
        `https://cdna.sec.miui.com/animation-site/macbook-${i}.jpg?width=1000&format=webp&quality=80`,
    },
    fps: 60,
    loop: true,
    yoyo: true,
    lazyload: true,
    autoplay: true,
  });
}

main();
