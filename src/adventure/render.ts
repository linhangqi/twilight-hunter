import { findPortal, findPrincess } from "./engine";
import { BIOME_PALETTES, TILE_SIZE, VIEW_HEIGHT, VIEW_WIDTH } from "./stages";
import { BiomeTheme, EnemyState, GameState, StageDefinition } from "./types";
import { assetUrl } from "../utils/assets";

const loadImage = (src: string) => {
  const img = new Image();
  img.src = src;
  return img;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const heroSheet  = loadImage(assetUrl("assets/processed/hero-sheet.png"));
const legend24HeroSprite = loadImage(assetUrl("assets/generated/characters/legend24-hero.png"));
const enemySheet = loadImage(assetUrl("assets/processed/enemy-sheet.png"));
const envSheet   = loadImage(assetUrl("assets/processed/environment-sheet.png"));
const princessSprite = loadImage(assetUrl("assets/generated/story/princess.png"));
const enemyGeneratedSprites = {
  mummy: loadImage(assetUrl("assets/generated/enemy-mummy.png")),
  pharaoh: loadImage(assetUrl("assets/generated/enemy-pharaoh.png")),
  gargoyle: loadImage(assetUrl("assets/generated/enemy-gargoyle.png")),
  lava_sprite: loadImage(assetUrl("assets/generated/enemy-lava-sprite.png")),
  skeleton: loadImage(assetUrl("assets/generated/enemy-skeleton.png")),
  dragon: loadImage(assetUrl("assets/generated/enemy-dragon.png")),
} as const;
const biomeBackgrounds: Record<BiomeTheme, HTMLImageElement> = {
  forest: loadImage(assetUrl("assets/generated/backgrounds/forest-bg.png")),
  moonrift: loadImage(assetUrl("assets/generated/backgrounds/moonrift-bg.png")),
  desert: loadImage(assetUrl("assets/generated/backgrounds/desert-bg.png")),
  jungle: loadImage(assetUrl("assets/generated/backgrounds/jungle-bg.png")),
  volcanic: loadImage(assetUrl("assets/generated/backgrounds/volcanic-bg.png")),
  ruins: loadImage(assetUrl("assets/generated/backgrounds/ruins-bg.png")),
  dragon_lair: loadImage(assetUrl("assets/generated/backgrounds/dragon-lair-bg.png")),
};
const biomeTiles: Record<BiomeTheme, HTMLImageElement> = {
  forest: loadImage(assetUrl("assets/generated/tiles/forest-tile.png")),
  moonrift: loadImage(assetUrl("assets/generated/tiles/moonrift-tile.png")),
  desert: loadImage(assetUrl("assets/generated/tiles/desert-tile.png")),
  jungle: loadImage(assetUrl("assets/generated/tiles/jungle-tile.png")),
  volcanic: loadImage(assetUrl("assets/generated/tiles/volcanic-tile.png")),
  ruins: loadImage(assetUrl("assets/generated/tiles/ruins-tile.png")),
  dragon_lair: loadImage(assetUrl("assets/generated/tiles/dragon-lair-tile.png")),
};

const HERO_FRAMES = [
  { x: 136,  y: 171, width: 273, height: 409 },
  { x: 537,  y: 178, width: 354, height: 404 },
  { x: 992,  y: 178, width: 333, height: 403 },
  { x: 1431, y: 207, width: 508, height: 373 },
] as const;

const ENEMY_FRAMES = {
  slime: { x: 99,   y: 343, width: 424, height: 255 },
  bat:   { x: 737,  y: 177, width: 703, height: 404 },
  golem: { x: 1496, y: 149, width: 571, height: 454 },
} as const;

const ENEMY_DRAW_SIZES = {
  mummy: { width: 50, height: 72 },
  pharaoh: { width: 64, height: 78 },
  gargoyle: { width: 72, height: 64 },
  lava_sprite: { width: 46, height: 50 },
  skeleton: { width: 54, height: 74 },
  dragon: { width: 176, height: 126 },
} as const;

const ENV_FRAMES = {
  dirt:       { x: 96,   y: 164, width: 247, height: 237 },
  stone:      { x: 411,  y: 172, width: 227, height: 229 },
  portal:     { x: 1067, y: 88,  width: 380, height: 318 },
  background: { x: 69,   y: 499, width: 1398, height: 435 },
} as const;

// ─── Pixel helpers ────────────────────────────────────────────────────────────

const px = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  fill: string, stroke?: string,
) => {
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(x) + 1, Math.round(y) + 1, Math.round(w) - 2, Math.round(h) - 2);
  }
};

const stampDiamond = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fill: string,
) => {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size, cy);
  ctx.closePath();
  ctx.fill();
};

