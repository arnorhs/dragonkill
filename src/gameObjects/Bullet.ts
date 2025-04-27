export class Bullet extends Phaser.GameObjects.Rectangle {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 7, 3, 0xffff00)
    this.setOrigin(0.5, 0.5)
    scene.physics.add.existing(this)
  }
}
