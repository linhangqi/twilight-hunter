import { assetUrl } from "../utils/assets";

interface GameHUDProps {
  health: number;
  maxHealth: number;
  crystals: number;
  crystalsNeeded: number;
  enemiesLeft: number;
}

export function GameHUD({
  health,
  maxHealth,
  crystals,
  crystalsNeeded,
  enemiesLeft,
}: GameHUDProps) {
  return (
    <>
      <div className="hud-corner hud-top-left">
        <div className="combat-hearts">
          {Array.from({ length: maxHealth }).map((_, index) => (
            <img
              key={index}
              src={index < Math.max(0, health) ? assetUrl("ui/heart-full.svg") : assetUrl("ui/heart-empty.svg")}
              alt=""
            />
          ))}
        </div>
      </div>

      <div className="hud-corner hud-right-mid">
        <div className="mini-stat">
          <img src={assetUrl("ui/crystal-icon.svg")} alt="" />
          <strong>{crystals} / {crystalsNeeded}</strong>
        </div>
        <div className="mini-stat">
          <img src={assetUrl("ui/skull-icon.svg")} alt="" />
          <strong>{enemiesLeft}</strong>
        </div>
      </div>
    </>
  );
}
