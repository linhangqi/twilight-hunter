import { BiomeTheme, StageDefinition } from "./types";

export const TILE_SIZE = 32;
export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 576;

// Terrain is a single-tile-thick surface layer, shifted so the lowest point
// touches the bottom row of the grid.
const buildMap = (
  surface: number[],
  height: number,
  portalCol: number,
): string[] => {
  const width = surface.length;
  const grid = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => "."),
  );

  // Shift all surface values so the deepest point sits at the bottom row
  const maxVal = Math.max(...surface);
  const shift = (height - 1) - maxVal;
  const shifted = surface.map((v) => Math.min(v + shift, height - 1));

  // Fill from surface down to bottom
  shifted.forEach((topRow, col) => {
    for (let row = topRow; row < height; row++) {
      grid[row][col] = "#";
    }
  });

  // Portal marker: 2 rows above the surface at portalCol
  const pRow = Math.max(0, shifted[portalCol] - 2);
  grid[pRow][portalCol] = "P";

  return grid.map((row) => row.join(""));
};

// ─── Helper: flat run ─────────────────────────────────────────────────────────
const flat = (count: number, row = 10): number[] => Array(count).fill(row);

// ─── Biome palette lookup (used by render.ts) ────────────────────────────────
export const BIOME_PALETTES: Record<
  BiomeTheme,
  {
    skyTop: string;
    skyMid: string;
    skyBot: string;
    groundTop: string;
    groundFill: string;
    fogColor: string;
    accentColor: string;
  }
> = {
  forest: {
    skyTop: "#120f2d",
    skyMid: "#23336a",
    skyBot: "#355b74",
    groundTop: "#3d6b30",
    groundFill: "#2a4620",
    fogColor: "rgba(11,8,24,0.28)",
    accentColor: "#7edb7e",
  },
  moonrift: {
    skyTop: "#080818",
    skyMid: "#12184a",
    skyBot: "#1e2d60",
    groundTop: "#363a6a",
    groundFill: "#22253a",
    fogColor: "rgba(8,8,30,0.38)",
    accentColor: "#8888ee",
  },
  desert: {
    skyTop: "#2a1a08",
    skyMid: "#7a4820",
    skyBot: "#c47830",
    groundTop: "#c8a040",
    groundFill: "#7a6228",
    fogColor: "rgba(50,28,8,0.22)",
    accentColor: "#f0d080",
  },
  jungle: {
    skyTop: "#061006",
    skyMid: "#0e280e",
    skyBot: "#184818",
    groundTop: "#2e6a20",
    groundFill: "#143010",
    fogColor: "rgba(6,18,6,0.40)",
    accentColor: "#60e040",
  },
  volcanic: {
    skyTop: "#160404",
    skyMid: "#3e0e0e",
    skyBot: "#7a2808",
    groundTop: "#5a3020",
    groundFill: "#301808",
    fogColor: "rgba(60,12,0,0.32)",
    accentColor: "#ff6020",
  },
  ruins: {
    skyTop: "#0a0810",
    skyMid: "#181020",
    skyBot: "#241830",
    groundTop: "#484858",
    groundFill: "#282838",
    fogColor: "rgba(12,8,22,0.45)",
    accentColor: "#9080c0",
  },
  dragon_lair: {
    skyTop: "#020006",
    skyMid: "#0c0018",
    skyBot: "#180030",
    groundTop: "#280848",
    groundFill: "#100020",
    fogColor: "rgba(10,0,24,0.55)",
    accentColor: "#c040ff",
  },
};

