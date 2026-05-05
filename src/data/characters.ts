import { CharacterId } from "../adventure/types";
import { assetUrl } from "../utils/assets";

export interface CharacterOption {
  id: CharacterId;
  name: string;
  title: string;
  description: string;
  styleNote: string;
  preview?: string;
}

export const CHARACTER_OPTIONS: CharacterOption[] = [
  {
    id: "hunter",
    name: "原初猎人",
    title: "废土追猎者",
    description: "标准狩猎装备，轻便稳健，适合一路推进遗迹与废墟。",
    styleNote: "近战剑士 · 经典默认主角",
  },
  {
    id: "legend24",
    name: "man",
    title: "持球战魂",
    description: "金紫战袍与灵火篮球一体成势，出手时会带出更明显的正面砸击动作。",
    styleNote: "原创传奇球手 · 手持篮球",
    preview: assetUrl("assets/generated/characters/legend24-hero.png"),
  },
];
