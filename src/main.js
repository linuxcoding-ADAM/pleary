import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { BootScene } from './scenes/BootScene.js';

// ─── Game Configuration (Top-Down, No Gravity) ────────────────────────────────
const config = {
  type: Phaser.AUTO,
  width: 1200,
  height: 600,
  parent: 'game-container',
  dom: {
    createContainer: true
  },
  backgroundColor: '#c8a96e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 }, // top-down: no gravity
      debug: false,
    },
  },
  scene: [BootScene, GameScene],
};

let game = null;

// Handle Welcome Screen UI
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    let playerName = document.getElementById('player-name').value.trim();
    if (!playerName) playerName = 'Messenger';
    
    const difficulty = e.target.dataset.diff;
    
    document.getElementById('welcome-screen').style.display = 'none';
    
    // Start game and pass data globally or via scene start
    game = new Phaser.Game(config);
    
    // Wait for BootScene to be ready, then pass data to it (or BootScene can read window.gameData)
    window.gameData = { playerName, difficulty };
  });
});

export default game;
