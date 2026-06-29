import { STAGES, TILE_SIZE, VIEW_WIDTH, resolveTraps } from "./stages";
import {
  CharacterId,
  DamageText,
  ElitePrefix,
  EnemyKind,
  EnemyState,
  ForegroundParticle,
  GameState,
  InputState,
  Particle,
  Pickup,
  Projectile,
  PlayerState,
  ScreenShake,
  StageDefinition,
} from "./types";

const GRAVITY = 1800;
const MOVE_ACCEL = 1600;
const FRICTION = 1300;
const MAX_MOVE_SPEED = 260;
const JUMP_SPEED = 620;
const PLAYER_ATTACK_WINDOW = 0.22;
const PLAYER_ATTACK_COOLDOWN = 0.34;
const PLAYER_INVULN = 0.55;
const ENEMY_JUMP_PLAYER_RANGE = 220;

// Dash constants
const DASH_SPEED = 600;
const DASH_DURATION = 0.15;
const DASH_COOLDOWN = 0.6;
const DASH_INVULN = 0.2;

// Combo constants
const COMBO_TIMEOUT = 1.5;

// Trap constants
const TRAP_DAMAGE_COOLDOWN = 0.8;
let trapDamageCooldown = 0;

let projectileIdCounter = 10000;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const rectsOverlap = (
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

// ─── Enemy stats ──────────────────────────────────────────────────────────────

const enemyStats = (kind: EnemyKind) => {
  switch (kind) {
    case "slime":      return { width: 28, height: 24, health: 2, speed: 82,  damage: 1 };
    case "bat":        return { width: 26, height: 20, health: 2, speed: 110, damage: 1 };
    case "golem":      return { width: 30, height: 34, health: 4, speed: 55,  damage: 2 };
    case "mummy":      return { width: 30, height: 32, health: 3, speed: 50,  damage: 1 };
    case "pharaoh":    return { width: 28, height: 38, health: 10, speed: 40, damage: 2 };
    case "gargoyle":   return { width: 34, height: 30, health: 3, speed: 95,  damage: 2 };
    case "lava_sprite":return { width: 22, height: 26, health: 2, speed: 150, damage: 2 };
    case "skeleton":   return { width: 26, height: 36, health: 4, speed: 65,  damage: 2 };
    case "dragon":     return { width: 80, height: 56, health: 18, speed: 55, damage: 3 };
  }
};

// ─── Elite modifiers ─────────────────────────────────────────────────────────

const applyEliteModifiers = (
  stats: ReturnType<typeof enemyStats>,
  elite: ElitePrefix | null,
) => {
  if (!elite) return stats;
  const s = { ...stats };
  switch (elite) {
    case "swift":
      s.speed = Math.round(s.speed * 1.5);
      s.health = Math.round(s.health * 1.2);
      break;
    case "tough":
      s.health = s.health * 2;
      s.speed = Math.round(s.speed * 0.85);
      break;
    case "fierce":
      s.damage = s.damage + 1;
      s.health = Math.round(s.health * 1.5);
      s.speed = Math.round(s.speed * 1.2);
      break;
  }
  return s;
};

// ─── Passive upgrade helpers ─────────────────────────────────────────────────

export const PASSIVE_UPGRADES = [
  { id: "extra_life", name: "+1 生命上限", description: "最大生命值提升 1 点", icon: "❤" },
  { id: "attack_range", name: "延长攻击范围", description: "攻击距离增大 30%", icon: "⚔" },
  { id: "dash_reset", name: "冲刺冷却减半", description: "冲刺冷却时间降低 50%", icon: "💨" },
  { id: "combo_extend", name: "连击延长", description: "连击超时时间增加 1 秒", icon: "🔥" },
  { id: "crystal_magnet", name: "晶核吸附", description: "晶核拾取范围增大 80%", icon: "✦" },
];

export const getRandomUpgradeChoices = (owned: string[], count = 3) => {
  const available = PASSIVE_UPGRADES.filter((u) => !owned.includes(u.id));
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

// ─── Factories ────────────────────────────────────────────────────────────────

const createPlayer = (character: CharacterId, passives: string[] = []): PlayerState => ({
  character,
  x: 84, y: 220,
  vx: 0, vy: 0,
  width: 26, height: 38,
  health: 5 + (passives.includes("extra_life") ? 1 : 0),
  maxHealth: 5 + (passives.includes("extra_life") ? 1 : 0),
  facing: 1,
  onGround: false,
  attackTimer: 0, attackCooldown: 0, hurtTimer: 0,
  crystals: 0,
  jumpsUsed: 0,
  dashTimer: 0,
  dashCooldown: 0,
  dashDirection: 1,
  attackRange: passives.includes("attack_range") ? 49 : 38,
});

const createEnemy = (
  stage: StageDefinition,
  spawn: StageDefinition["enemySpawns"][number],
  index: number,
): EnemyState => {
  const baseStats = enemyStats(spawn.kind);
  const elite = spawn.elite ?? null;
  const stats = applyEliteModifiers(baseStats, elite);
  return {
    id: stage.id * 100 + index,
    kind: spawn.kind,
    x: spawn.x,
    y: spawn.y,
    vx: 0, vy: 0,
    width: stats.width,
    height: stats.height,
    health: stats.health,
    maxHealth: stats.health,
    dir: -1,
    onGround: false,
    patrolOrigin: spawn.x,
    hurtTimer: 0,
    stunTimer: 0,
    attackCooldown: 0,
    alive: true,
    shieldHp: spawn.kind === "skeleton" ? (elite === "tough" ? 4 : 2) : 0,
    chargeTimer: spawn.kind === "pharaoh" ? 3.5 : spawn.kind === "dragon" ? 4 : 0,
    jumpCooldown: 0,
    phase: 1,
    elite,
  };
};

export const createInitialState = (stageId: number, character: CharacterId = "hunter", passives: string[] = []): GameState => {
  const stage = STAGES.find((s) => s.id === stageId) ?? STAGES[0];
  return {
    stageId: stage.id,
    player: createPlayer(character, passives),
    enemies: stage.enemySpawns.map((spawn, i) => createEnemy(stage, spawn, i)),
    particles: [],
    pickups: [],
    projectiles: [],
    damageTexts: [],
    screenShake: { intensity: 0, timer: 0 },
    combo: { count: 0, timer: 0 },
    deathAnimations: [],
    foregroundParticles: [],
    cameraX: 0,
    status: "playing",
    time: 0,
  };
};

// ─── Map helpers ──────────────────────────────────────────────────────────────

export const findPortal = (stage: StageDefinition) => {
  for (let row = 0; row < stage.map.length; row++) {
    const col = stage.map[row].indexOf("P");
    if (col !== -1) {
      let supportRow = row + 1;
      while (supportRow < stage.map.length && stage.map[supportRow][col] !== "#") {
        supportRow++;
      }
      const groundTop =
        supportRow < stage.map.length ? supportRow * TILE_SIZE : stage.map.length * TILE_SIZE;
      return { x: col * TILE_SIZE + 10, y: groundTop - 58, width: 38, height: 58 };
    }
  }
  return {
    x: stage.map[0].length * TILE_SIZE - 96,
    y: stage.map.length * TILE_SIZE - 140,
    width: 38, height: 58,
  };
};

export const getWorldWidth = (stage: StageDefinition) =>
  stage.map[0].length * TILE_SIZE;

export const findPrincess = (stage: StageDefinition) => {
  if (stage.id !== 7) return null;
  const portal = findPortal(stage);
  return {
    x: portal.x - 112,
    y: portal.y - 4,
    width: 96,
    height: 96,
  };
};

const isSolidTile = (stage: StageDefinition, tx: number, ty: number) => {
  if (ty < 0) return true;
  if (ty >= stage.map.length) return false;
  if (tx < 0 || tx >= stage.map[0].length) return true;
  return stage.map[ty][tx] === "#";
};

const getGroundTopAtX = (stage: StageDefinition, worldX: number) => {
  const tileX = clamp(Math.floor(worldX / TILE_SIZE), 0, stage.map[0].length - 1);
  for (let tileY = 0; tileY < stage.map.length; tileY++) {
    if (isSolidTile(stage, tileX, tileY)) {
      return tileY * TILE_SIZE;
    }
  }
  return stage.map.length * TILE_SIZE;
};

const canStageEnemyJump = (stageId: number, kind: EnemyKind) =>
  (stageId === 3 && (kind === "mummy" || kind === "pharaoh")) ||
  (stageId === 5 && kind === "lava_sprite") ||
  (stageId === 6 && kind === "skeleton");

const getEnemyJumpSpeed = (kind: EnemyKind) => {
  switch (kind) {
    case "lava_sprite":
      return 560;
    case "pharaoh":
      return 500;
    default:
      return 520;
  }
};

const tryEnemyJump = (
  enemy: EnemyState,
  player: PlayerState,
  stage: StageDefinition,
) => {
  if (!canStageEnemyJump(stage.id, enemy.kind) || !enemy.onGround || enemy.jumpCooldown > 0) {
    return;
  }

  const enemyCenterX = enemy.x + enemy.width / 2;
  const currentGroundTop = getGroundTopAtX(stage, enemyCenterX);
  const aheadX = enemyCenterX + enemy.dir * (enemy.width + TILE_SIZE * 0.6);
  const aheadGroundTop = getGroundTopAtX(stage, aheadX);
  const wallTileX = Math.floor((enemy.x + (enemy.dir > 0 ? enemy.width + 2 : -2)) / TILE_SIZE);
  const wallTop = Math.floor((enemy.y + 6) / TILE_SIZE);
  const wallBottom = Math.floor((enemy.y + enemy.height - 8) / TILE_SIZE);

  let wallAhead = false;
  for (let tileY = wallTop; tileY <= wallBottom; tileY++) {
    if (isSolidTile(stage, wallTileX, tileY)) {
      wallAhead = true;
      break;
    }
  }

  const climbingStep = aheadGroundTop < currentGroundTop - TILE_SIZE * 0.6;
  const playerAbove =
    Math.abs(player.x - enemy.x) < ENEMY_JUMP_PLAYER_RANGE &&
    player.y + player.height < enemy.y - 20;

  if (!wallAhead && !climbingStep && !playerAbove) {
    return;
  }

  enemy.vy = -getEnemyJumpSpeed(enemy.kind);
  enemy.onGround = false;
  enemy.jumpCooldown = enemy.kind === "lava_sprite" ? 0.9 : 1.4;
};

// ─── Physics ──────────────────────────────────────────────────────────────────

const moveBody = <
  T extends { x: number; y: number; vx: number; vy: number; width: number; height: number; onGround: boolean }
>(body: T, dt: number, stage: StageDefinition): T => {
  const next = { ...body };

  next.x += next.vx * dt;
  if (next.vx !== 0) {
    const dir = Math.sign(next.vx);
    const leadX = dir > 0 ? next.x + next.width : next.x;
    const tileX = Math.floor(leadX / TILE_SIZE);
    const top = Math.floor((next.y + 2) / TILE_SIZE);
    const bot = Math.floor((next.y + next.height - 2) / TILE_SIZE);
    for (let ty = top; ty <= bot; ty++) {
      if (isSolidTile(stage, tileX, ty)) {
        next.x = dir > 0 ? tileX * TILE_SIZE - next.width - 0.01 : (tileX + 1) * TILE_SIZE + 0.01;
        next.vx = 0;
        break;
      }
    }
  }

  next.y += next.vy * dt;
  next.onGround = false;
  if (next.vy !== 0) {
    const dir = Math.sign(next.vy);
    const leadY = dir > 0 ? next.y + next.height : next.y;
    const tileY = Math.floor(leadY / TILE_SIZE);
    const left = Math.floor((next.x + 2) / TILE_SIZE);
    const right = Math.floor((next.x + next.width - 2) / TILE_SIZE);
    for (let tx = left; tx <= right; tx++) {
      if (isSolidTile(stage, tx, tileY)) {
        if (dir > 0) {
          next.y = tileY * TILE_SIZE - next.height - 0.01;
          next.onGround = true;
        } else {
          next.y = (tileY + 1) * TILE_SIZE + 0.01;
        }
        next.vy = 0;
        break;
      }
    }
  }

  return next;
};

// ─── Particles & Pickups ──────────────────────────────────────────────────────

const spawnBurst = (
  target: Particle[], x: number, y: number, color: string, amount: number,
) => {
  for (let i = 0; i < amount; i++) {
    const angle = (Math.PI * 2 * i) / amount + Math.random() * 0.35;
    const speed = 40 + Math.random() * 110;
    target.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 20,
      life: 0.55 + Math.random() * 0.35,
      color,
      size: 3 + Math.random() * 4,
    });
  }
};

