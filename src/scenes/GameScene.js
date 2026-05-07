import Phaser from 'phaser';
import { HISTORICAL_MESSAGES, FULL_STORY } from '../data/messages.js';
import { SoundFX } from '../utils/SoundFX.js';

// ─── Maze Layout (1 = Wall, 0 = Path) ──────────────────────────────────────
const MAZE = [
  "111111111111111111111111111111",
  "100000100000000010000000000001",
  "101110101111111010111110111101",
  "101000000000001000000010100001",
  "101011111011101111101010101101",
  "100010000010000000101000001001",
  "111010111110111110101111111011",
  "100000000000000000100000000001",
  "101111101111111110111111111011",
  "101000101000000000000010000001",
  "101010101011111011111010111101",
  "100010001000001010001010100001",
  "111111101111101010101010101111",
  "100000000000101000100010000001",
  "101111111110101111111111111011",
  "101000000010100000000000001001",
  "101011111010111111101111101101",
  "100010000010000000100000100001",
  "111111111111111111111111111111"
];
const TSIZE = 40;
const ROWS = MAZE.length;
const COLS = MAZE[0].length;
const WW = COLS * TSIZE;
const WH = ROWS * TSIZE;
const CW = 1200, CH = 600;

// Mini-map dimensions
const MM_W = 200, MM_H = 126;
const MM_X = 975, MM_Y = 50;
const MM_SX = MM_W / WW, MM_SY = MM_H / WH;

const MSG_POS = [
  { x: 3 * TSIZE + 20, y: 1 * TSIZE + 20 },
  { x: 13 * TSIZE + 20, y: 3 * TSIZE + 20 },
  { x: 27 * TSIZE + 20, y: 7 * TSIZE + 20 },
  { x: 1 * TSIZE + 20, y: 17 * TSIZE + 20 },
  { x: 27 * TSIZE + 20, y: 15 * TSIZE + 20 },
  { x: 2 * TSIZE + 20, y: 11 * TSIZE + 20 }, // 6th message
];
const SH_POS = { x: 28 * TSIZE, y: 1 * TSIZE + 20 };

const PATROLS = [
  [{ x: 100, y: 220 }, { x: 300, y: 220 }],
  [{ x: 620, y: 140 }, { x: 620, y: 300 }],
  [{ x: 380, y: 380 }, { x: 740, y: 380 }],
  [{ x: 1100, y: 100 }, { x: 1100, y: 380 }],
  [{ x: 380, y: 540 }, { x: 700, y: 540 }],
  [{ x: 700, y: 620 }, { x: 1020, y: 620 }],
  [{ x: 140, y: 620 }, { x: 340, y: 620 }],
  [{ x: 940, y: 380 }, { x: 940, y: 620 }]
];

// ─── GameScene ────────────────────────────────────────────────────────────────
export class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  init(data) {
    this.playerName = data.playerName || 'Player';
    this.difficulty = data.difficulty || 'pro';

    this.collected = 0;
    this.total = HISTORICAL_MESSAGES.length;
    this.dead = false;
    this.won = false;
    this.popupOpen = false;
    this.shUnlocked = false;
    this.timeElapsed = 0;