const drawImageCover = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  sourceOffsetX = 0,
) => {
  const imageRatio = image.width / image.height;
  const destRatio = dw / dh;

  let sw = image.width;
  let sh = image.height;

  if (imageRatio > destRatio) {
    sw = image.height * destRatio;
  } else {
    sh = image.width / destRatio;
  }

  const maxOffsetX = Math.max(0, image.width - sw);
  const sx = clamp(sourceOffsetX, 0, maxOffsetX);
  const sy = Math.max(0, (image.height - sh) / 2);
  ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
};

const drawForestBackdrop = (ctx: CanvasRenderingContext2D, cameraX: number) => {
  ctx.save();
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 7; i++) {
    const x = ((i * 170 - cameraX * 0.22) % 1180) - 120;
    px(ctx, x + 18, 236, 18, 220, "#1b3527");
    px(ctx, x, 210, 54, 36, "#274c38");
    px(ctx, x - 10, 182, 74, 34, "#2d5a42");
    px(ctx, x + 4, 156, 48, 30, "#397253");
  }
  ctx.globalAlpha = 0.8;
  for (let i = 0; i < 12; i++) {
    const fx = ((i * 89 - cameraX * 0.12) % 1100) - 40;
    const fy = 90 + (i % 4) * 48;
    stampDiamond(ctx, fx, fy, 2 + (i % 2), "#9de8a4");
  }
  ctx.restore();
};