// Death explosion burst — more particles, larger, longer life
const spawnDeathBurst = (
  target: Particle[], x: number, y: number, w: number, h: number, color: string,
) => {
  for (let i = 0; i < 24; i++) {
    const angle = (Math.PI * 2 * i) / 24 + Math.random() * 0.3;
    const speed = 80 + Math.random() * 180;
    const ox = (Math.random() - 0.5) * w * 0.6;
    const oy = (Math.random() - 0.5) * h * 0.6;
    target.push({
      x: x + ox, y: y + oy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 80,
      life: 0.6 + Math.random() * 0.6,
      color,
      size: 4 + Math.random() * 6,
    });
  }
};

const spawnPickup = (drops: Pickup[], enemy: EnemyState) => {
  const push = (offsetX: number, offsetY: number, vy: number, type: "crystal" | "heart", idx: number) => {
    drops.push({
      id: enemy.id * 20 + idx,
      x: enemy.x + enemy.width / 2 + offsetX,
      y: enemy.y + enemy.height / 2 + offsetY,
      vy,
      type,
    });
  };

  switch (enemy.kind) {
    case "golem":
    case "mummy":
      push(0, 0, -120, "crystal", 1);
      push(10, -6, -145, "heart", 2);
      break;
    case "pharaoh":
      push(-8, 0, -130, "crystal", 1);
      push(8, -4, -140, "crystal", 2);
      push(0, -8, -155, "heart", 3);
      break;
    case "skeleton":
      push(-8, 0, -120, "crystal", 1);
      push(8, -4, -140, "crystal", 2);
      push(0, -8, -155, "heart", 3);
      break;
    case "dragon":
      // 5 crystal burst + heart
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5;
        push(Math.cos(angle) * 20, Math.sin(angle) * 10 - 10, -130 - i * 15, "crystal", i + 1);
      }
      push(0, -20, -180, "heart", 6);
      break;
    default:
      push(0, 0, -120, "crystal", 1);
  }
};

