import Phaser from "phaser"
import GameOverScene from "./scenes/GameOverScene"
import { Bullet } from "./gameObjects/Bullet"

class MainScene extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys | null
  private dragons!: Phaser.Physics.Arcade.Group
  private princess!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private lastDirection: "left" | "right" = "right" // Track the last direction the player was facing
  private bullets!: Phaser.Physics.Arcade.Group // Add a group for bullets
  private lastShotTime = 0
  private shotDelay = 200 // Delay between shots in milliseconds
  private jumpCount = 0
  private maxJumpCount = 2 // Allow double jump

  constructor() {
    super("MainScene")
  }

  preload() {
    // Load the player sprite sheet
    this.load.spritesheet("prinz", "/sprites/prinz.png", {
      frameWidth: 64,
      frameHeight: 64,
    })

    // Load the princess sprite
    this.load.image("prinsessa", "/sprites/prinsessa.png")
    this.load.spritesheet("dragon", "/sprites/chatgptdragon.png", {
      frameWidth: 64,
      frameHeight: 64,
    })

    // Load the tilemap and tileset
    this.load.tilemapTiledJSON("dragonzmap", "/maps/dragonzmap.json")
    this.load.image("textures", "/tilemaps/texturesfordragonz.png")
  }

  createPlayer() {
    this.player = (
      this.map.createFromObjects("items", {
        name: "player",
        classType: Phaser.Physics.Arcade.Sprite,
        scene: this,
      }) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[]
    )[0]
    this.physics.world.enable(this.player)
    this.player.setTexture("prinz")
    this.player.body.setSize(15, 45)
    this.player.body.setOffset(24, 12)
    this.player.setCollideWorldBounds(true)
  }

  createPrincess() {
    this.princess = (
      this.map.createFromObjects("items", {
        name: "princess",
        classType: Phaser.Physics.Arcade.Sprite,
        scene: this,
      }) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[]
    )[0]
    this.physics.world.enable(this.princess)
    this.princess.setTexture("prinsessa")
    this.princess.body.setSize(40, 80)
    this.princess.body.setOffset(44, 40)
  }

  createDragons() {
    this.dragons = this.physics.add.group()

    const dragons = this.map.createFromObjects("items", {
      name: "dragon",
      classType: Phaser.Physics.Arcade.Sprite,
    }) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[]

    this.dragons.addMultiple(dragons)

    this.physics.world.enable(this.dragons)

    let vel = -1
    for (const dragon of dragons) {
      dragon.setTexture("dragon")
      dragon.setVelocityX(50 * vel)
      vel *= -1
      dragon.setCollideWorldBounds(true, 1, 0, true)
      dragon.body.setSize(30, 50)
      dragon.body.setOffset(15, 11)
      dragon.anims.play("dragon-right", true)
      dragon.setFlipX(vel > 0) // Mirror the sprite for left movement
    }
  }

  create() {
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

    this.anims.create({
      key: "dragon-right",
      frames: this.anims.generateFrameNumbers("dragon", { start: 0, end: 3 }),
    })

    // Add the tilemap to the scene
    this.map = this.make.tilemap({ key: "dragonzmap" })
    const tileset = this.map.addTilesetImage("texturesfordragonz", "textures")

    // Ensure tileset is not null
    if (!tileset) {
      throw new Error("Tileset 'texturesfordragonz' could not be loaded.")
    }

    // Create layers from the tilemap
    const bgLayer = this.map.createLayer("background", tileset)
    const wallsLayer = this.map.createLayer("static", tileset)
    const lavaLayer = this.map.createLayer("lava", tileset)

    // Ensure layers are not null
    if (!wallsLayer || !lavaLayer || !bgLayer) {
      throw new Error(
        "One or more layers could not be created from the tilemap.",
      )
    }

    this.createPlayer()
    this.createPrincess()
    this.createDragons()

    this.cameras.main.startFollow(this.player)

    // Extend the playable area
    this.physics.world.setBounds(0, 0, wallsLayer.width, wallsLayer.height)
    this.cameras.main.setBounds(
      0,
      0,
      this.physics.world.bounds.width,
      this.physics.world.bounds.height,
    )

    wallsLayer.setCollisionByProperty({ collides: true })
    lavaLayer.setCollisionByProperty({ collides: true })

    // Add collisions between the player and the layers
    this.physics.add.collider(this.player, wallsLayer, (player, tile) => {
      this.jumpCount = 0
    })

    // Add collisions for dragons and princess
    this.physics.add.collider(this.dragons, wallsLayer)
    this.physics.add.collider(this.princess, wallsLayer)

    this.physics.add.collider(this.player, lavaLayer, () => {
      // need better die effect
      this.player.setActive(false).setVisible(false) // Disable player
      this.scene.restart() // Restart the game
    })

    for (const dragon of this.dragons.children.entries) {
    }
    this.physics.add.overlap(this.dragons, lavaLayer, (dragon, lava) => {
      console.log("Dragon fell into lava", dragon, lava)
      // dragon.destroy()
    })

    // Add overlap for saving the princess
    this.physics.add.overlap(
      this.player,
      this.princess,
      () => this.scene.start("GameOverScene"),
      undefined,
      this,
    )

    // Add keyboard controls
    this.cursors = this.input.keyboard!.createCursorKeys()

    // Enable debug mode for physics
    this.physics.world.createDebugGraphic()
    const debugGraphic = this.physics.world.debugGraphic
    debugGraphic.setVisible(false)

    // Add a toggle for the debug overlay using the D key
    this.input.keyboard?.addKey("I")?.on("down", () => {
      debugGraphic.setVisible(!debugGraphic.visible)
    })

    // Create a group for bullets
    this.bullets = this.physics.add.group({
      classType: Bullet,
      gravityY: 0,
    })

    // Add collision detection between bullets and dragons
    this.physics.add.overlap(this.bullets, this.dragons, (bullet, dragon) => {
      bullet.destroy()
      dragon.destroy()
    })
  }

  update() {
    if (!this.cursors) return

    // Player movement
    if (this.cursors.left?.isDown) {
      this.player.setVelocityX(-160)
      this.player.anims.play("run-right", true)
      this.player.setFlipX(true) // Mirror the sprite for left movement
      this.lastDirection = "left"
    } else if (this.cursors.right?.isDown) {
      this.player.setVelocityX(160)
      this.player.anims.play("run-right", true)
      this.player.setFlipX(false) // Default orientation for right movement
      this.lastDirection = "right"
    } else {
      this.player.setVelocityX(0)
      this.player.anims.play("idle", true)
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.up!) &&
      this.jumpCount < this.maxJumpCount
    ) {
      this.player.setVelocityY(-550)
      this.jumpCount++
    }

    if (
      this.cursors.space.isDown &&
      this.time.now > this.lastShotTime + this.shotDelay
    ) {
      const bulletX =
        this.lastDirection === "right" ? this.player.x + 5 : this.player.x - 5
      const bulletVelocity = this.lastDirection === "right" ? 1200 : -1200
      const bullet = this.bullets.create(bulletX, this.player.y - 17, "bullet")
      bullet.body.velocity.x = bulletVelocity

      this.lastShotTime = this.time.now
    }
    // update shot time
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 1200 },
      debug: false,
    },
  },
  scene: [MainScene, GameOverScene],
}

new Phaser.Game(config)
