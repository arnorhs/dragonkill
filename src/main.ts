import Phaser from 'phaser';

class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys | null;
  private dragons!: Phaser.Physics.Arcade.Group;
  private princess!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  private lastDirection: 'left' | 'right' = 'right'; // Track the last direction the player was facing

  constructor() {
    super('MainScene');
  }

  preload() {
    // Load the player sprite sheet
    this.load.spritesheet('prinz', '/sprites/prinz.png', {
      frameWidth: 64,
      frameHeight: 64,
    });

    // Load the princess sprite
    this.load.image('prinsessa', '/sprites/prinsessa.png');

    // Load the tilemap and tileset
    this.load.tilemapTiledJSON('dragonzmap', '/maps/dragonzmap.json');
    this.load.image('textures', '/tilemaps/texturesfordragonz.png');
  }

  create() {
    // Extend the playable area
    this.physics.world.setBounds(0, 0, 3200, 600);
    this.cameras.main.setBounds(0, 0, 3200, 600);

    // Create the player (prince)
    this.player = this.physics.add.sprite(50, 500, 'prinz')
    //this.player.body?.setOffset(17, 28)
    this.player.body?.setSize(15, 45);
    this.player.body?.setOffset(24, 12)
    this.player.setCollideWorldBounds(false); // Allow the player to fall off the screen
    this.cameras.main.startFollow(this.player);


    // Set the dragons to yellow
    this.dragons = this.physics.add.group();
    for (let i = 0; i < 3; i++) {
      const dragon = this.physics.add.sprite(200 + i * 200, 500, '').setDisplaySize(40, 40).setTint(0xffff00);
      dragon.setVelocityX(50 * (i % 2 === 0 ? 1 : -1));
      dragon.setCollideWorldBounds(true);
      dragon.setBounce(1);
      this.dragons.add(dragon);
    }

    // Create the princess
    this.princess = this.physics.add.sprite(700, 400, 'prinsessa').setScale(0.4);
    this.princess.body?.setSize(40, 80);
    this.princess.body?.setOffset(44, 40);

    // Add the tilemap to the scene
    const map = this.make.tilemap({ key: 'dragonzmap' });
    const tileset = map.addTilesetImage('texturesfordragonz', 'textures');

    // Ensure tileset is not null
    if (!tileset) {
      throw new Error("Tileset 'texturesfordragonz' could not be loaded.");
    }

    // Create layers from the tilemap
    const platformsLayer = map.createLayer('platforms', tileset);
    const wallsLayer = map.createLayer('walls', tileset);
    const lavaLayer = map.createLayer('lava', tileset);

    // Ensure layers are not null
    if (!platformsLayer || !wallsLayer) {
      throw new Error("One or more layers could not be created from the tilemap.");
    }

    // Enable collision for the layers
    platformsLayer.setCollisionByProperty({ collides: true });
    wallsLayer.setCollisionByProperty({ collides: true });

    // Add collisions between the player and the layers
    this.physics.add.collider(this.player, platformsLayer);
    this.physics.add.collider(this.player, wallsLayer);

    // Add collisions for dragons and princess
    this.physics.add.collider(this.dragons, platformsLayer);
    this.physics.add.collider(this.dragons, wallsLayer);
    this.physics.add.collider(this.princess, platformsLayer);

    // Add overlap for saving the princess
    this.physics.add.overlap(
      this.player,
      this.princess,
      () => this.savePrincess(),
      undefined,
      this
    );

    // Add keyboard controls
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Enable debug mode for physics
    this.physics.world.createDebugGraphic();
    const debugGraphic = this.physics.world.debugGraphic;
    debugGraphic.setVisible(false)

    // Add a toggle for the debug overlay using the D key
    this.input.keyboard?.addKey('I')?.on('down', () => {
      debugGraphic.setVisible(!debugGraphic.visible);
    });

    // Create player animations
    this.anims.create({
      key: 'idle',
      frames: [{ key: 'prinz', frame: 0 }],
      frameRate: 10,
    });

    this.anims.create({
      key: 'run-right',
      frames: this.anims.generateFrameNumbers('prinz', { start: 8, end: 15 }),
      frameRate: 10,
      repeat: -1,
    });
  }

  update() {
    if (!this.cursors) return;

    // Player movement
    if (this.cursors.left?.isDown) {
      this.player.setVelocityX(-160);
      this.player.anims.play('run-right', true);
      this.player.setFlipX(true); // Mirror the sprite for left movement
      this.lastDirection = 'left';
    } else if (this.cursors.right?.isDown) {
      this.player.setVelocityX(160);
      this.player.anims.play('run-right', true);
      this.player.setFlipX(false); // Default orientation for right movement
      this.lastDirection = 'right';
    } else {
      this.player.setVelocityX(0);
      this.player.anims.play('idle', true);
    }

    if (this.cursors.up?.isDown && this.player.body!.touching.down) {
      this.player.setVelocityY(-550); // Double the jump velocity
    }

    // Check if player falls off screen
    if (this.player.y > this.scale.height) {
      this.player.setActive(false).setVisible(false); // Disable player
      this.scene.restart(); // Restart the game
    }

    // Shooting (space key)
    if (Phaser.Input.Keyboard.JustDown(this.cursors.space!)) {
      const bulletX = this.lastDirection === 'right' ? this.player.x + 5 : this.player.x - 5;
      const bulletVelocity = this.lastDirection === 'right' ? 1200 : -1200;
      const bullet = this.add.rectangle(bulletX, this.player.y - 17, 7, 3, 0xffff00);
      this.physics.add.existing(bullet);
      (bullet.body as Phaser.Physics.Arcade.Body).velocity.x = bulletVelocity;

      // Add collision detection between bullets and dragons
      this.physics.add.overlap(bullet, this.dragons, (bullet, dragon) => {
        (bullet as Phaser.GameObjects.Rectangle).destroy(); // Destroy the bullet
        (dragon as Phaser.Physics.Arcade.Sprite).destroy(); // Destroy the dragon
      });
    }
  }

  savePrincess() {
    this.scene.pause();
    this.add.text(400, 300, 'You saved the princess!', { fontSize: '32px', color: '#ffffff' }).setOrigin(0.5);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1200 },
      debug: false,
    },
  },
  scene: MainScene,
};

new Phaser.Game(config);