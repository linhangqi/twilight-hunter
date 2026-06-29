export type Screen = "menu" | "stages" | "game" | "stage_intro" | "upgrade";

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

export type ElitePrefix = "swift" | "tough" | "fierce";

export type TrapKind = "spike" | "lava";

export interface StageDefinition {
  id: number;
  name: string;
  biome: string;
  theme: BiomeTheme;
  hint: string;
  intro?: string;
  tutorialSteps?: string[];
  map: string[];
  enemySpawns: EnemySpawn[];
  crystalsNeeded: number;
  traps?: TrapDefinition[];
}

export interface TrapDefinition {
  kind: TrapKind;
  col: number;
  colSpan: number;
}

export interface ResolvedTrap {
  kind: TrapKind;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EnemySpawn {
  kind: EnemyKind;
  x: number;
  y: number;
  elite?: ElitePrefix;
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

export interface DamageText {
  x: number;
  y: number;
  vx: number;
  vy: number;
  value: number;
  life: number;
  color: string;
}

export interface ScreenShake {
  intensity: number;
  timer: number;
}

export interface ComboState {
  count: number;
  timer: number;
}

export interface ForegroundParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: "leaf" | "bird" | "ember" | "dust";
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

export interface DeathAnimation {
  x: number;
  y: number;
  width: number;
  height: number;
  timer: number;
  kind: EnemyKind;
  color: string;
}

export interface PassiveUpgrade {
  id: string;
  name: string;
  description: string;
  icon: string;
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
  dashTimer: number;
  dashCooldown: number;
  dashDirection: 1 | -1;
  attackRange: number;
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
  elite: ElitePrefix | null;
}

export interface GameState {
  stageId: number;
  player: PlayerState;
  enemies: EnemyState[];
  particles: Particle[];
  pickups: Pickup[];
  projectiles: Projectile[];
  damageTexts: DamageText[];
  screenShake: ScreenShake;
  combo: ComboState;
  deathAnimations: DeathAnimation[];
  foregroundParticles: ForegroundParticle[];
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
  dash: boolean;
  dashPressed: boolean;
}

export interface ProgressState {
  unlockedStage: number;
  completed: number[];
  passives: string[];
}