    if (this.difficulty === 'easy') {
      this.playerMaxV = 160; this.patrolSpeed = 50; this.chaseSpeed = 80; this.detectRad = 120;
    } else if (this.difficulty === 'expert') {
      this.playerMaxV = 160; this.patrolSpeed = 90; this.chaseSpeed = 140; this.detectRad = 220;
    } else {
      this.playerMaxV = 160; this.patrolSpeed = 70; this.chaseSpeed = 110; this.detectRad = 180;
    }
  }

  create() {
    SoundFX.ambient(0.2); // Pass volume

    this.physics.world.setBounds(0, 0, WW, WH);
    this.add.tileSprite(WW / 2, WH / 2, WW, WH, 'ground').setDepth(0);
    this.walls = this.physics.add.staticGroup();

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAZE[r][c] === '1') {
          this.walls.create(c * TSIZE + TSIZE / 2, r * TSIZE + TSIZE / 2, 'wall').setDepth(2);
        }
      }
    }

    this.safeSprite = this.add.image(SH_POS.x, SH_POS.y, 'safehouse_locked').setDepth(1);

    this.messages = this.physics.add.staticGroup();
    MSG_POS.forEach((pos, i) => {
      const glow = this.add.image(pos.x, pos.y, 'message').setDepth(1).setTint(0xffee88).setAlpha(0.6);
      this.tweens.add({ targets: glow, scale: 1.8, alpha: 0, duration: 800, repeat: -1 });

      const m = this.messages.create(pos.x, pos.y, 'message').setDepth(3);
      m.setData('idx', i);
      m.setData('glow', glow);
      this.tweens.add({ targets: m, y: pos.y - 8, duration: 800 + i * 100, yoyo: true, repeat: -1 });
    });

    this.player = this.physics.add.sprite(60, 60, 'player');
    this.player.setDepth(4).setCollideWorldBounds(true);
    this.player.body.setSize(20, 20);
    this.player.setDrag(800); // Smooth stopping
    this.player.setMaxVelocity(this.playerMaxV); // Cap maximum speed

    this.playerScaleTween = this.tweens.add({
      targets: this.player, scaleX: 1.1, scaleY: 0.9, duration: 150, yoyo: true, repeat: -1, paused: true
    });

    this.enemies = this.physics.add.group();
    PATROLS.forEach((pts, idx) => {
      if (this.difficulty === 'easy' && idx % 2 === 1) return;
      const e = this.enemies.create(pts[0].x, pts[0].y, 'enemy');
      e.setDepth(4).setCollideWorldBounds(true);
      e.body.setSize(20, 20);
      e.ai = { state: 'patrol', pts: pts, ptIdx: 0, lastKnownX: 0, lastKnownY: 0, searchTimer: 0 };
    });

    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.overlap(this.player, this.messages, this._collectMessage, null, this);
    this.physics.add.overlap(this.player, this.enemies, this._hitEnemy, null, this);

    this.cameras.main.setViewport(250, 0, 700, 600);
    this.cameras.main.setBounds(0, 0, WW, WH);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.Z,
      left: Phaser.Input.Keyboard.KeyCodes.Q,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D
    });

    this.uiCam = this.cameras.add(0, 0, 1200, 600);
    this._buildUI();

    this.uiCam.ignore(this.children.list.filter(c => !c.isUI));
    this.cameras.main.ignore(this.children.list.filter(c => c.isUI));

    // Ensure uiCam does not clear the screen with black
    this.uiCam.setBackgroundColor('rgba(0,0,0,0)');

    // Intro fade screen
    this.physics.pause();
    const sf = obj => { obj.setScrollFactor(0).setDepth(200); obj.isUI = true; return obj; };
    const fadeBg = sf(this.add.rectangle(600, 300, 1200, 600, 0x0a0508, 1));
    const fadeText = sf(this.add.text(600, 300, 'هذه لعبة رسالة 8 ماي 1945', { fontFamily: 'Arial', fontSize: '36px', color: '#d2a03c', fontStyle: 'bold', rtl: true }).setOrigin(0.5));
    
    this.time.delayedCall(1800, () => {
        this.tweens.add({
            targets: [fadeBg, fadeText],
            alpha: 0,
            duration: 800,
            onComplete: () => {
                fadeBg.destroy();
                fadeText.destroy();
                this.physics.resume();
            }
        });
    });
  }

  update(time, delta) {
    this._drawMinimap();

    if (this.dead || this.won || this.popupOpen) return;

    this.timeElapsed += delta;
    const secs = Math.floor(this.timeElapsed / 1000);
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    this.hudTime.setText(`الوقت: ${m}:${s}`);

    this._updatePlayer();
    this._updateEnemies(time);
    this._checkSafehouse();
  }

  _updatePlayer() {
    const speed = this.playerMaxV || 160;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.keys.A.isDown || this.keys.left.isDown) {
      vx = -speed;
    } else if (this.cursors.right.isDown || this.keys.D.isDown || this.keys.right.isDown) {
      vx = speed;
    }

    if (this.cursors.up.isDown || this.keys.W.isDown || this.keys.up.isDown) {
      vy = -speed;
    } else if (this.cursors.down.isDown || this.keys.S.isDown || this.keys.down.isDown) {
      vy = speed;
    }

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx = (vx / len) * speed;
      vy = (vy / len) * speed;
    }

    this.player.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      this.playerScaleTween.resume();
      if (vx !== 0) this.player.setFlipX(vx < 0);
    } else {
      this.playerScaleTween.pause();
      this.player.setScale(1);
    }
  }

  _updateEnemies(time) {
    const detectRadSq = this.detectRad * this.detectRad;
    const px = this.player.x;
    const py = this.player.y;

    this.enemies.getChildren().forEach(e => {
      const data = e.ai;

      // Use squared distance to avoid expensive Math.sqrt calls
      const dx = e.x - px;
      const dy = e.y - py;
      const distSq = (dx * dx) + (dy * dy);
      const canSee = distSq < detectRadSq;

      if (canSee && data.state !== 'chase') {
        data.state = 'chase'; SoundFX.alert();
        e.setTint(0xffaa22); this.tweens.add({ targets: e, alpha: 0.5, yoyo: true, repeat: -1, duration: 150 });
      } else if (!canSee && data.state === 'chase') {
        data.state = 'search'; data.searchTimer = time + 2000;
        e.clearTint(); this.tweens.killTweensOf(e); e.setAlpha(1);
      } else if (data.state === 'search' && time > data.searchTimer) {
        data.state = 'patrol';
      }

      if (data.state === 'chase') {
        this.physics.moveToObject(e, this.player, this.chaseSpeed);
        data.lastKnownX = this.player.x; data.lastKnownY = this.player.y;
      } else if (data.state === 'search') {
        const sdx = e.x - data.lastKnownX;
        const sdy = e.y - data.lastKnownY;
        if ((sdx * sdx + sdy * sdy) > 100) { // 10 squared
          this.physics.moveTo(e, data.lastKnownX, data.lastKnownY, this.patrolSpeed);
        } else e.setVelocity(0);
      } else {
        const target = data.pts[data.ptIdx];
        const tdx = e.x - target.x;
        const tdy = e.y - target.y;
        if ((tdx * tdx + tdy * tdy) < 100) { // 10 squared
          data.ptIdx = (data.ptIdx + 1) % data.pts.length;
        } else this.physics.moveTo(e, target.x, target.y, this.patrolSpeed);
      }

      if (e.body.velocity.x !== 0) e.setFlipX(e.body.velocity.x < 0);
    });
  }

  _collectMessage(player, msgSprite) {
    if (this.popupOpen) return;
    SoundFX.collect();
    this._burst(player.x, player.y);

    const idx = msgSprite.getData('idx');
    msgSprite.getData('glow').destroy();
    msgSprite.destroy();

    this.collected++;
    this.hudText.setText(`أجزاء الحقيقة: ${this.collected} / ${this.total}`);

    if (this.collected >= this.total) {
      this.shUnlocked = true;
      this.safeSprite.setTexture('safehouse_open');
      this.hudStatus.setText('الملجأ: مفتوح').setColor('#2aff7a');
    }

    const data = HISTORICAL_MESSAGES[idx];
    this._showPopup(data.title, data.text, data.color);
  }

  _checkSafehouse() {
    const dx = this.player.x - SH_POS.x;
    const dy = this.player.y - SH_POS.y;
    // 40 squared = 1600
    if ((dx * dx + dy * dy) < 1600) {
      if (this.shUnlocked) this._showVictory();
      else if (!this._lockFlashing) {
        this._lockFlashing = true; this.safeSprite.setTint(0xff4444);
        this.time.delayedCall(300, () => { this.safeSprite.clearTint(); this._lockFlashing = false; });
      }
    }
  }

  _buildUI() {
    const sf = obj => { obj.setScrollFactor(0).setDepth(80); obj.isUI = true; return obj; };

    sf(this.add.rectangle(125, 300, 250, 600, 0x0a0508, 1));
    sf(this.add.rectangle(249, 300, 2, 600, 0xd2a03c, 0.4));

    const diffMap = { 'easy': 'سهل', 'pro': 'متوسط', 'expert': 'خبير' };
    const diffText = diffMap[this.difficulty] || this.difficulty;

    sf(this.add.text(125, 60, 'المناضل', { fontFamily: 'Cinzel, Arial', fontSize: '32px', color: '#d2a03c', fontStyle: 'bold' }).setOrigin(0.5));
    sf(this.add.text(125, 120, `مرحبًا أيها المناضل\n${this.playerName}`, { fontFamily: 'Arial', fontSize: '20px', color: '#ffffff', align: 'center', lineSpacing: 8 }).setOrigin(0.5));
    sf(this.add.text(125, 180, `المستوى: ${diffText}`, { fontFamily: 'Arial', fontSize: '18px', color: '#aaaaaa', rtl: true }).setOrigin(0.5));
    
    // Initialize hudTime so it doesn't crash the update loop
    this.hudTime = sf(this.add.text(125, 230, `الوقت: 00:00`, { fontFamily: 'Arial', fontSize: '18px', color: '#ffffff', rtl: true }).setOrigin(0.5));
    
    this.hudText = sf(this.add.text(125, 280, `أجزاء الحقيقة: 0 / ${this.total}`, { fontFamily: 'Arial', fontSize: '18px', color: '#d2a03c', rtl: true }).setOrigin(0.5));
    
    this.hudStatus = sf(this.add.text(125, 330, 'الملجأ: مغلق', { fontFamily: 'Arial', fontSize: '18px', color: '#ff6060', rtl: true }).setOrigin(0.5));
    
    sf(this.add.text(125, 520, 'التحكم', { fontFamily: 'Arial', fontSize: '18px', color: '#d2a03c', rtl: true }).setOrigin(0.5));
    sf(this.add.text(125, 550, 'الأسهم / WASD / ZQSD', { fontFamily: 'Arial', fontSize: '14px', color: '#aaaaaa' }).setOrigin(0.5));

    sf(this.add.rectangle(1075, 300, 250, 600, 0x0a0508, 1));
    sf(this.add.rectangle(951, 300, 2, 600, 0xd2a03c, 0.4));

    sf(this.add.text(1075, 30, 'الخريطة التكتيكية', { fontFamily: 'Arial', fontSize: '18px', color: '#d2a03c', fontStyle: 'bold' }).setOrigin(0.5));

    sf(this.add.text(1075, 200, 'الدليل', { fontFamily: 'Arial', fontSize: '16px', color: '#d2a03c' }).setOrigin(0.5));
    sf(this.add.circle(1000, 230, 4, 0x2aff7a)); sf(this.add.text(1015, 230, 'اللاعب', { fontFamily: 'Arial', fontSize: '14px', color: '#fff', rtl: true }).setOrigin(0, 0.5));
    sf(this.add.circle(1000, 250, 4, 0xff4444)); sf(this.add.text(1015, 250, 'دورية', { fontFamily: 'Arial', fontSize: '14px', color: '#fff', rtl: true }).setOrigin(0, 0.5));
    sf(this.add.circle(1000, 270, 4, 0xffd700)); sf(this.add.text(1015, 270, 'رسالة', { fontFamily: 'Arial', fontSize: '14px', color: '#fff', rtl: true }).setOrigin(0, 0.5));
    sf(this.add.rectangle(1000, 290, 8, 8, 0x0066ff)); sf(this.add.text(1015, 290, 'الملجأ', { fontFamily: 'Arial', fontSize: '14px', color: '#fff', rtl: true }).setOrigin(0, 0.5));

    this.mmGfx = this.add.graphics().setDepth(81).setScrollFactor(0);
    this.mmGfx.isUI = true;
  }

  _drawMinimap() {
    const g = this.mmGfx; g.clear();
    g.fillStyle(0x111116, 1); g.fillRect(MM_X, MM_Y, MM_W, MM_H);
    g.lineStyle(2, 0xd2a03c, 0.8); g.strokeRect(MM_X, MM_Y, MM_W, MM_H);

    g.fillStyle(0x3d2b1f, 0.5);
    this.walls.getChildren().forEach(w => g.fillRect(MM_X + (w.x - 20) * MM_SX, MM_Y + (w.y - 20) * MM_SY, 40 * MM_SX, 40 * MM_SY));
    g.fillStyle(0xff4444, 1);
    this.enemies.getChildren().forEach(e => g.fillCircle(MM_X + e.x * MM_SX, MM_Y + e.y * MM_SY, 3));
    g.fillStyle(0xffd700, 1);
    this.messages.getChildren().forEach(m => g.fillCircle(MM_X + m.x * MM_SX, MM_Y + m.y * MM_SY, 3));
    g.fillStyle(this.shUnlocked ? 0x2aff7a : 0x0066ff, 1);
    g.fillRect(MM_X + SH_POS.x * MM_SX - 4, MM_Y + SH_POS.y * MM_SY - 4, 8, 8);
    g.fillStyle(0x2aff7a, 1);
    g.fillCircle(MM_X + this.player.x * MM_SX, MM_Y + this.player.y * MM_SY, 3.5);
  }

  _showPopup(title, body, color) {
    this.popupOpen = true; this.physics.pause(); this.playerScaleTween.pause();

    const sf = obj => { obj.setScrollFactor(0).setDepth(100); obj.isUI = true; return obj; };
    const elems = [
      sf(this.add.rectangle(CW / 2, CH / 2, CW, CH, 0x000000, 0.85)),
      sf(this.add.rectangle(CW / 2, CH / 2, 640, 350, 0x0d0d18, 0.95).setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color)),
      sf(this.add.text(CW / 2, CH / 2 - 150, `جزء مُكتشف (${this.collected}/${this.total})`, { fontFamily: 'Arial', fontSize: '20px', color: '#d2a03c', fontStyle: 'bold', rtl: true }).setOrigin(0.5)),
      sf(this.add.text(CW / 2, CH / 2 - 110, title, { fontFamily: 'Arial', fontSize: '30px', color: color, stroke: '#000', strokeThickness: 3, rtl: true, align: 'center' }).setOrigin(0.5)),
      sf(this.add.rectangle(CW / 2, CH / 2 - 70, 540, 1, 0xd2a03c, 0.4)),
      sf(this.add.text(CW / 2, CH / 2 + 10, body, { fontFamily: 'Arial', fontSize: '28px', color: '#ffffff', align: 'center', rtl: true, wordWrap: { width: 580 }, lineSpacing: 18 }).setOrigin(0.5))
    ];

    if (this.collected === 4 || this.collected === 5) {
      elems.push(sf(this.add.text(CW / 2, CH / 2 + 100, 'اقتربت... الحقيقة قريبة', { fontFamily: 'Arial', fontSize: '18px', color: '#2aff7a', fontStyle: 'italic', rtl: true }).setOrigin(0.5)));
    }

    const btn = sf(this.add.text(CW / 2, CH / 2 + 140, '[ اضغط أي زر للمتابعة ]', { fontFamily: 'Arial', fontSize: '18px', color: '#d2a03c', rtl: true }).setOrigin(0.5));
    elems.push(btn);
    
    // Quick glow effect
    const glow = sf(this.add.rectangle(CW / 2, CH / 2, CW, CH, 0xd2a03c, 0.2).setBlendMode(Phaser.BlendModes.ADD));
    elems.push(glow);
    this.tweens.add({ targets: glow, alpha: 0, duration: 600 });
    this.tweens.add({ targets: btn, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });

    const close = () => {
      this.input.keyboard.off('keydown', close);
      this.input.off('pointerdown', close);

      elems.forEach(e => e.destroy());
      this.popupOpen = false;

      if (this.physics && this.physics.world) {
        this.physics.resume();
      }
    };

    // Only use Phaser input events as requested
    this.time.delayedCall(300, () => {
      this.input.keyboard.on('keydown', close);
      this.input.on('pointerdown', close);
    });

    // Animate in
    elems.forEach(e => { e.alpha = 0; this.tweens.add({ targets: e, alpha: 1, duration: 250 }); });

    this.uiCam.ignore(this.children.list.filter(c => !c.isUI));
    this.cameras.main.ignore(this.children.list.filter(c => c.isUI));
  }

  _hitEnemy() {
    if (this.dead || this.popupOpen) return;
    this.dead = true; this.physics.pause(); SoundFX.death();

    this.cameras.main.shake(400, 0.02);
    this.cameras.main.flash(300, 180, 0, 0);

    this.time.delayedCall(500, () => {
      const sf = obj => { obj.setScrollFactor(0).setDepth(110); obj.isUI = true; return obj; };
      const bg = sf(this.add.rectangle(CW / 2, CH / 2, CW, CH, 0x000000, 0));
      this.tweens.add({ targets: bg, fillAlpha: 0.9, duration: 1000 });

      this.time.delayedCall(800, () => {
        sf(this.add.text(CW / 2, CH / 2 - 100, 'تم القبض عليك', { fontFamily: 'Arial', fontSize: '42px', color: '#c44a2a', stroke: '#000', strokeThickness: 6, rtl: true }).setOrigin(0.5));

        const subTxt = "لكن حتى في الفشل، تبقى الحقيقة:\nفي 8 ماي 1945، قُتل عشرات الآلاف خلال قمع المظاهرات السلمية.";
        sf(this.add.text(CW / 2, CH / 2, subTxt, { fontFamily: 'Arial', fontSize: '20px', color: '#ffffff', align: 'center', rtl: true, lineSpacing: 14 }).setOrigin(0.5));

        const btn = sf(this.add.text(CW / 2, CH / 2 + 100, '[ العب مرة أخرى ]', { fontFamily: 'Arial', fontSize: '20px', color: '#d2a03c', rtl: true }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
        this.tweens.add({ targets: btn, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
        btn.on('pointerdown', () => { window.location.reload(); });

        this.uiCam.ignore(this.children.list.filter(c => !c.isUI));
        this.cameras.main.ignore(this.children.list.filter(c => c.isUI));
      });
    });
  }

  _showVictory() {
    if (this.won) return;
    this.won = true; this.physics.pause(); SoundFX.victory();

    const sf = obj => { obj.setScrollFactor(0).setDepth(110); obj.isUI = true; return obj; };
    const bg = sf(this.add.rectangle(CW / 2, CH / 2, CW, CH, 0x000000, 0));
    this.tweens.add({ targets: bg, fillAlpha: 0.95, duration: 1000 });

    this.time.delayedCall(800, () => {
      const title = sf(this.add.text(CW / 2, CH / 2 - 120, 'اكتملت المهمة', { fontFamily: 'Arial', fontSize: '48px', color: '#d2a03c', stroke: '#000', strokeThickness: 4, fontStyle: 'bold', rtl: true }).setOrigin(0.5));
      const sub = sf(this.add.text(CW / 2, CH / 2 - 60, 'لقد كشفت حقيقة 8 ماي 1945', { fontFamily: 'Arial', fontSize: '22px', color: '#2aff7a', rtl: true }).setOrigin(0.5));

      const readBtn = sf(this.add.text(CW / 2, CH / 2 + 40, '👉 اقرأ القصة كاملة', { fontFamily: 'Arial', fontSize: '24px', color: '#f5e6c8', rtl: true }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
      this.tweens.add({ targets: readBtn, alpha: 0.5, duration: 600, yoyo: true, repeat: -1 });

      readBtn.on('pointerdown', () => {
        // 1. Stop Game Audio
        this.sound.stopAll();
        if (SoundFX.stopAmbient) SoundFX.stopAmbient();

        if (SoundFX.storyOpen) SoundFX.storyOpen();
        title.setVisible(false); sub.setVisible(false); readBtn.setVisible(false);

        // 2. Start Story Music
        if (this.cache.audio.exists('story_music')) {
          this.storyMusic = this.sound.add('story_music', { volume: 0, loop: true });
          this.storyMusic.play();
          this.tweens.add({ targets: this.storyMusic, volume: 0.4, duration: 1000 });
        } else {
          // Upgrade/Fallback: Procedural emotional chord progression
          if (SoundFX.playStorySong) SoundFX.playStorySong();
        }

        const storyTitle = sf(this.add.text(CW / 2, CH / 2 - 250, 'الحقيقة الكاملة', { fontFamily: 'Arial', fontSize: '36px', color: '#d2a03c', stroke: '#000', strokeThickness: 4, fontStyle: 'bold', rtl: true }).setOrigin(0.5));
        storyTitle.setAlpha(0);
        this.tweens.add({ targets: storyTitle, alpha: 1, duration: 800 });

        // Scrollable HTML container for the story with backdrop-blur
        const storyHtml = `
          <style>
            #story-container { scroll-behavior: smooth; }
            #story-container::-webkit-scrollbar { width: 8px; }
            #story-container::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 4px; }
            #story-container::-webkit-scrollbar-thumb { background: rgba(210,160,60,0.6); border-radius: 4px; }
            #story-container::-webkit-scrollbar-thumb:hover { background: rgba(210,160,60,0.9); }
          </style>
          <div id="story-container" style="width: 850px; height: 440px; overflow-y: auto; color: white; text-align: justify; direction: rtl; font-family: Arial, sans-serif; font-size: 26px; line-height: 2.2; padding: 40px; box-sizing: border-box; background: rgba(10,10,15,0.85); backdrop-filter: blur(8px); border: 2px solid rgba(210,160,60,0.8); border-radius: 12px; box-shadow: 0 0 25px rgba(210,160,60,0.4);">
            <div id="story-content"></div>
          </div>
        `;

        const domEl = this.add.dom(CW / 2, CH / 2 - 10).createFromHTML(storyHtml).setDepth(111).setScrollFactor(0);
        domEl.isUI = true;
        domEl.setAlpha(0);
        domEl.setScale(0.95);
        this.tweens.add({ targets: domEl, alpha: 1, scale: 1, duration: 600, ease: 'Back.out' });

        const continueBtn = sf(this.add.text(CW / 2, CH / 2 + 250, '[ متابعة ]', { fontFamily: 'Arial', fontSize: '24px', color: '#2aff7a', rtl: true }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
        continueBtn.setAlpha(0);

        let currentText = "";
        const finalStoryText = FULL_STORY;
        
        const runTypewriter = (text, idx) => {
            if (idx >= text.length) {
                this.tweens.add({ targets: continueBtn, alpha: 1, duration: 800 });
                continueBtn.on('pointerover', () => this.tweens.add({ targets: continueBtn, scale: 1.1, duration: 150 }));
                continueBtn.on('pointerout', () => this.tweens.add({ targets: continueBtn, scale: 1, duration: 150 }));
                return;
            }
            
            const char = text[idx];
            currentText += (char === '\n') ? '<br/>' : char;
            
            const contentDiv = domEl.node.querySelector('#story-content');
            if (contentDiv) {
              contentDiv.innerHTML = currentText;
              setTimeout(() => {
                const container = domEl.node.querySelector('#story-container');
                if (container) container.scrollTop = container.scrollHeight;
              }, 10);
            }
            
            const delay = (char === '\n') ? 150 : 20; // Pause between paragraphs
            this.time.delayedCall(delay, () => runTypewriter(text, idx + 1));
        };
        
        runTypewriter(finalStoryText, 0);

        continueBtn.on('pointerdown', () => { 
            if (SoundFX.stopStorySong) SoundFX.stopStorySong();
            if (this.storyMusic) {
                this.tweens.add({ targets: this.storyMusic, volume: 0, duration: 500, onComplete: () => this.storyMusic.stop() });
            }

            domEl.destroy();
            storyTitle.destroy();
            continueBtn.destroy();
            
            title.setVisible(true);
            sub.setVisible(true);
            
            const finalPlayBtn = sf(this.add.text(CW / 2, CH / 2 + 40, '[ العب مرة أخرى ]', { fontFamily: 'Arial', fontSize: '24px', color: '#d2a03c', rtl: true }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
            finalPlayBtn.on('pointerover', () => this.tweens.add({ targets: finalPlayBtn, scale: 1.1, duration: 150 }));
            finalPlayBtn.on('pointerout', () => this.tweens.add({ targets: finalPlayBtn, scale: 1, duration: 150 }));
            finalPlayBtn.on('pointerdown', () => { window.location.reload(); });
            this.tweens.add({ targets: finalPlayBtn, alpha: {from: 0.5, to: 1}, duration: 600, yoyo: true, repeat: -1 });
        });

        this.uiCam.ignore(this.children.list.filter(c => !c.isUI));
        this.cameras.main.ignore(this.children.list.filter(c => c.isUI));
      });

      this.uiCam.ignore(this.children.list.filter(c => !c.isUI));
      this.cameras.main.ignore(this.children.list.filter(c => c.isUI));

      this.time.addEvent({ delay: 50, repeat: 100, callback: () => this._burst(Phaser.Math.Between(250, 950), -20) });
    });
  }

  _burst(x, y) {
    for (let i = 0; i < 12; i++) {
      const p = this.add.image(x, y, 'particle').setDepth(10);
      this.tweens.add({ targets: p, x: x + Phaser.Math.Between(-40, 40), y: y + Phaser.Math.Between(-40, 40), alpha: 0, scale: 0, duration: Phaser.Math.Between(400, 800), onComplete: () => p.destroy() });
    }
  }
}

