import { assetUrl } from "../utils/assets";

interface GameHUDProps {
  health: number;
  maxHealth: number;
  crystals: number;
  crystalsNeeded: number;
  enemiesLeft: number;
  dashCooldown?: number;
}

export function GameHUD({
  health,
  maxHealth,
  crystals,
  crystalsNeeded,
  enemiesLeft,
  dashCooldown = 0,
}: GameHUDProps) {
  const dashReady = dashCooldown <= 0;
  const dashPercent = dashReady ? 100 : Math.max(0, (1 - dashCooldown / 0.6) * 100);

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
        <div className="dash-bar-wrap">
          <div
            className={`dash-bar-fill ${dashReady ? "ready" : ""}`}
            style={{ width: `${dashPercent}%` }}
          />
          <span className="dash-bar-label">{dashReady ? "Shift 冲刺" : ""}</span>
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
