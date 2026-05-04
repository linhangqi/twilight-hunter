import { StageDefinition } from "../adventure/types";

interface StageSelectProps {
  stages: StageDefinition[];
  unlockedStage: number;
  completed: number[];
  onBack: () => void;
  onSelect: (stageId: number) => void;
}

export function StageSelect({
  stages,
  unlockedStage,
  completed,
  onBack,
  onSelect,
}: StageSelectProps) {
  const clearedCount = completed.length;
  const allUnlocked = unlockedStage >= stages.length;

  return (
    <section className="menu-shell stage-select-shell">
      <div className="menu-title-wrap stage-select-hero">
        <div className="menu-overline">CHOOSE YOUR HUNTING ROUTE</div>
        <h1>关卡选择</h1>
        <p className="hero-copy">
          沿着已解锁的遗迹一路深入。每片区域都有不同地形、敌群与晶核需求，突破当前区域后会开启更深处的路径。
        </p>
        <div className="hero-metrics stage-select-metrics">
          <div>
            <span>当前进度</span>
            <strong>
              已突破 {clearedCount} / {stages.length} 个区域
            </strong>
          </div>
          <div>
            <span>{allUnlocked ? "路线状态" : "最新解锁"}</span>
            <strong>
              {allUnlocked
                ? `全部 ${stages.length} 个区域已开放`
                : `第 ${String(unlockedStage).padStart(2, "0")} 关 已开放`}
            </strong>
          </div>
        </div>
      </div>

      <div className="panel stage-panel">
        <div className="section-row stage-panel-top">
          <div className="menu-brandline">
            <img src="/ui/logo-emblem.svg" alt="" />
            <div>
              <div className="eyebrow">Available Stages</div>
              <h2>选择下一段征途</h2>
            </div>
          </div>
          <button className="menu-stone-button medium secondary" onClick={onBack}>
            返回主页
          </button>
        </div>

        <div className="stage-grid">
          {stages.map((stage) => {
            const unlocked = stage.id <= unlockedStage;
            const done = completed.includes(stage.id);
            return (
              <button
                key={stage.id}
                className={`stage-card ${done ? "done" : ""} ${unlocked ? "unlocked" : "locked"}`}
                disabled={!unlocked}
                onClick={() => unlocked && onSelect(stage.id)}
              >
                <span className="stage-badge">
                  Area {String(stage.id).padStart(2, "0")} · {stage.biome}
                </span>
                <strong>{stage.name}</strong>
                <span>{unlocked ? stage.hint : "击破前一区域后解锁这片废土。"}</span>
                <em>
                  {done
                    ? "已突破"
                    : unlocked
                      ? `进入需要 ${stage.crystalsNeeded} 枚晶核`
                      : "尚未解锁"}
                </em>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
