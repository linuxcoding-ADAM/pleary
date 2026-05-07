import Phaser from 'phaser';
import storyMusicUrl from '../assets/story_music.mp3';

// ─── BootScene ─────────────────────────────────────────────────────────────────
// Procedurally generates all textures needed for the top-down game.
export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload() {
    // Load emotional story music from src/assets
    this.load.audio('story_music', storyMusicUrl);
  }

  create() {
    this._makePlayer();
    this._makeEnemy();
    this._makeMessage();
    this._makeSafehouse();
    this._makeGround();
    this._makeBuilding();
    this._makeRoad();
    this._makeWall();
    this._makeParticle();
    this.scene.start('GameScene', window.gameData || { playerName: 'Player', difficulty: 'pro' });
  }

  // ── Wall: static maze block ───────────────────────────────────────────────
  _makeWall() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0x2d1e13); g.fillRect(0, 0, 40, 40); // base color
    g.lineStyle(2, 0x0a0503, 0.8);
    g.strokeRect(0, 0, 40, 40);
    // Add some simple brick texture lines
    g.lineStyle(1, 0x5c3d1e, 0.5);
    g.beginPath(); g.moveTo(0, 20); g.lineTo(40, 20); g.strokePath();
    g.beginPath(); g.moveTo(20, 0); g.lineTo(20, 20); g.strokePath();
    g.beginPath(); g.moveTo(10, 20); g.lineTo(10, 40); g.strokePath();
    g.beginPath(); g.moveTo(30, 20); g.lineTo(30, 40); g.strokePath();
    g.generateTexture('wall', 40, 40);
    g.destroy();
  }

  // ── Player: overhead view, cream djellaba ─────────────────────────────────
  _makePlayer() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0x00ccff); g.fillCircle(18, 18, 16); // body
    g.fillStyle(0xffffff); g.fillCircle(18, 12, 8);  // head scarf
    g.fillStyle(0xc8956c); g.fillCircle(18, 12, 6);  // face
    g.fillStyle(0x8b6914); g.fillRect(26, 16, 6, 10); // satchel
    g.generateTexture('player', 36, 36);
    g.destroy();
  }

  // ── Enemy: French soldier, green uniform ─────────────────────────────────
  _makeEnemy() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xff2222); g.fillCircle(16, 16, 14); // body
    g.fillStyle(0x990000); g.fillCircle(16, 10, 7);  // helmet
    g.fillStyle(0xc8956c); g.fillCircle(16, 10, 4);  // face
    g.fillStyle(0x222222); g.fillRect(23, 8, 3, 16); // rifle
    g.generateTexture('enemy', 32, 32);
    g.destroy();
  }

  // ── Message: golden scroll ────────────────────────────────────────────────
  _makeMessage() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xf5e6c8); g.fillRoundedRect(4, 2, 20, 24, 2);
    g.fillStyle(0xe0c98a); g.fillEllipse(14, 2, 20, 8);
    g.fillStyle(0xe0c98a); g.fillEllipse(14, 26, 20, 8);
    g.fillStyle(0x8b6914);
    g.fillRect(7, 8, 14, 2);
    g.fillRect(7, 13, 14, 2);
    g.fillRect(7, 18, 10, 2);
    g.lineStyle(1, 0xd2a03c, 1);
    g.strokeRoundedRect(4, 2, 20, 24, 2);
    g.generateTexture('message', 28, 28);
    g.destroy();
  }

  // ── Safehouse ─────────────────────────────────────────────────────────────
  _makeSafehouse() {
    // Locked version
    const a = this.make.graphics({ add: false });
    a.fillStyle(0x5c3d1e); a.fillRect(0, 20, 72, 52);
    a.fillStyle(0x8b6914); a.fillTriangle(0, 20, 36, 0, 72, 20);
    a.fillStyle(0x3d2b1f); a.fillRect(28, 36, 16, 20); // door
    a.fillStyle(0x888888); a.fillRect(33, 42, 6, 8);   // padlock
    a.fillStyle(0x666666); a.fillRect(32, 40, 8, 4);   // lock top
    a.generateTexture('safehouse_locked', 72, 72);
    a.destroy();

    // Unlocked version (glowing green tint)
    const b = this.make.graphics({ add: false });
    b.fillStyle(0x2a6e3e); b.fillRect(0, 20, 72, 52);
    b.fillStyle(0x3da85e); b.fillTriangle(0, 20, 36, 0, 72, 20);
    b.fillStyle(0x1a3d25); b.fillRect(28, 36, 16, 20); // door
    b.fillStyle(0xd2a03c); b.fillRect(34, 44, 4, 4);   // open lock
    b.generateTexture('safehouse_open', 72, 72);
    b.destroy();
  }

  // ── Ground tile (sandy) ───────────────────────────────────────────────────
  _makeGround() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xc8a96e); g.fillRect(0, 0, 64, 64);
    g.lineStyle(1, 0xb8955a, 0.3);
    g.strokeRect(0, 0, 32, 32); g.strokeRect(32, 0, 32, 32);
    g.strokeRect(0, 32, 32, 32); g.strokeRect(32, 32, 32, 32);
    g.generateTexture('ground', 64, 64);
    g.destroy();
  }

  // ── Building decoration ───────────────────────────────────────────────────
  _makeBuilding() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0x9a7a4a); g.fillRect(0, 0, 80, 60);
    g.fillStyle(0x7a5c2a); g.fillRect(4, 4, 72, 52);
    g.fillStyle(0x5c3d1e); g.fillRect(30, 30, 20, 26); // door
    g.fillStyle(0x2c5f8a); g.fillRect(8, 10, 20, 16);  // window L
    g.fillStyle(0x2c5f8a); g.fillRect(52, 10, 20, 16); // window R
    g.generateTexture('building', 80, 60);
    g.destroy();
  }

  // ── Road tile ─────────────────────────────────────────────────────────────
  _makeRoad() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xaa8855); g.fillRect(0, 0, 64, 64);
    g.lineStyle(2, 0xc8a96e, 0.2); g.strokeRect(0, 0, 64, 64);
    g.generateTexture('road', 64, 64);
    g.destroy();
  }

  // ── Particle ──────────────────────────────────────────────────────────────
  _makeParticle() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0xd2a03c); g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);
    g.destroy();
  }
}
