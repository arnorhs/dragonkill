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
  }

  create() {
    // Create the ground with holes
    const ground = this.add.group();
    for (let i = 0; i < 800; i += 100) {
      if (i !== 300 && i !== 600) {
        const groundBlock = this.add.rectangle(i, 580, 100, 20, 0x654321);
        this.physics.add.existing(groundBlock, true);
        ground.add(groundBlock);
      }
    }

    // Create platforms
    const platforms = this.add.group();
    const platform1 = this.add.rectangle(200, 400, 150, 20, 0x888888);
    const platform2 = this.add.rectangle(500, 300, 150, 20, 0x888888);
    this.physics.add.existing(platform1, true);
    this.physics.add.existing(platform2, true);
    platforms.add(platform1);
    platforms.add(platform2);

    // Create the player (prince)
    this.player = this.physics.add.sprite(50, 500, 'prinz')
    //this.player.body?.setOffset(17, 28)
    this.player.body?.setSize(15, 45);
    this.player.body?.setOffset(24, 12)
    this.player.setCollideWorldBounds(false); // Allow the player to fall off the screen

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

    // Add collisions
    this.physics.add.collider(this.player, ground);
    this.physics.add.collider(this.player, platforms);
    this.physics.add.collider(this.dragons, ground);
    this.physics.add.collider(this.dragons, platforms);
    this.physics.add.collider(this.princess, ground);

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