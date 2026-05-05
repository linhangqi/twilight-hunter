export type Screen = "menu" | "stages" | "game";

export type CharacterId = "hunter" | "legend24";

export type EnemyKind =
  | "slime"
  | "bat"
  | "golem"
  | "mummy"
  | "pharaoh"
  | "gargoyle"
  | "lava_sprite"
  | "skeleton"
  | "dragon";

export type BiomeTheme =
  | "forest"
  | "moonrift"
  | "desert"
  | "jungle"
  | "volcanic"
  | "ruins"
  | "dragon_lair";

export interface StageDefinition {
  id: number;
  name: string;
  biome: string;
  theme: BiomeTheme;
  hint: string;
  tutorialSteps?: string[];
  map: string[];
  enemySpawns: EnemySpawn[];
  crystalsNeeded: number;
}

export interface EnemySpawn {
  kind: EnemyKind;
  x: number;
  y: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface Pickup {
  id: number;
  x: number;
  y: number;
  vy: number;
  type: "crystal" | "heart";
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  color: string;
  glowColor: string;
  radius: number;
  life: number;
}

export interface PlayerState {
  character: CharacterId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  facing: 1 | -1;
  onGround: boolean;
  attackTimer: number;
  attackCooldown: number;
  hurtTimer: number;
  crystals: number;
  jumpsUsed: number;
}

export interface EnemyState {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  dir: 1 | -1;
  onGround: boolean;
  patrolOrigin: number;
  hurtTimer: number;
  stunTimer: number;
  attackCooldown: number;
  alive: boolean;
  shieldHp: number;
  chargeTimer: number;
  jumpCooldown: number;
  phase: number;
}

export interface GameState {
  stageId: number;
  player: PlayerState;
  enemies: EnemyState[];
  particles: Particle[];
  pickups: Pickup[];
  projectiles: Projectile[];
  cameraX: number;
  status: "playing" | "won" | "lost";
  time: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpPressed: boolean;
  attack: boolean;
}

export interface ProgressState {
  unlockedStage: number;
  completed: number[];
}
