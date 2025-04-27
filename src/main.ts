import Phaser from "phaser"
import GameOverScene from "./scenes/GameOverScene"

class MainScene extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap
  private player!: Phaser.Physics.Arcade.Sprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys | null
  private dragons!: Phaser.Physics.Arcade.Group
  private princess!: Phaser.Physics.Arcade.Sprite
  private lastDirection: "left" | "right" = "right" // Track the last direction the player was facing

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
      }) as Phaser.Physics.Arcade.Sprite[]
    )[0]
    this.physics.world.enable(this.player)
    this.player.setTexture("prinz")
    this.player.body?.setSize(15, 45)
    this.player.body?.setOffset(24, 12)
    this.player.setCollideWorldBounds(false) // Allow the player to fall off the screen
  }

  createPrincess() {
    this.princess = (
      this.map.createFromObjects("items", {
        name: "princess",
        classType: Phaser.Physics.Arcade.Sprite,
        scene: this,
      }) as Phaser.Physics.Arcade.Sprite[]
    )[0]
    this.physics.world.enable(this.princess)
    this.princess.setTexture("prinsessa")
    this.princess.body?.setSize(40, 80)
    this.princess.body?.setOffset(44, 40)
  }

  createDragons() {
    this.dragons = this.physics.add.group()

    const dragons = this.map.createFromObjects("items", {
      name: "dragon",
      classType: Phaser.Physics.Arcade.Sprite,
    }) as Phaser.Physics.Arcade.Sprite[]

    this.dragons.addMultiple(dragons)

    this.physics.world.enable(this.dragons)

    let vel = -1
    for (const dragon of dragons) {
      dragon.setTexture("dragon")
      dragon.setVelocityX(50 * vel)
      vel *= -1
      dragon.setCollideWorldBounds(true, 1, 0, true)
      dragon.body?.setSize(40, 40)
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

    this.createPlayer()
    this.createPrincess()
    this.createDragons()

    this.cameras.main.startFollow(this.player)

    this.physics.world.on(
      "worldbounds",
      (
        body: Phaser.Physics.Arcade.Body,
        _blockedUp: boolean,
        blockedDown: boolean,
        _blockedLeft: boolean,
        _blockedRight: boolean,
      ) => {
        if (
          blockedDown &&
          this.dragons.contains(body.gameObject) &&
          body.gameObject instanceof Phaser.Physics.Arcade.Sprite
        ) {
          this.dragons.remove(body.gameObject, true, true)
        }
      },
    )

    // Ensure tileset is not null
    if (!tileset) {
      throw new Error("Tileset 'texturesfordragonz' could not be loaded.")
    }

    // Create layers from the tilemap
    const platformsLayer = this.map.createLayer("platforms", tileset)
    const wallsLayer = this.map.createLayer("walls", tileset)
    const lavaLayer = this.map.createLayer("lava", tileset)

    // Ensure layers are not null
    if (!platformsLayer || !wallsLayer) {
      throw new Error(
        "One or more layers could not be created from the tilemap.",
      )
    }

    // Extend the playable area
    this.physics.world.setBounds(0, 0, wallsLayer.width, wallsLayer.height)
    this.cameras.main.setBounds(
      0,
      0,
      this.physics.world.bounds.width,
      this.physics.world.bounds.height,
    )

    // Enable collision for the layers
    platformsLayer.setCollisionByProperty({ collides: true })
    wallsLayer.setCollisionByProperty({ collides: true })

    // Add collisions between the player and the layers
    this.physics.add.collider(this.player, platformsLayer)
    this.physics.add.collider(this.player, wallsLayer)

    // Add collisions for dragons and princess
    this.physics.add.collider(this.dragons, platformsLayer)
    this.physics.add.collider(this.dragons, wallsLayer)
    this.physics.add.collider(this.princess, platformsLayer)
    this.physics.add.collider(this.princess, wallsLayer)

    // Add overlap for saving the princess
    this.physics.add.overlap(
      this.player,
      this.princess,
      () => this.savePrincess(),
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

    if (Phaser.Input.Keyboard.JustDown(this.cursors.up!)) {
      this.player.setVelocityY(-550) // Double the jump velocity
    }

    // Check if player falls off screen
    if (this.player.y > this.physics.world.bounds.height) {
      this.player.setActive(false).setVisible(false) // Disable player
      this.scene.restart() // Restart the game
    }

    // Shooting (space key)
    if (Phaser.Input.Keyboard.JustDown(this.cursors.space!)) {
      const bulletX =
        this.lastDirection === "right" ? this.player.x + 5 : this.player.x - 5
      const bulletVelocity = this.lastDirection === "right" ? 1200 : -1200
      const bullet = this.add.rectangle(
        bulletX,
        this.player.y - 17,
        7,
        3,
        0xffff00,
      )
      this.physics.add.existing(bullet)
      ;(bullet.body as Phaser.Physics.Arcade.Body).velocity.x = bulletVelocity

      // Add collision detection between bullets and dragons
      this.physics.add.overlap(bullet, this.dragons, (bullet, dragon) => {
        ;(bullet as Phaser.GameObjects.Rectangle).destroy() // Destroy the bullet
        ;(dragon as Phaser.Physics.Arcade.Sprite).destroy() // Destroy the dragon
      })
    }
  }

  savePrincess() {
    this.scene.start("GameOverScene")
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