// ─── Damage text ─────────────────────────────────────────────────────────────

const spawnDamageText = (
  texts: DamageText[], x: number, y: number, value: number, color = "#fff",
) => {
  texts.push({
    x, y,
    vx: (Math.random() - 0.5) * 40,
    vy: -120 - Math.random() * 40,
    value,
    life: 0.8,
    color,
  });
};

// ─── Screen shake ────────────────────────────────────────────────────────────

const triggerShake = (shake: ScreenShake, intensity: number, duration: number) => {
  shake.intensity = Math.max(shake.intensity, intensity);
  shake.timer = Math.max(shake.timer, duration);
};

// ─── Foreground particles ────────────────────────────────────────────────────

const spawnForegroundParticles = (
  particles: ForegroundParticle[],
  theme: string,
  cameraX: number,
  viewWidth: number,
  viewHeight: number,
) => {
  // Limit count
  if (particles.length > 30) return;

  const rand = Math.random();
  switch (theme) {
    case "forest":
    case "jungle":
      if (rand < 0.03) {
        particles.push({
          x: cameraX + Math.random() * viewWidth,
          y: -10,
          vx: -15 - Math.random() * 25,
          vy: 30 + Math.random() * 20,
          life: 4 + Math.random() * 3,
          maxLife: 7,
          size: 4 + Math.random() * 4,
          color: theme === "forest" ? "#6ca14b" : "#3a8c28",
          type: "leaf",
        });
      }
      break;
    case "moonrift":
      if (rand < 0.015) {
        particles.push({
          x: cameraX + Math.random() * viewWidth,
          y: viewHeight * 0.3 + Math.random() * viewHeight * 0.4,
          vx: 20 + Math.random() * 40,
          vy: -5 + Math.random() * 10,
          life: 3 + Math.random() * 2,
          maxLife: 5,
          size: 2 + Math.random() * 2,
          color: "#aabbff",
          type: "dust",
        });
      }
      break;
    case "desert":
      if (rand < 0.04) {
        particles.push({
          x: cameraX + viewWidth + 10,
          y: Math.random() * viewHeight * 0.5,
          vx: -40 - Math.random() * 30,
          vy: 5 + Math.random() * 8,
          life: 3 + Math.random() * 2,
          maxLife: 5,
          size: 2 + Math.random() * 2,
          color: "#d4a060",
          type: "dust",
        });
      }
      break;
    case "volcanic":
    case "dragon_lair":
      if (rand < 0.05) {
        particles.push({
          x: cameraX + Math.random() * viewWidth,
          y: viewHeight + 10,
          vx: (Math.random() - 0.5) * 30,
          vy: -40 - Math.random() * 60,
          life: 1.5 + Math.random() * 2,
          maxLife: 3.5,
          size: 2 + Math.random() * 3,
          color: theme === "volcanic" ? (Math.random() < 0.5 ? "#ff6020" : "#ffaa20") : "#a030ff",
          type: "ember",
        });
      }
      break;
    case "ruins":
      if (rand < 0.01) {
        particles.push({
          x: cameraX - 20,
          y: Math.random() * viewHeight * 0.3,
          vx: 30 + Math.random() * 20,
          vy: -2 + Math.random() * 4,
          life: 4 + Math.random() * 3,
          maxLife: 7,
          size: 3,
          color: "#555566",
          type: "bird",
        });
      }
      break;
  }
};

