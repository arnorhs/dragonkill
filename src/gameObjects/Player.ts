import { Bullet } from "./Bullet"

export class Player extends Phaser.Physics.Arcade.Sprite {
  private lastShotTime = 0
  private shotDelay = 200 // Delay between shots in milliseconds
  private jumpCount = 0
  private maxJumpCount = 2 // Allow double jump
  private lastDirection: "left" | "right" = "right"
  public bullets!: Phaser.Physics.Arcade.Group // Add a group for bullets

  public resetJumpCount() {
    this.jumpCount = 0
  }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player")
    scene.physics.world.enable(this)
    this.setTexture("prinz")
    this.body!.setSize(15, 45)
    this.body!.setOffset(24, 12)
    this.setCollideWorldBounds(true)
    // this.setOrigin(0.5, 0.5)
    // scene.physics.add.existing(this)

    this.anims.create({
      key: "idle",
      frames: [{ key: "prinz", frame: 0 }],
      frameRate: 10,
    })

    this.anims.create({
      key: "run-right",
      frames: this.anims.generateFrameNumbers("prinz", { start: 8, end: 15 }),
      frameRate: 10,
      repeat: -1,
    })

    this.anims.create({
      key: "jump-right",
      frames: this.anims.generateFrameNumbers("prinz", { start: 8, end: 15 }),
      frameRate: 5,
      repeat: -1,
    })

    // Create a group for bullets
    this.bullets = scene.physics.add.group({
      classType: Bullet,
      // TODO: this doesn towrk
      gravityY: 0,
    })
  }

  jump() {
    if (this.jumpCount < this.maxJumpCount) {
      this.setVelocityY(-550)
      this.jumpCount++
    }
  }

  walkLeft() {
    this.setVelocityX(-160)
    this.anims.play("run-right", true)
    this.setFlipX(true) // Mirror the sprite for left movement
    this.lastDirection = "left"
  }

  walkRight() {
    this.setVelocityX(160)
    this.anims.play("run-right", true)
    this.setFlipX(false) // Default orientation for right movement
    this.lastDirection = "right"
  }

  goIdle() {
    this.setVelocityX(0)
    this.anims.play("idle", true)
  }

  shoot() {
    if (this.scene.time.now > this.lastShotTime + this.shotDelay) {
      const bulletX = this.lastDirection === "right" ? this.x + 5 : this.x - 5
      this.emit("player-shoot", bulletX)
      const bulletVelocity = this.lastDirection === "right" ? 1200 : -1200
      const bullet = this.bullets.create(bulletX, this.y - 17, "bullet")
      bullet.body.velocity.x = bulletVelocity

      this.lastShotTime = this.scene.time.now
    }
  }
}
