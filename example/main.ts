import { createPlayer } from "../src";
import { createScroom, debug } from "scroom";

async function main() {
  document.querySelectorAll(".wrapper").forEach((el, key) => {
    const player = createPlayer({
      container: el.querySelector(".canvas") as HTMLElement,
      width: 400,
      height: 600,
      layout: "responsive",
      frames: {
        total: 80,
        iterator: (i) =>
          `https://cdna.sec.miui.com/hello-world/o${i + 1}.png?width=${
            800 + key
          }&format=jpeg&quality=80`,
      },
    });
    const sc = createScroom({
      target: el,
      offset: 0.3,
    });
    sc.on("progress", (e) => {
      player.pin(e.progress * 80);
    });
    debug(sc);
  });
}

main();