// ─── Projectile helpers ───────────────────────────────────────────────────────

const fireProjectile = (
  projectiles: Projectile[],
  x: number, y: number,
  vx: number, vy: number,
  damage: number,
  color: string,
  glowColor: string,
  radius: number,
  life: number,
) => {
  projectiles.push({
    id: projectileIdCounter++,
    x, y, vx, vy,
    damage, color, glowColor, radius, life,
  });
};

// ─── Main update ──────────────────────────────────────────────────────────────

export const updateGame = (
  current: GameState,
  stage: StageDefinition,
  input: InputState,
  dt: number,
  passives: string[] = [],
): GameState => {
  const state: GameState = {
    ...current,
    player: { ...current.player },
    enemies: current.enemies.map((e) => ({ ...e })),
    particles: current.particles.map((p) => ({ ...p })),
    pickups: current.pickups.map((pk) => ({ ...pk })),
    projectiles: current.projectiles.map((pr) => ({ ...pr })),
    damageTexts: current.damageTexts.map((t) => ({ ...t })),
    screenShake: { ...current.screenShake },
    combo: { ...current.combo },
    deathAnimations: current.deathAnimations.map((d) => ({ ...d })),
    foregroundParticles: current.foregroundParticles.map((fp) => ({ ...fp })),
    time: current.time + dt,
  };

  // Decay particles/projectiles even when game over
  if (state.status !== "playing") {
    state.particles = state.particles
      .map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, vy: p.vy + GRAVITY * 0.35 * dt, life: p.life - dt }))
      .filter((p) => p.life > 0);
    state.damageTexts = state.damageTexts
      .map((t) => ({ ...t, x: t.x + t.vx * dt, y: t.y + t.vy * dt, life: t.life - dt }))
      .filter((t) => t.life > 0);
    state.deathAnimations = state.deathAnimations
      .map((d) => ({ ...d, timer: d.timer - dt }))
      .filter((d) => d.timer > 0);
    state.screenShake.timer = Math.max(0, state.screenShake.timer - dt);
    if (state.screenShake.timer <= 0) state.screenShake.intensity = 0;
    return state;
  }

  const { player } = state;
  player.attackCooldown = Math.max(0, player.attackCooldown - dt);
  player.attackTimer    = Math.max(0, player.attackTimer - dt);
  player.hurtTimer      = Math.max(0, player.hurtTimer - dt);
  player.dashTimer      = Math.max(0, player.dashTimer - dt);
  player.dashCooldown   = Math.max(0, player.dashCooldown - dt);
  trapDamageCooldown    = Math.max(0, trapDamageCooldown - dt);

  // Screen shake decay
  state.screenShake.timer = Math.max(0, state.screenShake.timer - dt);
  if (state.screenShake.timer <= 0) state.screenShake.intensity = 0;

  // Combo decay
  const comboTimeout = COMBO_TIMEOUT + (passives.includes("combo_extend") ? 1 : 0);
  state.combo.timer = Math.max(0, state.combo.timer - dt);
  if (state.combo.timer <= 0) state.combo.count = 0;

  // ── Dash ──────────────────────────────────────────────────────────────────

  const dashCd = passives.includes("dash_reset") ? DASH_COOLDOWN * 0.5 : DASH_COOLDOWN;
  if (input.dashPressed && player.dashCooldown <= 0 && player.dashTimer <= 0) {
    player.dashTimer = DASH_DURATION;
    player.dashCooldown = dashCd;
    player.dashDirection = player.facing;
    player.hurtTimer = Math.max(player.hurtTimer, DASH_INVULN);
  }

  // Player movement
  if (player.dashTimer > 0) {
    // During dash: override velocity
    player.vx = player.dashDirection * DASH_SPEED;
  } else {
    if (input.left)  { player.vx -= MOVE_ACCEL * dt; player.facing = -1; }
    if (input.right) { player.vx += MOVE_ACCEL * dt; player.facing =  1; }
    if (!input.left && !input.right) {
      const slow = Math.min(Math.abs(player.vx), FRICTION * dt);
      player.vx -= Math.sign(player.vx) * slow;
    }
    player.vx = clamp(player.vx, -MAX_MOVE_SPEED, MAX_MOVE_SPEED);
  }

  if (input.jumpPressed && player.dashTimer <= 0 && (player.onGround || player.jumpsUsed < 2)) {
    player.vy = -JUMP_SPEED;
    player.onGround = false;
    player.jumpsUsed++;
  }

  if (input.attack && player.attackCooldown <= 0) {
    player.attackTimer    = PLAYER_ATTACK_WINDOW;
    player.attackCooldown = PLAYER_ATTACK_COOLDOWN;
  }

  player.vy += GRAVITY * dt;
  Object.assign(player, moveBody(player, dt, stage));
  if (player.onGround) player.jumpsUsed = 0;
  if (player.y > stage.map.length * TILE_SIZE + 120) player.health = 0;

  const attackActive = player.attackTimer > 0;
  const atkRange = player.attackRange;
  const attackBox = {
    x: player.x + (player.facing > 0 ? player.width - 4 : -atkRange + 4),
    y: player.y + 6,
    width: atkRange,
    height: player.height - 10,
  };

  // ── Trap collision ────────────────────────────────────────────────────────

  const resolvedTraps = resolveTraps(stage);
  if (resolvedTraps.length > 0 && player.hurtTimer <= 0 && trapDamageCooldown <= 0) {
    for (const trap of resolvedTraps) {
      if (rectsOverlap(player.x, player.y, player.width, player.height,
                       trap.x, trap.y, trap.width, trap.height)) {
        const dmg = trap.kind === "lava" ? 2 : 1;
        player.health -= dmg;
        player.hurtTimer = PLAYER_INVULN;
        trapDamageCooldown = TRAP_DAMAGE_COOLDOWN;
        player.vy = -280;
        spawnBurst(state.particles, player.x + player.width / 2, player.y + player.height,
                   trap.kind === "lava" ? "#ff4400" : "#ff8f9f", 8);
        triggerShake(state.screenShake, 4, 0.15);
        spawnDamageText(state.damageTexts, player.x + player.width / 2, player.y, dmg, "#ff4444");
        break;
      }
    }
  }

  // ── Enemy updates ───────────────────────────────────────────────────────────

  state.enemies.forEach((enemy) => {
    if (!enemy.alive) return;

    const baseStats = enemyStats(enemy.kind);
    const stats = applyEliteModifiers(baseStats, enemy.elite);
    enemy.hurtTimer     = Math.max(0, enemy.hurtTimer - dt);
    enemy.stunTimer     = Math.max(0, enemy.stunTimer - dt);
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    enemy.chargeTimer   = Math.max(0, enemy.chargeTimer - dt);
    enemy.jumpCooldown  = Math.max(0, enemy.jumpCooldown - dt);

    // Dragon phase transition
    if (enemy.kind === "dragon" && enemy.phase === 1 && enemy.health <= Math.floor(enemy.maxHealth / 2)) {
      enemy.phase = 2;
      spawnBurst(state.particles, enemy.x + 40, enemy.y + 28, "#c040ff", 20);
    }

    // ── Movement AI ─────────────────────────────────────────────────────────

    if (enemy.stunTimer > 0) {
      // Stunned: slide & fall
      if (enemy.kind === "bat" || enemy.kind === "gargoyle" || enemy.kind === "dragon") {
        enemy.vx *= 0.88;
        enemy.vy *= 0.88;
        enemy.x += enemy.vx * dt;
        enemy.y += enemy.vy * dt;
      } else {
        enemy.vx *= 0.82;
        enemy.vy += GRAVITY * dt;
        Object.assign(enemy, moveBody(enemy, dt, stage));
      }

    } else if (enemy.kind === "bat") {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      enemy.vx = clamp(dx * 0.85, -stats.speed, stats.speed);
      enemy.vy = clamp(dy * 0.80, -80, 80);
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;

    } else if (enemy.kind === "gargoyle") {
      // Fly toward player; periodically dive
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      if (enemy.chargeTimer <= 0 && Math.abs(dx) < 300) {
        // Dive attack
        enemy.vx = Math.sign(dx) * 200;
        enemy.vy = 220;
        enemy.chargeTimer = 2.8;
      } else {
        enemy.vx = clamp(dx * 0.7, -stats.speed, stats.speed);
        enemy.vy = clamp(dy * 0.6 - 30, -90, 70);
      }
      enemy.dir = enemy.vx >= 0 ? 1 : -1;
      enemy.x += enemy.vx * dt;
      enemy.y = clamp(enemy.y + enemy.vy * dt, 30, stage.map.length * TILE_SIZE - 60);

    } else if (enemy.kind === "dragon") {
      // Boss: hover and strafes toward player
      const dx = player.x + player.width / 2 - (enemy.x + enemy.width / 2);
      const dy = player.y - 120 - enemy.y; // hover 120px above player
      const spd = enemy.phase === 2 ? stats.speed * 1.5 : stats.speed;
      enemy.vx = clamp(dx * 0.5, -spd, spd);
      enemy.vy = clamp(dy * 0.5, -50, 50);
      // Undulate slowly
      enemy.vy += Math.sin(state.time * 1.8) * 18;
      enemy.dir = dx >= 0 ? 1 : -1;
      enemy.x += enemy.vx * dt;
      enemy.y = clamp(enemy.y + enemy.vy * dt, 30, stage.map.length * TILE_SIZE - 100);

      // Fireball attack
      if (enemy.chargeTimer <= 0) {
        const cx = enemy.x + enemy.width / 2;
        const cy = enemy.y + enemy.height / 2;
        const px = player.x + player.width / 2;
        const py = player.y + player.height / 2;
        const dist = Math.hypot(px - cx, py - cy) || 1;
        const speed = 280;
        const vx = ((px - cx) / dist) * speed;
        const vy = ((py - cy) / dist) * speed;
        fireProjectile(state.projectiles, cx, cy, vx, vy, 2, "#9920cc", "#ff60ff", 10, 4);
        if (enemy.phase === 2) {
          // Extra spread shots
          fireProjectile(state.projectiles, cx, cy, vx * 0.9 + vy * 0.3, vy * 0.9 - vx * 0.3, 2, "#9920cc", "#ff60ff", 10, 4);
          fireProjectile(state.projectiles, cx, cy, vx * 0.9 - vy * 0.3, vy * 0.9 + vx * 0.3, 2, "#9920cc", "#ff60ff", 10, 4);
        }
        enemy.chargeTimer = enemy.phase === 2 ? 2.2 : 3.5;
      }

    } else if (enemy.kind === "pharaoh") {
      // Ground walk + ranged attack
      const dx = player.x - enemy.x;
      const chaseRange = 320;
      if (Math.abs(dx) < chaseRange) {
        enemy.dir = dx >= 0 ? 1 : -1;
      } else if (Math.abs(enemy.x - enemy.patrolOrigin) > 80) {
        enemy.dir = enemy.x > enemy.patrolOrigin ? -1 : 1;
      }
      enemy.vx = enemy.dir * stats.speed * 0.6; // walks slowly
      tryEnemyJump(enemy, player, stage);
      enemy.vy += GRAVITY * dt;
      Object.assign(enemy, moveBody(enemy, dt, stage));

      // Shoot scarab
      if (enemy.chargeTimer <= 0 && Math.abs(dx) < 400) {
        const cx = enemy.x + enemy.width / 2;
        const cy = enemy.y + enemy.height * 0.35;
        const speed = 220;
        fireProjectile(state.projectiles, cx, cy, Math.sign(dx) * speed, -30, 1, "#f0c040", "#ffee88", 7, 3.5);
        enemy.chargeTimer = 3.5;
      }

    } else if (enemy.kind === "lava_sprite") {
      // Fast ground sprinter
      const dx = player.x - enemy.x;
      const chaseRange = 280;
      if (Math.abs(dx) < chaseRange) {
        enemy.dir = dx >= 0 ? 1 : -1;
      } else if (Math.abs(enemy.x - enemy.patrolOrigin) > 70) {
        enemy.dir = enemy.x > enemy.patrolOrigin ? -1 : 1;
      }
      enemy.vx = enemy.dir * stats.speed;
      tryEnemyJump(enemy, player, stage);
      enemy.vy += GRAVITY * dt;
      Object.assign(enemy, moveBody(enemy, dt, stage));

    } else {
      // Default: slime / golem / mummy / skeleton ground patrol + chase
      const chaseRange = enemy.kind === "golem" ? 170 : enemy.kind === "mummy" ? 120 : 140;
      const dx = player.x - enemy.x;
      if (Math.abs(dx) < chaseRange) {
        enemy.dir = dx >= 0 ? 1 : -1;
      } else if (Math.abs(enemy.x - enemy.patrolOrigin) > 90) {
        enemy.dir = enemy.x > enemy.patrolOrigin ? -1 : 1;
      }
      enemy.vx = enemy.dir * stats.speed;
      tryEnemyJump(enemy, player, stage);
      enemy.vy += GRAVITY * dt;
      Object.assign(enemy, moveBody(enemy, dt, stage));
    }

    // ── Player attack → enemy ─────────────────────────────────────────────

    if (
      attackActive &&
      enemy.hurtTimer <= 0 &&
      rectsOverlap(attackBox.x, attackBox.y, attackBox.width, attackBox.height,
                   enemy.x, enemy.y, enemy.width, enemy.height)
    ) {
      // Skeleton shield block: front-facing, shield intact
      const isInFront = enemy.kind === "skeleton" &&
        ((enemy.dir === 1 && player.x + player.width > enemy.x) ||
         (enemy.dir === -1 && player.x < enemy.x + enemy.width));

      if (enemy.kind === "skeleton" && enemy.shieldHp > 0 && isInFront) {
        // Blocked — only shieldHp decreases
        enemy.shieldHp--;
        enemy.hurtTimer = 0.15;
        // small knockback on player
        player.vx = (player.facing > 0 ? -1 : 1) * 120;
      } else {
        const dmg = 1;
        enemy.health -= dmg;
        enemy.hurtTimer = 0.24;
        enemy.stunTimer = enemy.kind === "golem" || enemy.kind === "mummy" || enemy.kind === "pharaoh"
          ? 0.3
          : enemy.kind === "dragon" ? 0.12
          : 0.22;
        enemy.vx = player.facing * (enemy.kind === "golem" || enemy.kind === "pharaoh" || enemy.kind === "dragon" ? 120 : 210);
        enemy.vy = enemy.kind === "bat" || enemy.kind === "gargoyle" || enemy.kind === "dragon" ? -50 : -160;

        // Damage text
        spawnDamageText(state.damageTexts, enemy.x + enemy.width / 2, enemy.y - 8, dmg, "#ffcc00");

        // Combo
        state.combo.count++;
        state.combo.timer = comboTimeout;

        // Screen shake on hit
        triggerShake(state.screenShake, 2, 0.08);

        const burstColor =
          enemy.kind === "golem"    ? "#ffbc7a" :
          enemy.kind === "mummy"    ? "#e0c888" :
          enemy.kind === "pharaoh"  ? "#f0d840" :
          enemy.kind === "gargoyle" ? "#aaaacc" :
          enemy.kind === "lava_sprite" ? "#ff7020" :
          enemy.kind === "skeleton" ? "#c8c8d8" :
          enemy.kind === "dragon"   ? "#c040ff" :
          "#9cf0b4";
        spawnBurst(state.particles, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2,
                   burstColor, enemy.kind === "dragon" ? 14 : 8);

        if (enemy.health <= 0) {
          enemy.alive = false;
          spawnPickup(state.pickups, enemy);

          // Death animation
          state.deathAnimations.push({
            x: enemy.x,
            y: enemy.y,
            width: enemy.width,
            height: enemy.height,
            timer: 0.4,
            kind: enemy.kind,
            color: burstColor,
          });

          // Larger screen shake on kill
          triggerShake(state.screenShake, 5, 0.2);

          // Death explosion particles
          spawnDeathBurst(state.particles, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2,
                         enemy.width, enemy.height, burstColor);

          // Lava sprite: extra fire burst on death
          if (enemy.kind === "lava_sprite") {
            for (let i = 0; i < 18; i++) {
              const angle = Math.random() * Math.PI * 2;
              const spd = 60 + Math.random() * 140;
              state.particles.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd - 60,
                life: 0.6 + Math.random() * 0.5,
                color: Math.random() < 0.5 ? "#ff6020" : "#ffaa20",
                size: 4 + Math.random() * 5,
              });
            }
          }
          spawnBurst(state.particles, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2,
                     "#ffe585", enemy.kind === "dragon" ? 24 : 16);
        }
      }
    }

    // ── Enemy → player contact damage ────────────────────────────────────

    if (
      enemy.alive &&
      enemy.attackCooldown <= 0 &&
      player.hurtTimer <= 0 &&
      player.dashTimer <= 0 &&
      enemy.kind !== "pharaoh" && // pharaoh uses projectiles only
      enemy.kind !== "dragon" &&  // dragon uses projectiles only
      rectsOverlap(player.x, player.y, player.width, player.height,
                   enemy.x, enemy.y, enemy.width, enemy.height)
    ) {
      player.health -= stats.damage;
      player.hurtTimer = PLAYER_INVULN;
      enemy.attackCooldown = 0.65;
      player.vx = (player.x < enemy.x ? -1 : 1) * 180;
      player.vy = -240;
      spawnBurst(state.particles, player.x + player.width / 2, player.y + player.height / 2, "#ff8f9f", 10);
      triggerShake(state.screenShake, 6, 0.2);
      spawnDamageText(state.damageTexts, player.x + player.width / 2, player.y, stats.damage, "#ff4444");
    }
  });

  // ── Projectiles ─────────────────────────────────────────────────────────────

  state.projectiles = state.projectiles
    .map((pr) => ({
      ...pr,
      x: pr.x + pr.vx * dt,
      y: pr.y + pr.vy * dt,
      vy: pr.vy + GRAVITY * 0.08 * dt, // very slight gravity arc
      life: pr.life - dt,
    }))
    .filter((pr) => {
      if (pr.life <= 0) return false;

      // Tile collision
      const tileX = Math.floor(pr.x / TILE_SIZE);
      const tileY = Math.floor(pr.y / TILE_SIZE);
      if (isSolidTile(stage, tileX, tileY)) {
        spawnBurst(state.particles, pr.x, pr.y, pr.color, 6);
        return false;
      }

      // Player collision (skip if dashing)
      if (
        player.hurtTimer <= 0 &&
        player.dashTimer <= 0 &&
        rectsOverlap(pr.x - pr.radius, pr.y - pr.radius, pr.radius * 2, pr.radius * 2,
                     player.x, player.y, player.width, player.height)
      ) {
        player.health -= pr.damage;
        player.hurtTimer = PLAYER_INVULN;
        player.vx = Math.sign(pr.vx) * 160;
        player.vy = -220;
        spawnBurst(state.particles, pr.x, pr.y, pr.glowColor, 10);
        triggerShake(state.screenShake, 5, 0.18);
        spawnDamageText(state.damageTexts, player.x + player.width / 2, player.y, pr.damage, "#ff4444");
        return false;
      }

      return true;
    });

  // ── Pickups ──────────────────────────────────────────────────────────────────

  const pickupRange = passives.includes("crystal_magnet") ? 36 : 20;
  state.pickups = state.pickups
    .map((pk) => {
      const next = { ...pk, vy: pk.vy + GRAVITY * 0.35 * dt };
      next.y += next.vy * dt;
      const tileY = Math.floor((next.y + 6) / TILE_SIZE);
      const tileX = Math.floor(next.x / TILE_SIZE);
      if (isSolidTile(stage, tileX, tileY)) {
        next.y = tileY * TILE_SIZE - 6;
        next.vy = -next.vy * 0.15;
      }
      return next;
    })
    .filter((pk) => {
      const half = pickupRange / 2;
      const collected = rectsOverlap(
        player.x, player.y, player.width, player.height,
        pk.x - half, pk.y - half, pickupRange, pickupRange,
      );
      if (!collected) return true;
      if (pk.type === "crystal") {
        player.crystals++;
      } else {
        player.health = Math.min(player.maxHealth, player.health + 1);
      }
      spawnBurst(state.particles, pk.x, pk.y, "#89e6ff", 8);
      return false;
    });

  // ── Damage texts ────────────────────────────────────────────────────────────

  state.damageTexts = state.damageTexts
    .map((t) => ({
      ...t,
      x: t.x + t.vx * dt,
      y: t.y + t.vy * dt,
      life: t.life - dt,
    }))
    .filter((t) => t.life > 0);

  // ── Death animations ────────────────────────────────────────────────────────

  state.deathAnimations = state.deathAnimations
    .map((d) => ({ ...d, timer: d.timer - dt }))
    .filter((d) => d.timer > 0);

  // ── Particles ────────────────────────────────────────────────────────────────

  state.particles = state.particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      vy: p.vy + GRAVITY * 0.3 * dt,
      life: p.life - dt,
    }))
    .filter((p) => p.life > 0);

  // ── Foreground particles ────────────────────────────────────────────────────

  spawnForegroundParticles(state.foregroundParticles, stage.theme, state.cameraX, VIEW_WIDTH, stage.map.length * TILE_SIZE);
  state.foregroundParticles = state.foregroundParticles
    .map((fp) => ({
      ...fp,
      x: fp.x + fp.vx * dt,
      y: fp.y + fp.vy * dt,
      life: fp.life - dt,
    }))
    .filter((fp) => fp.life > 0);

  // ── Win / Lose ────────────────────────────────────────────────────────────────

  const allCleared = state.enemies.every((e) => !e.alive);
  const princess = findPrincess(stage);
  const portal = findPortal(stage);
  const rescuedPrincess = princess
    ? rectsOverlap(
        player.x, player.y, player.width, player.height,
        princess.x, princess.y, princess.width, princess.height,
      ) ||
      rectsOverlap(
        player.x, player.y, player.width, player.height,
        portal.x - 28, portal.y - 12, portal.width + 56, portal.height + 24,
      )
    : false;
  if (
    player.crystals >= stage.crystalsNeeded &&
    allCleared &&
    (princess
      ? rescuedPrincess
      : rectsOverlap(player.x, player.y, player.width, player.height,
          portal.x, portal.y, portal.width, portal.height))
  ) {
    state.status = "won";
  }

  if (player.health <= 0) state.status = "lost";

  const worldWidth = getWorldWidth(stage);
  state.cameraX = clamp(
    player.x - VIEW_WIDTH * 0.36,
    0,
    Math.max(0, worldWidth - VIEW_WIDTH),
  );

  return state;
};
