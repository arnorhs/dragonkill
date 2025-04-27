import Phaser from "phaser"

class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene")
  }

  create() {
    this.add
      .text(400, 300, "Game Over", {
        fontSize: "48px",
        color: "#ff0000",
      })
      .setOrigin(0.5)

    this.add
      .text(400, 400, "Press Space to Restart", {
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5)

    this.input.keyboard?.addKey("space")?.on("down", () => {
      this.scene.start("MainScene")
    })
  }
}

export default GameOverScene