export const STAGES: StageDefinition[] = [
  // ── 1: 苔坡前哨 · Forest Tutorial ──────────────────────────────────────────
  {
    id: 1,
    name: "苔坡前哨",
    biome: "Forest Verge",
    theme: "forest",
    hint: "先熟悉移动、跳跃和挥砍，消灭史莱姆后收集晶核进入传送门。",
    tutorialSteps: [
      "← A / D 或方向键 移动 →",
      "↑ W / 空格 跳跃（可二段跳）",
      "⚔ J / F 挥剑攻击",
      "消灭所有敌人！",
      "拾取掉落的晶核 ✦",
      "集齐晶核，走向右侧传送门 →",
    ],
    crystalsNeeded: 2,
    map: buildMap(
      // Flat ground — tutorial should be calm
      flat(32),
      14,
      29,
    ),
    enemySpawns: [
      { kind: "slime", x: 380, y: 100 },
      { kind: "slime", x: 640, y: 100 },
    ],
  },

  // ── 2: 月井裂隙 · Moon Rift ─────────────────────────────────────────────────
  {
    id: 2,
    name: "月井裂隙",
    biome: "Moonwell Rift",
    theme: "moonrift",
    hint: "两段高台需要连续跳跃，蝙蝠会从空中偷袭，石魔则会在落点附近拦截你。",
    crystalsNeeded: 3,
    map: buildMap(
      [
        ...flat(8),
        // First hill: cols 8-11 → row 7
        7, 7, 7, 7,
        ...flat(6),
        // Second hill: cols 18-21 → row 7
        7, 7, 7, 7,
        ...flat(18),
      ],
      14,
      38,
    ),
    enemySpawns: [
      { kind: "bat",   x: 420, y: 160 },
      { kind: "bat",   x: 760, y: 150 },
      { kind: "golem", x: 1100, y: 100 },
    ],
  },

  // ── 3: 焦土沙海 · Desert + Pharaoh ─────────────────────────────────────────
  {
    id: 3,
    name: "焦土沙海",
    biome: "Scorched Sands",
    theme: "desert",
    hint: "木乃伊行动迟缓但耐打，法老会发射能量弹，注意躲避。",
    crystalsNeeded: 5,
    map: buildMap(
      [
        ...flat(4),
        // Dune 1
        9, 8, 8, 8, 9,
        ...flat(3),
        // Dune 2
        9, 8, 8, 8, 9,
        ...flat(3),
        // Dune 3
        9, 8, 8, 8, 9,
        ...flat(3),
        // Dune 4 (boss area)
        9, 8, 8, 8, 9,
        ...flat(10),
      ],
      14,
      41,
    ),
    enemySpawns: [
      { kind: "mummy",  x: 300,  y: 100 },
      { kind: "mummy",  x: 620,  y: 100 },
      { kind: "mummy",  x: 940,  y: 100 },
      { kind: "pharaoh", x: 1150, y: 100 },
    ],
  },

  // ── 4: 绿渊秘境 · Jungle + Gargoyles ───────────────────────────────────────
  {
    id: 4,
    name: "绿渊秘境",
    biome: "Deep Jungle",
    theme: "jungle",
    hint: "石像鬼会在高处盘旋后突然俯冲，穿越丛林台地时不要停在边缘。",
    crystalsNeeded: 3,
    map: buildMap(
      [
        ...flat(4),
        // Stepped canopy terrain
        9, 9, 9, 9, 9,
        ...flat(3),
        8, 8, 8, 8, 8,
        ...flat(3),
        9, 9, 9, 9, 9,
        ...flat(3),
        8, 8, 8, 8, 8,
        ...flat(3),
        9, 9, 9, 9, 9,
        ...flat(3),
        8, 8, 8, 8,
        ...flat(5),
      ],
      14,
      45,
    ),
    enemySpawns: [
      { kind: "gargoyle", x: 320,  y: 80  },
      { kind: "gargoyle", x: 760,  y: 80  },
      { kind: "gargoyle", x: 1260, y: 80  },
    ],
  },

  // ── 5: 熔核炉道 · Volcanic + Lava Sprites ──────────────────────────────────
  {
    id: 5,
    name: "熔核炉道",
    biome: "Magma Forge",
    theme: "volcanic",
    hint: "岩浆精灵速度极快，击杀后还会喷发火焰，出刀后立刻横移。",
    crystalsNeeded: 5,
    map: buildMap(
      [
        ...flat(4),
        // Broken volcanic shelves with staggered landings
        9, 8, 8, 9,
        ...flat(2),
        8, 7, 7, 8,
        ...flat(2),
        9, 8, 8, 7, 7,
        ...flat(2),
        8, 8, 9, 8,
        ...flat(2),
        7, 7, 8, 8, 9,
        ...flat(14),
      ],
      14,
      47,
    ),
    enemySpawns: [
      { kind: "lava_sprite", x: 260,  y: 100 },
      { kind: "lava_sprite", x: 500,  y: 100 },
      { kind: "lava_sprite", x: 760,  y: 100 },
      { kind: "lava_sprite", x: 1020, y: 100 },
      { kind: "lava_sprite", x: 1280, y: 100 },
    ],
  },

  // ── 6: 枯骨城寨 · Undead Ruins + Skeletons ─────────────────────────────────
  {
    id: 6,
    name: "枯骨城寨",
    biome: "Blightbone Keep",
    theme: "ruins",
    hint: "骷髅骑士正面会用盾格挡，先绕背或连续打碎盾牌，再完成处决。",
    crystalsNeeded: 6,
    map: buildMap(
      [
        // Broken castle walls, followed by a final approach to the exit
        11, 11, 13, 13, 10, 10, 10, 13, 13,
        11, 11, 13, 13, 10, 10, 10, 13, 13,
        11, 11, 13, 13, 10, 10, 10, 13, 13,
        11, 11, 13, 13, 10, 10, 10, 13, 13,
        11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11,
      ],
      17,
      45,
    ),
    enemySpawns: [
      { kind: "skeleton",  x: 300,  y: 100 },
      { kind: "skeleton",  x: 760,  y: 100 },
      { kind: "skeleton",  x: 1220, y: 100 },
    ],
  },

  // ── 7: 深渊龙巢 · Dragon Lair ───────────────────────────────────────────────
  {
    id: 7,
    name: "深渊龙巢",
    biome: "Abyssal Lair",
    theme: "dragon_lair",
    hint: "暗影龙进入二阶段后会一次连发三枚火球，看到紫光爆发后立刻准备横向拉开。",
    crystalsNeeded: 4,
    map: buildMap(
      [
        ...flat(4),
        // Left rampart
        7, 7, 7, 7, 7, 7, 7, 7, 7,
        // Grand arena floor
        ...flat(30),
        // Right rampart
        7, 7, 7, 7, 7, 7, 7, 7, 7,
        // Exit
        ...flat(4),
      ],
      14,
      52,
    ),
    enemySpawns: [
      { kind: "dragon",   x: 900,  y: 80  },
    ],
  },
];

export const getStageById = (stageId: number) =>
  STAGES.find((stage) => stage.id === stageId) ?? STAGES[0];
