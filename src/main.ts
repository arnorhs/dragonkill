import Phaser from "phaser"
import GameOverScene from "./scenes/GameOverScene"
import { Player } from "./gameObjects/Player"

class MainScene extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap
  private player!: Player
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys | null
  private dragons!: Phaser.Physics.Arcade.Group
  private princess!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody

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
    this.load.image("texturesfordragonz", "/tilemaps/texturesfordragonz.png")
    this.load.image("salla-sjor", "/tilemaps/salla-sjor.png")
  }

  createPlayer() {
    this.player = (
      this.map.createFromObjects("items", {
        name: "player",
        classType: Player,
        scene: this,
      }) as Player[]
    )[0]
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
      key: "dragon-right",
      frames: this.anims.generateFrameNumbers("dragon", { start: 0, end: 3 }),
    })

    // Add the tilemap to the scene
    this.map = this.make.tilemap({ key: "dragonzmap" })
    const tileset = this.map.addTilesetImage(
      "texturesfordragonz",
      "texturesfordragonz",
    )
    const tilesetSS = this.map.addTilesetImage("salla-sjor", "salla-sjor")

    // Ensure tileset is not null
    if (!tileset) {
      throw new Error("Tileset could not be loaded.")
    }

    if (!tilesetSS) {
      throw new Error("Tileset 'tilesetSS' could not be loaded.")
    }

    const allTiles = [tileset, tilesetSS]

    // Create layers from the tilemap
    const bgLayer = this.map.createLayer("background", allTiles)
    const wallsLayer = this.map.createLayer("static", allTiles)
    const lavaLayer = this.map.createLayer("lava", allTiles)
    const waterLayer = this.map.createLayer("water", allTiles)

    // Ensure layers are not null
    if (!wallsLayer || !lavaLayer || !bgLayer || !waterLayer) {
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
    waterLayer.setCollisionByProperty({ collides: true })

    this.physics.add.collider(this.player, wallsLayer, () => {
      this.player.resetJumpCount()
    })

    this.physics.add.collider(this.dragons, wallsLayer)
    this.physics.add.collider(this.princess, wallsLayer)

    this.physics.add.collider(this.player, lavaLayer, () => {
      // need better die effect
      this.player.setActive(false).setVisible(false) // Disable player
      this.scene.restart() // Restart the game
    })

    this.physics.add.collider(this.player, waterLayer, () => {
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

    // Add collision detection between bullets and dragons
    this.physics.add.overlap(
      this.player.bullets,
      this.dragons,
      (bullet, dragon) => {
        bullet.destroy()
        dragon.destroy()
      },
    )
  }

  update() {
    if (!this.cursors) return

    // Player movement
    if (this.cursors.left?.isDown) {
      this.player.walkLeft()
    } else if (this.cursors.right?.isDown) {
      this.player.walkRight()
    } else {
      this.player.goIdle()
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursors.up!)) {
      this.player.jump()
    }

    if (this.cursors.space.isDown) {
      this.player.shoot()
    }
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