const drawMoonriftBackdrop = (ctx: CanvasRenderingContext2D, cameraX: number) => {
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "rgba(220,230,255,0.16)";
  ctx.beginPath();
  ctx.arc(760, 106, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.28;
  for (let i = 0; i < 6; i++) {
    const x = ((i * 180 - cameraX * 0.16) % 1180) - 80;
    px(ctx, x + 20, 250, 14, 160, "#252d56");
    px(ctx, x + 8, 228, 38, 28, "#39457a");
    px(ctx, x + 14, 194, 8, 38, "#616dc0");
  }
  ctx.restore();
};

const drawDesertBackdrop = (ctx: CanvasRenderingContext2D, cameraX: number) => {
  ctx.save();
  const duneLayers = [
    { y: 360, h: 120, color: "#b36b34", speed: 0.12 },
    { y: 396, h: 100, color: "#cf8b42", speed: 0.18 },
    { y: 430, h: 84, color: "#e6b35a", speed: 0.24 },
  ];
  duneLayers.forEach((layer, index) => {
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.moveTo(-40, VIEW_HEIGHT);
    for (let i = -1; i <= 6; i++) {
      const x = i * 190 - (cameraX * layer.speed % 190);
      const crest = layer.y + (i % 2 === 0 ? -22 - index * 4 : 10 + index * 3);
      ctx.quadraticCurveTo(x + 90, crest, x + 190, layer.y + index * 6);
    }
    ctx.lineTo(VIEW_WIDTH + 40, VIEW_HEIGHT);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
};

const drawJungleBackdrop = (ctx: CanvasRenderingContext2D, cameraX: number) => {
  ctx.save();
  ctx.globalAlpha = 0.26;
  for (let i = 0; i < 8; i++) {
    const x = ((i * 150 - cameraX * 0.2) % 1160) - 80;
    px(ctx, x + 18, 210, 20, 250, "#0d2410");
    px(ctx, x - 16, 170, 90, 42, "#1f4d26");
    px(ctx, x - 2, 140, 64, 38, "#296332");
  }
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 14; i++) {
    const vineX = ((i * 72 - cameraX * 0.1) % 1040) - 20;
    px(ctx, vineX, 0, 4, 120 + (i % 5) * 34, "#356f3d");
  }
  ctx.restore();
};

const drawVolcanicBackdrop = (ctx: CanvasRenderingContext2D, cameraX: number) => {
  ctx.save();
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 6; i++) {
    const baseX = ((i * 190 - cameraX * 0.14) % 1180) - 120;
    ctx.fillStyle = "#28100a";
    ctx.beginPath();
    ctx.moveTo(baseX, VIEW_HEIGHT);
    ctx.lineTo(baseX + 40, 330);
    ctx.lineTo(baseX + 80, 280 + (i % 2) * 34);
    ctx.lineTo(baseX + 140, VIEW_HEIGHT);
    ctx.closePath();
    ctx.fill();
    px(ctx, baseX + 62, 314, 6, 74, "#ff7b2f");
  }
  for (let i = 0; i < 18; i++) {
    const emberX = ((i * 55 - cameraX * 0.08) % 1050) - 30;
    const emberY = 120 + (i % 6) * 44;
    stampDiamond(ctx, emberX, emberY, 2 + (i % 3), i % 2 === 0 ? "#ffb347" : "#ff6d2e");
  }
  ctx.restore();
};

const drawRuinsBackdrop = (ctx: CanvasRenderingContext2D, cameraX: number) => {
  ctx.save();
  ctx.globalAlpha = 0.28;
  for (let i = 0; i < 6; i++) {
    const x = ((i * 170 - cameraX * 0.16) % 1160) - 100;
    px(ctx, x + 12, 248, 20, 164, "#29293a");
    px(ctx, x, 220, 44, 24, "#3a3a4f");
    px(ctx, x + 8, 206, 28, 16, "#4d4d66");
    px(ctx, x + 48, 300, 18, 110, "#232333");
    px(ctx, x + 42, 294, 30, 10, "#404058");
  }
  for (let i = 0; i < 5; i++) {
    const moonX = 130 + i * 180 - (cameraX * 0.04 % 180);
    px(ctx, moonX, 128 + (i % 2) * 12, 8, 8, "#7d78a8");
  }
  ctx.restore();
};

const drawDragonLairBackdrop = (ctx: CanvasRenderingContext2D, cameraX: number) => {
  ctx.save();
  ctx.globalAlpha = 0.24;
  for (let i = 0; i < 8; i++) {
    const x = ((i * 145 - cameraX * 0.2) % 1120) - 90;
    ctx.fillStyle = "#12001f";
    ctx.beginPath();
    ctx.moveTo(x, VIEW_HEIGHT);
    ctx.lineTo(x + 26, 360 - (i % 3) * 28);
    ctx.lineTo(x + 56, VIEW_HEIGHT);
    ctx.closePath();
    ctx.fill();
    px(ctx, x + 24, 388, 4, 76, "#7820b8");
  }
  ctx.restore();
};

const drawTileTexture = (
  ctx: CanvasRenderingContext2D,
  theme: BiomeTheme,
  sx: number,
  sy: number,
  isTop: boolean,
  rowIndex: number,
  colIndex: number,
) => {
  switch (theme) {
    case "forest":
      if (isTop) {
        px(ctx, sx, sy, TILE_SIZE, 4, "#6ca14b");
        px(ctx, sx + ((colIndex % 3) * 9), sy + 3, 6, 3, "#4e7e35");
      }
      px(ctx, sx + 4, sy + 11, 4, 12, "#35562a");
      px(ctx, sx + 18, sy + 15, 3, 9, "#3f6830");
      break;
    case "moonrift":
      if (isTop) {
        px(ctx, sx, sy, TILE_SIZE, 4, "#616fa8");
      }
      px(ctx, sx + 6, sy + 8, 8, 8, "#4d588a");
      px(ctx, sx + 17, sy + 18, 6, 6, "#2c3256");
      break;
    case "desert":
      if (isTop) {
        px(ctx, sx, sy, TILE_SIZE, 4, "#e0bb61");
      }
      px(ctx, sx + 3, sy + 8, 10, 3, "#a16c2f");
      px(ctx, sx + 16, sy + 17, 12, 3, "#bc8746");
      break;
    case "jungle":
      if (isTop) {
        px(ctx, sx, sy, TILE_SIZE, 5, "#4f9632");
      }
      px(ctx, sx + 5, sy + 8, 4, 16, "#214819");
      px(ctx, sx + 20, sy + 14, 3, 12, "#296221");
      break;
    case "volcanic":
      if (isTop) {
        px(ctx, sx, sy, TILE_SIZE, 4, "#7b4731");
      }
      px(ctx, sx + 5, sy + 10, 20, 3, "#24110a");
      px(ctx, sx + 12, sy + 13, 2, 8, "#ff7b30");
      px(ctx, sx + 18, sy + 20, 2, 6, "#ffb24a");
      break;
    case "ruins":
      if (isTop) {
        px(ctx, sx, sy, TILE_SIZE, 4, "#7b7b92");
      }
      px(ctx, sx + 6, sy + 8, 20, 2, "#4b4b66");
      px(ctx, sx + 10, sy + 16, 12, 2, "#5d5d7c");
      break;
    case "dragon_lair":
      if (isTop) {
        px(ctx, sx, sy, TILE_SIZE, 4, "#51247a");
      }
      px(ctx, sx + 5, sy + 8, 20, 3, "#1b062d");
      px(ctx, sx + 15, sy + 10, 2, 10, "#c040ff");
      px(ctx, sx + 9, sy + 20, 2, 6, "#7b24c9");
      break;
  }
  if ((rowIndex + colIndex) % 5 === 0) {
    px(ctx, sx + 2, sy + 26, 6, 2, "rgba(255,255,255,0.08)");
  }
};

// ─── Biome sky ────────────────────────────────────────────────────────────────

const drawSky = (ctx: CanvasRenderingContext2D, theme: BiomeTheme, cameraX: number) => {
  const pal = BIOME_PALETTES[theme];
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  grad.addColorStop(0,   pal.skyTop);
  grad.addColorStop(0.5, pal.skyMid);
  grad.addColorStop(1,   pal.skyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  switch (theme) {
    case "forest":
      drawForestBackdrop(ctx, cameraX);
      break;
    case "moonrift":
      drawMoonriftBackdrop(ctx, cameraX);
      break;
    case "desert":
      drawDesertBackdrop(ctx, cameraX);
      break;
    case "jungle":
      drawJungleBackdrop(ctx, cameraX);
      break;
    case "volcanic":
      drawVolcanicBackdrop(ctx, cameraX);
      break;
    case "ruins":
      drawRuinsBackdrop(ctx, cameraX);
      break;
    case "dragon_lair":
      drawDragonLairBackdrop(ctx, cameraX);
      break;
  }
};

// ─── Parallax background ──────────────────────────────────────────────────────

const drawParallax = (
  ctx: CanvasRenderingContext2D,
  theme: BiomeTheme,
  cameraX: number,
) => {
  const background = biomeBackgrounds[theme];
  if (background.complete) {
    const sourceWindow = Math.min(background.width, Math.round(background.height * (VIEW_WIDTH / VIEW_HEIGHT)));
    const maxPan = Math.max(0, background.width - sourceWindow);
    const panRatio = ((cameraX * 0.18) % VIEW_WIDTH) / VIEW_WIDTH;
    drawImageCover(ctx, background, 0, 0, VIEW_WIDTH, VIEW_HEIGHT, maxPan * panRatio);

    ctx.fillStyle = theme === "desert"
      ? "rgba(255, 190, 120, 0.06)"
      : theme === "dragon_lair"
        ? "rgba(80, 0, 120, 0.10)"
        : "rgba(12, 16, 26, 0.08)";
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    return;
  }

  drawSky(ctx, theme, cameraX);

  if (envSheet.complete) {
    const bg = ENV_FRAMES.background;
    const shift = (cameraX * 0.18) % 120;
    ctx.globalAlpha = theme === "desert" ? 0.42 : theme === "dragon_lair" ? 0.28 : 0.55;
    ctx.drawImage(envSheet, bg.x, bg.y, bg.width, bg.height, -shift, 0, VIEW_WIDTH + 160, VIEW_HEIGHT);
    ctx.globalAlpha = 1;
  }
};

// ─── Tiles ────────────────────────────────────────────────────────────────────

const isBottomConnected = (stage: StageDefinition, row: number, col: number) => {
  for (let r = row; r < stage.map.length; r++) {
    if (stage.map[r][col] !== "#") return false;
  }
  return true;
};

const drawTiles = (
  ctx: CanvasRenderingContext2D,
  stage: StageDefinition,
  cameraX: number,
) => {
  const pal = BIOME_PALETTES[stage.theme];
  stage.map.forEach((row, rowIndex) => {
    [...row].forEach((tile, colIndex) => {
      const sx = colIndex * TILE_SIZE - cameraX;
      const sy = rowIndex * TILE_SIZE;
      if (sx < -TILE_SIZE || sx > VIEW_WIDTH + TILE_SIZE) return;

      if (tile === "#") {
        const isTop = rowIndex === 0 || stage.map[rowIndex - 1][colIndex] !== "#";
        const grounded = isBottomConnected(stage, rowIndex, colIndex);
        const tileImage = biomeTiles[stage.theme];

        if (tileImage.complete) {
          ctx.drawImage(tileImage, sx, sy, TILE_SIZE, TILE_SIZE);

          if (isTop) {
            ctx.fillStyle = "rgba(255,255,255,0.08)";
            ctx.fillRect(sx, sy, TILE_SIZE, 2);
          }

          if (!grounded) {
            ctx.fillStyle = "rgba(0,0,0,0.18)";
            ctx.fillRect(sx, sy + TILE_SIZE - 4, TILE_SIZE, 4);
          }
          return;
        }

        if (envSheet.complete) {
          const src = grounded ? ENV_FRAMES.dirt : ENV_FRAMES.stone;
          const srcY = grounded && !isTop ? src.y + 48 : src.y;
          ctx.drawImage(envSheet, src.x, srcY, src.width, src.height - (grounded && !isTop ? 48 : 0), sx, sy, TILE_SIZE, TILE_SIZE);
          drawTileTexture(ctx, stage.theme, sx, sy, isTop, rowIndex, colIndex);
        } else {
          // Pixel art fallback using biome colours
          const topColor  = isTop ? pal.groundTop : pal.groundFill;
          const innerColor = pal.groundFill;
          px(ctx, sx, sy, TILE_SIZE, TILE_SIZE, innerColor);
          if (isTop) px(ctx, sx, sy, TILE_SIZE, 6, topColor);
          drawTileTexture(ctx, stage.theme, sx, sy, isTop, rowIndex, colIndex);
        }
      }
    });
  });
};

// ─── Portal ───────────────────────────────────────────────────────────────────

const drawPortal = (ctx: CanvasRenderingContext2D, stage: StageDefinition, cameraX: number) => {
  const portal = findPortal(stage);
  const x = portal.x - cameraX;
  const y = portal.y;
  const pal = BIOME_PALETTES[stage.theme];

  if (envSheet.complete) {
    const src = ENV_FRAMES.portal;
    ctx.shadowBlur = 28;
    ctx.shadowColor = pal.accentColor;
    ctx.drawImage(envSheet, src.x, src.y, src.width, src.height, x - 14, y - 24, 72, 84);
    ctx.shadowBlur = 0;
  } else {
    const grad = ctx.createLinearGradient(x, y, x + portal.width, y + portal.height);
    grad.addColorStop(0, pal.accentColor);
    grad.addColorStop(1, pal.skyMid);
    ctx.fillStyle = grad;
    ctx.shadowBlur = 24;
    ctx.shadowColor = pal.accentColor;
    ctx.fillRect(x, y, portal.width, portal.height);
    ctx.shadowBlur = 0;
  }
};

const drawPrincess = (ctx: CanvasRenderingContext2D, stage: StageDefinition, state: GameState) => {
  const princess = findPrincess(stage);
  if (!princess) return;

  const allCleared = state.enemies.every((enemy) => !enemy.alive);
  if (!allCleared) return;

  const x = princess.x - state.cameraX;
  const y = princess.y;

  if (princessSprite.complete) {
    const floatY = Math.sin(state.time * 2.8) * 2;
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = "rgba(255, 214, 168, 0.55)";
    ctx.drawImage(princessSprite, x - 12, y - 10 + floatY, 72, 108);
    ctx.shadowBlur = 0;
    ctx.restore();
  } else {
    px(ctx, x + 12, y + 6, 22, 44, "#f3d6e7", "#d493ab");
    px(ctx, x + 16, y, 14, 14, "#ffe0bf", "#c99170");
  }
};

// ─── Player ───────────────────────────────────────────────────────────────────

const drawPlayer = (ctx: CanvasRenderingContext2D, state: GameState) => {
  const { player, cameraX } = state;
  const x = player.x - cameraX;
  const y = player.y;
  const flash = player.hurtTimer > 0 && Math.floor(player.hurtTimer * 12) % 2 === 0;
  const running = Math.abs(player.vx) > 20 && player.onGround;
  const airborne = !player.onGround;

  if (player.character === "legend24" && legend24HeroSprite.complete) {
    const bobY = running ? Math.sin(state.time * 11) * 1.8 : 0;
    const attackLean = player.attackTimer > 0 ? 0.12 : 0;
    const runLean = running ? Math.sin(state.time * 11) * 0.05 : 0;
    const jumpLean = airborne ? player.vy * 0.00055 : 0;
    const scaleY = airborne ? 1.03 : 1;
    const scaleX = airborne ? 0.97 : 1;
    ctx.save();
    if (flash) ctx.globalAlpha = 0.74;
    ctx.translate(x + player.width / 2, y + player.height / 2);
    if (player.facing < 0) ctx.scale(-1, 1);
    ctx.rotate((player.facing > 0 ? 1 : -1) * (attackLean + runLean + jumpLean));
    ctx.scale(scaleX, scaleY);
    ctx.drawImage(legend24HeroSprite, -26, -38 + bobY, 52, 76);
    if (player.attackTimer > 0) {
      ctx.shadowBlur = 14;
      ctx.shadowColor = "#ff9a2f";
      px(ctx, player.facing > 0 ? 10 : -18, -10, 12, 12, "#ff8a1c", "#ffd27d");
      px(ctx, player.facing > 0 ? 13 : -15, -7, 6, 6, "#ffb445");
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    return;
  }

  if (heroSheet.complete) {
    let frame: (typeof HERO_FRAMES)[number] = HERO_FRAMES[0];
    if (player.attackTimer > 0) {
      frame = HERO_FRAMES[3];
    } else if (airborne) {
      frame = HERO_FRAMES[2];
    } else if (running) {
      frame = Math.floor(state.time * 10) % 2 === 0 ? HERO_FRAMES[1] : HERO_FRAMES[2];
    }
    ctx.save();
    if (flash) ctx.globalAlpha = 0.72;
    ctx.translate(x + player.width / 2, y + player.height / 2);
    if (player.facing < 0) ctx.scale(-1, 1);
    ctx.rotate(airborne ? player.vy * 0.00045 : running ? Math.sin(state.time * 10) * 0.03 : 0);
    ctx.drawImage(heroSheet, frame.x, frame.y, frame.width, frame.height, -31, -26 + (running ? Math.sin(state.time * 10) * 1.2 : 0), 64, 64);
    ctx.restore();
  } else {
    px(ctx, x + 8,  y,      10, 10, flash ? "#fff4ef" : "#ffd9bc");
    px(ctx, x + 6,  y + 10, 14, 16, flash ? "#fff1c9" : "#e6b54a");
    px(ctx, x + 7,  y + 26, 5,  12, "#52455c");
    px(ctx, x + 14, y + 26, 5,  12, "#52455c");
    if (player.attackTimer > 0) {
      const sx = x + (player.facing > 0 ? 18 : -16);
      px(ctx, sx, y + 10, 14, 4, "#fdf3c0", "#cfb06d");
    }
  }
};

// ─── Enemy pixel-art renderers ────────────────────────────────────────────────

const drawEnemyPixel = (ctx: CanvasRenderingContext2D, enemy: EnemyState, sx: number, sy: number) => {
  const { kind, width: w, height: h } = enemy;

  switch (kind) {
    case "slime":
      px(ctx, sx + 2, sy + h * 0.3, w - 4, h * 0.7, "#76e58d", "#399656");
      px(ctx, sx + 6, sy + h * 0.1, w - 12, h * 0.3, "#9ef5ae");
      // eyes
      px(ctx, sx + 6,  sy + h * 0.35, 4, 4, "#fff");
      px(ctx, sx + w - 10, sy + h * 0.35, 4, 4, "#fff");
      break;

    case "bat":
      // Wings
      px(ctx, sx,        sy + 4, w * 0.35, h * 0.55, "#8855cc");
      px(ctx, sx + w * 0.65, sy + 4, w * 0.35, h * 0.55, "#8855cc");
      // Body
      px(ctx, sx + w * 0.28, sy + 2, w * 0.44, h * 0.7, "#b388ff", "#6640b0");
      // Eyes
      px(ctx, sx + w * 0.35, sy + 6, 4, 4, "#ff4444");
      px(ctx, sx + w * 0.58, sy + 6, 4, 4, "#ff4444");
      break;

    case "golem":
      px(ctx, sx + 2, sy + 4, w - 4, h - 4, "#d2a16b", "#855a36");
      px(ctx, sx + 6, sy + 8, w - 12, h - 16, "#c09050");
      // Face
      px(ctx, sx + 7, sy + 10, 5, 5, "#ff6622");
      px(ctx, sx + w - 12, sy + 10, 5, 5, "#ff6622");
      break;

    case "mummy": {
      // Sandy wrapped body
      px(ctx, sx + 2, sy + 2, w - 4, h - 4, "#d8c080", "#9a8840");
      // Bandage stripes
      for (let i = 0; i < 4; i++) {
        px(ctx, sx + 2, sy + 4 + i * 7, w - 4, 3, "rgba(255,245,200,0.45)");
      }
      // Eyes (red)
      px(ctx, sx + 7,     sy + 5, 4, 4, "#cc2200");
      px(ctx, sx + w - 11, sy + 5, 4, 4, "#cc2200");
      break;
    }

    case "pharaoh": {
      // Body
      px(ctx, sx + 3, sy + 14, w - 6, h - 14, "#c8a030", "#806010");
      // Blue headdress
      px(ctx, sx + 2, sy,      w - 4, 14, "#1040a0", "#0020a0");
      px(ctx, sx + 4, sy + 14, w - 8, 5,  "#c0a020");
      // Gold stripes on headdress
      for (let i = 0; i < 3; i++) {
        px(ctx, sx + 4, sy + 2 + i * 4, w - 8, 2, "#f0d060");
      }
      // Eyes
      px(ctx, sx + 7,     sy + 6, 4, 5, "#000");
      px(ctx, sx + w - 11, sy + 6, 4, 5, "#000");
      // Staff glow when chargeTimer is short
      if (enemy.chargeTimer < 1) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#f0d040";
      }
      px(ctx, sx + (enemy.dir > 0 ? w : -4), sy + 8, 4, h - 12, "#d4a010", "#f0c020");
      ctx.shadowBlur = 0;
      break;
    }

    case "gargoyle": {
      // Stone wings spread
      px(ctx, sx,          sy + 6,  w * 0.3, h * 0.65, "#888899");
      px(ctx, sx + w * 0.7, sy + 6, w * 0.3, h * 0.65, "#888899");
      // Body
      px(ctx, sx + w * 0.22, sy + 2, w * 0.56, h * 0.85, "#7a7a8c", "#4a4a5c");
      // Glowing eyes
      ctx.shadowBlur = 6;
      ctx.shadowColor = "#aa44ff";
      px(ctx, sx + w * 0.32, sy + 8, 5, 5, "#cc66ff");
      px(ctx, sx + w * 0.58, sy + 8, 5, 5, "#cc66ff");
      ctx.shadowBlur = 0;
      // Claws
      px(ctx, sx + w * 0.22, sy + h * 0.8, 6, 6, "#5a5a6c");
      px(ctx, sx + w * 0.66, sy + h * 0.8, 6, 6, "#5a5a6c");
      break;
    }

    case "lava_sprite": {
      // Glowing core
      ctx.shadowBlur = 14;
      ctx.shadowColor = "#ff6020";
      px(ctx, sx + 4, sy + 4, w - 8, h - 8, "#ff4400", "#ff8800");
      ctx.shadowBlur = 0;
      // Flame wisps
      px(ctx, sx + 2, sy,     5, 7, "#ff8820");
      px(ctx, sx + w - 7, sy, 5, 7, "#ff8820");
      px(ctx, sx + w * 0.4, sy - 4, 4, 6, "#ffcc00");
      // Eyes (white hot)
      px(ctx, sx + 6,     sy + 8, 3, 3, "#fff");
      px(ctx, sx + w - 9, sy + 8, 3, 3, "#fff");
      break;
    }

    case "skeleton": {
      const hasShield = enemy.shieldHp > 0;
      // Body — bone white
      px(ctx, sx + 4, sy + 12, w - 8, h - 12, "#d8d8e8", "#9898a8");
      // Skull
      px(ctx, sx + 4, sy + 2,  w - 8, 12, "#e8e8f0", "#8888a0");
      // Eye sockets
      px(ctx, sx + 7,      sy + 4, 4, 4, "#222");
      px(ctx, sx + w - 11, sy + 4, 4, 4, "#222");
      // Dark armour chestplate
      px(ctx, sx + 4, sy + 14, w - 8, 9, "#444460", "#222240");
      // Shield (left side when facing right, right side when facing left)
      if (hasShield) {
        const shieldX = enemy.dir > 0 ? sx - 6 : sx + w + 2;
        ctx.shadowBlur = 6;
        ctx.shadowColor = "#4488cc";
        px(ctx, shieldX, sy + 10, 8, 18, "#336699", "#5599cc");
        ctx.shadowBlur = 0;
        // Shield edge highlight
        px(ctx, shieldX + 1, sy + 11, 2, 16, "#88bbee");
      }
      break;
    }

    case "dragon": {
      const t = Date.now() / 1000;
      const breathe = Math.sin(t * 2) * 2;

      // Wings (large, behind body)
      ctx.save();
      ctx.globalAlpha = 0.85;
      // Left wing
      px(ctx, sx - 20, sy + 10, 30, h * 0.7, "#1a0030");
      px(ctx, sx - 14, sy + 14, 18, h * 0.5, "#2a0048");
      // Right wing
      px(ctx, sx + w - 10, sy + 10, 30, h * 0.7, "#1a0030");
      px(ctx, sx + w - 4,  sy + 14, 18, h * 0.5, "#2a0048");
      ctx.restore();

      // Body
      px(ctx, sx + 8, sy + 16 + breathe, w - 16, h - 20, "#1c0030", "#3a0060");
      // Belly scales (lighter)
      px(ctx, sx + 14, sy + 22 + breathe, w - 28, h - 32, "#280848");
      // Head
      px(ctx, sx + w * 0.55, sy + breathe, w * 0.38, 22, "#1c0030", "#3a0060");
      // Snout
      px(ctx, sx + w * 0.78, sy + 6 + breathe, w * 0.2, 12, "#150028");
      // Horns
      px(ctx, sx + w * 0.6,  sy - 8 + breathe, 5, 10, "#3a0060");
      px(ctx, sx + w * 0.72, sy - 10 + breathe, 5, 12, "#3a0060");

      // Glowing eyes (phase 2 = brighter)
      const eyeGlow = enemy.phase === 2 ? "#ff00ff" : "#cc40ff";
      ctx.shadowBlur = enemy.phase === 2 ? 14 : 8;
      ctx.shadowColor = eyeGlow;
      px(ctx, sx + w * 0.76, sy + 4 + breathe, 6, 6, eyeGlow);
      ctx.shadowBlur = 0;

      // Phase 2: crackling purple aura
      if (enemy.phase === 2) {
        ctx.save();
        ctx.globalAlpha = 0.22 + Math.sin(t * 8) * 0.08;
        ctx.shadowBlur = 18;
        ctx.shadowColor = "#cc00ff";
        px(ctx, sx + 4, sy + 4 + breathe, w - 8, h - 8, "rgba(100,0,200,0.0)");
        ctx.restore();
      }
      break;
    }
  }
};

// ─── Enemies ──────────────────────────────────────────────────────────────────

const drawEnemies = (ctx: CanvasRenderingContext2D, state: GameState) => {
  state.enemies.forEach((enemy) => {
    if (!enemy.alive) return;

    const x = enemy.x - state.cameraX;
    const y = enemy.y;
    const hurtActive = enemy.hurtTimer > 0;
    const impact = Math.max(0, enemy.hurtTimer / 0.24);
    const shakeX = hurtActive ? Math.sin(enemy.hurtTimer * 82) * (2 + impact * 2.5) : 0;
    const shakeY = hurtActive ? -Math.cos(enemy.hurtTimer * 64) * (1 + impact * 1.5) : 0;
    const tilt   = hurtActive ? Math.sin(enemy.hurtTimer * 30) * 0.12 * (enemy.vx >= 0 ? 1 : -1) : 0;

    // Use sprite sheet for original 3 enemy types
    const hasSprite = (enemy.kind === "slime" || enemy.kind === "bat" || enemy.kind === "golem") && enemySheet.complete;
    const generatedSprite =
      enemy.kind in enemyGeneratedSprites
        ? enemyGeneratedSprites[enemy.kind as keyof typeof enemyGeneratedSprites]
        : null;
    const hasGeneratedSprite = Boolean(generatedSprite?.complete);

    ctx.save();
    const centerX = x + enemy.width / 2 + shakeX;
    const centerY = y + enemy.height / 2 + shakeY;

    // Facing flip (all enemies that move left/right)
    const facingRight =
      (enemy.kind === "bat" && enemy.vx > 0) ||
      (enemy.kind !== "bat" && enemy.dir > 0);

    ctx.translate(centerX, centerY);
    if (hurtActive) ctx.rotate(facingRight ? -tilt : tilt);
    ctx.scale(1 + impact * 0.08, 1 - impact * 0.07);
    if (!facingRight) {
      ctx.scale(-1, 1);
    }
    ctx.translate(-centerX, -centerY);

    if (hasSprite) {
      const frame = ENEMY_FRAMES[enemy.kind as "slime" | "bat" | "golem"];
      const dw = enemy.kind === "bat" ? 68 : enemy.kind === "golem" ? 62 : 46;
      const dh = enemy.kind === "bat" ? 42 : enemy.kind === "golem" ? 54 : 34;
      ctx.drawImage(
        enemySheet, frame.x, frame.y, frame.width, frame.height,
        x - (dw - enemy.width) / 2 + shakeX,
        y - (dh - enemy.height) / 2 + shakeY,
        dw, dh,
      );
    } else if (hasGeneratedSprite && generatedSprite) {
      const drawSize = ENEMY_DRAW_SIZES[enemy.kind as keyof typeof ENEMY_DRAW_SIZES];
      ctx.drawImage(
        generatedSprite,
        x - (drawSize.width - enemy.width) / 2 + shakeX,
        y - (drawSize.height - enemy.height) / 2 + shakeY,
        drawSize.width,
        drawSize.height,
      );
    } else {
      drawEnemyPixel(ctx, enemy, x + shakeX, y + shakeY);
    }

    ctx.restore();

    // HP bar (always screen-space, no transform)
    const barX = x + shakeX;
    const barY = y - 8 + shakeY;
    ctx.fillStyle = "#2f2439";
    ctx.fillRect(barX, barY, enemy.width, 4);
    ctx.fillStyle = enemy.kind === "dragon" ? "#c040ff" :
                    enemy.kind === "pharaoh" ? "#f0c020" : "#ff8787";
    ctx.fillRect(barX, barY, (enemy.width * Math.max(0, enemy.health)) / enemy.maxHealth, 4);
  });
};

// ─── Pickups ──────────────────────────────────────────────────────────────────

const drawPickups = (ctx: CanvasRenderingContext2D, state: GameState) => {
  state.pickups.forEach((pk) => {
    const x = pk.x - state.cameraX;
    const y = pk.y;
    const bob = Math.sin(state.time * 5 + pk.id) * 2;
    if (pk.type === "crystal") {
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#8be8ff";
      px(ctx, x - 6, y - 6 + bob, 12, 12, "#8be8ff", "#d8ffff");
      ctx.shadowBlur = 0;
    } else {
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#ff7e8d";
      px(ctx, x - 7, y - 6 + bob, 14, 12, "#ff7e8d", "#ffd7db");
      ctx.shadowBlur = 0;
    }
  });
};

// ─── Projectiles ─────────────────────────────────────────────────────────────

const drawProjectiles = (ctx: CanvasRenderingContext2D, state: GameState) => {
  state.projectiles.forEach((pr) => {
    const x = pr.x - state.cameraX;
    const y = pr.y;
    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = pr.glowColor;
    // Outer glow ring
    ctx.fillStyle = pr.glowColor;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(x, y, pr.radius + 4, 0, Math.PI * 2);
    ctx.fill();
    // Core
    ctx.globalAlpha = 1;
    ctx.fillStyle = pr.color;
    ctx.beginPath();
    ctx.arc(x, y, pr.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  });
};

// ─── Particles ────────────────────────────────────────────────────────────────

const drawParticles = (ctx: CanvasRenderingContext2D, state: GameState) => {
  state.particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x - state.cameraX), Math.round(p.y), p.size, p.size);
  });
  ctx.globalAlpha = 1;
};

// ─── Fog vignette ────────────────────────────────────────────────────────────

const drawFog = (ctx: CanvasRenderingContext2D, theme: BiomeTheme) => {
  const pal = BIOME_PALETTES[theme];
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  grad.addColorStop(0, "rgba(255,255,255,0)");
  grad.addColorStop(1, pal.fogColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
};

// ─── Entry point ─────────────────────────────────────────────────────────────

export const renderGame = (
  ctx: CanvasRenderingContext2D,
  stage: StageDefinition,
  state: GameState,
) => {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  drawParallax(ctx, stage.theme, state.cameraX);
  drawTiles(ctx, stage, state.cameraX);
  drawPortal(ctx, stage, state.cameraX);
  drawPrincess(ctx, stage, state);
  drawPickups(ctx, state);
  drawProjectiles(ctx, state);
  drawEnemies(ctx, state);
  drawPlayer(ctx, state);
  drawParticles(ctx, state);
  drawFog(ctx, stage.theme);
};
