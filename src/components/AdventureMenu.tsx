interface AdventureMenuProps {
  completedCount: number;
  totalStages: number;
  musicEnabled: boolean;
  onStart: () => void;
  onStages: () => void;
  onToggleMusic: () => void;
}

export function AdventureMenu({
  completedCount,
  totalStages,
  musicEnabled,
  onStart,
  onStages,
  onToggleMusic,
}: AdventureMenuProps) {
  return (
    <section className="menu-shell">
      <div className="menu-title-wrap">
        <div className="menu-overline">PIXEL SANDBOX ADVENTURE</div>
        <h1>暮土猎人</h1>
        <p className="hero-copy">
          在暮色大陆横穿山谷与遗迹，狩猎怪物、收集晶核，穿过一座座失落传送门。
        </p>
      </div>
      <div className="menu-stack">
        <button className="menu-stone-button large" onClick={onStart}>
          开始狩猎
        </button>
        <button className="menu-stone-button large secondary" onClick={onStages}>
          选择关卡
        </button>
        <div className="menu-progress">
          已突破 {completedCount} / {totalStages} 个区域
        </div>
        <button className="menu-audio-toggle" onClick={onToggleMusic}>
          {musicEnabled ? "音乐：开启" : "音乐：关闭"}
        </button>
      </div>
    </section>
  );
}
