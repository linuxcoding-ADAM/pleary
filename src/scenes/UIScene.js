import Phaser from 'phaser';

// ─── UIScene ──────────────────────────────────────────────────────────────────
// Runs in parallel with GameScene (no physics, overlay only).
// Handles: HUD, message popups, game-over screen, win screen.

const W = 900;
const H = 500;

// Color palette
const COLOR_GOLD   = '#d2a03c';
const COLOR_DARK   = '#0a0a0f';
const COLOR_CREAM  = '#f5e6c8';
const COLOR_RED    = '#c44a2a';
const COLOR_GREEN  = '#2c8a5f';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  // ── create ────────────────────────────────────────────────────────────────
  create() {
    this._buildHUD();
    this._buildTitleCard();

    // Listen to GameScene events
    const game = this.scene.get('GameScene');
    game.events.on('hud-update',    this._onHudUpdate,    this);
    game.events.on('show-message',  this._onShowMessage,  this);
    game.events.on('game-over',     this._onGameOver,     this);
    game.events.on('game-win',      this._onGameWin,      this);
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  _buildHUD() {
    // Semi-transparent top bar
    this.hudBar = this.add.rectangle(0, 0, W, 48, 0x000000, 0.65).setOrigin(0, 0);

    // Score label
    this.scoreLabel = this.add.text(20, 12, 'SCORE  0', {
      fontFamily: 'Cinzel, serif',
      fontSize:   '16px',
      color:      COLOR_GOLD,
      stroke:     '#000',
      strokeThickness: 3,
    });

    // Message counter (scroll icon + count)
    this.msgLabel = this.add.text(W - 20, 12, '📜 0 / 5', {
      fontFamily: 'Inter, sans-serif',
      fontSize:   '15px',
      color:      COLOR_CREAM,
      stroke:     '#000',
      strokeThickness: 3,
    }).setOrigin(1, 0);

    // Hint text at bottom
    this.hint = this.add.text(W / 2, H - 12, '← → Move   ↑ / Space  Jump', {
      fontFamily: 'Inter, sans-serif',
      fontSize:   '12px',
      color:      'rgba(210,160,60,0.6)',
    }).setOrigin(0.5, 1);
  }

  _onHudUpdate({ score, collected, total }) {
    this.scoreLabel.setText(`SCORE  ${score}`);
    this.msgLabel.setText(`📜 ${collected} / ${total}`);
  }

  // ── Title card (shown briefly at start) ──────────────────────────────────

  _buildTitleCard() {
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.85);

    const title = this.add.text(W / 2, H / 2 - 80, 'رسول الثامن من مايو', {
      fontFamily: 'Cinzel, serif',
      fontSize:   '28px',
      color:      COLOR_GOLD,
      stroke:     '#000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    const sub = this.add.text(W / 2, H / 2 - 38, 'The Messenger of May 8, 1945', {
      fontFamily: 'Cinzel, serif',
      fontSize:   '18px',
      color:      COLOR_CREAM,
    }).setOrigin(0.5);

    const body = this.add.text(W / 2, H / 2 + 20,
      'You are a resistance messenger during the massacres of Sétif.\n' +
      'Auto-run through the streets — collect 5 hidden historical scrolls\n' +
      'and avoid French soldiers and barricades.\n\n' +
      '← → Move     ↑ / Space  Jump', {
      fontFamily: 'Inter, sans-serif',
      fontSize:   '14px',
      color:      COLOR_CREAM,
      align:      'center',
      lineSpacing: 6,
    }).setOrigin(0.5);

    const startBtn = this._makeButton(W / 2, H / 2 + 140, 'PRESS ANY KEY TO BEGIN', COLOR_GOLD, 16);

    // Dismiss on key press or click
    const dismiss = () => {
      this.tweens.add({
        targets: [overlay, title, sub, body, startBtn],
        alpha:   0,
        duration: 400,
        onComplete: () => { overlay.destroy(); title.destroy(); sub.destroy(); body.destroy(); startBtn.destroy(); },
      });
      this.input.keyboard.off('keydown', dismiss);
      this.input.off('pointerdown', dismiss);
    };

    this.time.delayedCall(800, () => {
      this.input.keyboard.on('keydown', dismiss);
      this.input.on('pointerdown', dismiss);
    });

    // Blink the start text
    this.tweens.add({
      targets: startBtn,
      alpha: { from: 1, to: 0.2 },
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
  }

  // ── Message popup ──────────────────────────────────────────────────────────

  _onShowMessage({ data, collected, total, onClose }) {
    const panel = this._buildPanel();
    const elements = [panel];

    // Progress line
    const progress = this.add.text(W / 2, panel.y - 120,
      `Scroll ${collected} of ${total}`, {
      fontFamily: 'Inter, sans-serif',
      fontSize:   '12px',
      color:      'rgba(210,160,60,0.8)',
    }).setOrigin(0.5).setDepth(21);
    elements.push(progress);

    // Title
    const titleTx = this.add.text(W / 2, panel.y - 98, data.title, {
      fontFamily: 'Cinzel, serif',
      fontSize:   '18px',
      color:      data.color || COLOR_GOLD,
      stroke:     '#000',
      strokeThickness: 3,
      wordWrap:   { width: 560 },
      align:      'center',
    }).setOrigin(0.5).setDepth(21);
    elements.push(titleTx);

    // Divider
    const divider = this.add.rectangle(W / 2, panel.y - 66, 480, 1, 0xd2a03c, 0.5).setDepth(21);
    elements.push(divider);

    // Body text
    const bodyTx = this.add.text(W / 2, panel.y - 20, data.text, {
      fontFamily: 'Inter, sans-serif',
      fontSize:   '13px',
      color:      COLOR_CREAM,
      wordWrap:   { width: 560 },
      align:      'center',
      lineSpacing: 6,
    }).setOrigin(0.5).setDepth(21);
    elements.push(bodyTx);

    // Close button
    const closeBtn = this._makeButton(W / 2, panel.y + 120, '[ CONTINUE THE RUN ]', COLOR_GOLD, 15);
    closeBtn.setDepth(21);
    elements.push(closeBtn);

    // Animate in
    elements.forEach(el => el.setAlpha(0));
    this.tweens.add({ targets: elements, alpha: 1, duration: 350 });

    // Pulse close button
    this.tweens.add({
      targets: closeBtn,
      alpha: { from: 1, to: 0.4 },
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    // Close on key press or pointer
    const close = () => {
      this.tweens.add({
        targets: elements,
        alpha:   0,
        duration: 250,
        onComplete: () => {
          elements.forEach(el => el.destroy());
          onClose();
        },
      });
      this.input.keyboard.off('keydown', close);
      this.input.off('pointerdown', close);
    };

    this.time.delayedCall(500, () => {
      this.input.keyboard.on('keydown', close);
      this.input.on('pointerdown', close);
    });
  }

  // ── Game over screen ───────────────────────────────────────────────────────

  _onGameOver({ score }) {
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.88).setDepth(30);

    const title = this.add.text(W / 2, H / 2 - 100, 'CAPTURED', {
      fontFamily: 'Cinzel, serif',
      fontSize:   '48px',
      color:      COLOR_RED,
      stroke:     '#000',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(31);

    const sub = this.add.text(W / 2, H / 2 - 38,
      'The messenger did not make it through.\nBut the memory lives on.', {
      fontFamily: 'Inter, sans-serif',
      fontSize:   '15px',
      color:      COLOR_CREAM,
      align:      'center',
      lineSpacing: 8,
    }).setOrigin(0.5).setDepth(31);

    const scoreTx = this.add.text(W / 2, H / 2 + 30, `Score: ${score}`, {
      fontFamily: 'Cinzel, serif',
      fontSize:   '22px',
      color:      COLOR_GOLD,
    }).setOrigin(0.5).setDepth(31);

    const restart = this._makeButton(W / 2, H / 2 + 100, '[ TRY AGAIN ]', COLOR_GOLD, 16);
    restart.setDepth(31).setInteractive({ useHandCursor: true });

    restart.on('pointerdown', () => {
      overlay.destroy(); title.destroy(); sub.destroy(); scoreTx.destroy(); restart.destroy();
      this.scene.get('GameScene').scene.restart();
    });

    // Blink restart
    this.tweens.add({
      targets: restart,
      alpha: { from: 1, to: 0.3 },
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
  }

  // ── Win screen ─────────────────────────────────────────────────────────────

  _onGameWin({ score }) {
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.9).setDepth(30);

    const glow = this.add.rectangle(W / 2, H / 2, W - 80, H - 80, 0xd2a03c, 0.06).setDepth(30);

    const title = this.add.text(W / 2, H / 2 - 130, 'MESSAGES DELIVERED', {
      fontFamily: 'Cinzel, serif',
      fontSize:   '32px',
      color:      COLOR_GOLD,
      stroke:     '#000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(31);

    const alg = this.add.text(W / 2, H / 2 - 80, 'الجزائر ستبقى حرة', {
      fontFamily: 'Cinzel, serif',
      fontSize:   '22px',
      color:      COLOR_CREAM,
    }).setOrigin(0.5).setDepth(31);

    const sub = this.add.text(W / 2, H / 2 - 30,
      'You carried the truth through fire and steel.\n' +
      'The world now knows what happened on May 8, 1945.\n\n' +
      '"A people without memory is a people without future."\n— Frantz Fanon', {
      fontFamily: 'Inter, sans-serif',
      fontSize:   '14px',
      color:      COLOR_CREAM,
      align:      'center',
      lineSpacing: 8,
      wordWrap:   { width: 600 },
    }).setOrigin(0.5).setDepth(31);

    const scoreTx = this.add.text(W / 2, H / 2 + 110, `Final Score: ${score}`, {
      fontFamily: 'Cinzel, serif',
      fontSize:   '20px',
      color:      COLOR_GOLD,
    }).setOrigin(0.5).setDepth(31);

    const restart = this._makeButton(W / 2, H / 2 + 158, '[ PLAY AGAIN ]', COLOR_GREEN, 16);
    restart.setDepth(31).setInteractive({ useHandCursor: true });

    restart.on('pointerdown', () => {
      [overlay, glow, title, alg, sub, scoreTx, restart].forEach(el => el.destroy());
      this.scene.get('GameScene').scene.restart();
    });

    // Particle rain for the win
    this._winParticles();

    // Blink restart
    this.tweens.add({
      targets: restart,
      alpha: { from: 1, to: 0.3 },
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Build the dark glassmorphism panel for popups */
  _buildPanel() {
    const panel = this.add.rectangle(W / 2, H / 2, 640, 320, 0x0a0a0f, 0.92)
      .setStrokeStyle(1, 0xd2a03c, 0.8)
      .setDepth(20);
    return panel;
  }

  /** Create a styled text button */
  _makeButton(x, y, label, color = COLOR_GOLD, size = 14) {
    return this.add.text(x, y, label, {
      fontFamily: 'Cinzel, serif',
      fontSize:   `${size}px`,
      color:      color,
      stroke:     '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(21);
  }

  /** Falling golden stars for win screen */
  _winParticles() {
    const timer = this.time.addEvent({
      delay: 80,
      repeat: 80,
      callback: () => {
        const x = Phaser.Math.Between(0, W);
        const p = this.add.image(x, -10, 'particle').setDepth(29).setScale(1.5).setTint(0xd2a03c);
        this.tweens.add({
          targets: p,
          y: H + 10,
          x: x + Phaser.Math.Between(-40, 40),
          alpha: { from: 1, to: 0 },
          duration: Phaser.Math.Between(1200, 2400),
          ease: 'Linear',
          onComplete: () => p.destroy(),
        });
      },
    });
  }
}
