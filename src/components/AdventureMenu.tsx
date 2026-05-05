import { CharacterId } from "../adventure/types";
import { CHARACTER_OPTIONS } from "../data/characters";

interface AdventureMenuProps {
  completedCount: number;
  totalStages: number;
  musicEnabled: boolean;
  selectedCharacter: CharacterId;
  onStart: () => void;
  onStages: () => void;
  onToggleMusic: () => void;
  onSelectCharacter: (character: CharacterId) => void;
}

export function AdventureMenu({
  completedCount,
  totalStages,
  musicEnabled,
  selectedCharacter,
  onStart,
  onStages,
  onToggleMusic,
  onSelectCharacter,
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
        <div className="character-quick-select">
          <div className="character-quick-label">点击选择角色</div>
          <div className="character-quick-row">
            {CHARACTER_OPTIONS.map((character) => {
              const selected = character.id === selectedCharacter;
              return (
                <button
                  key={character.id}
                  type="button"
                  className={`character-chip ${selected ? "selected" : ""}`}
                  onClick={() => onSelectCharacter(character.id)}
                >
                  <div className={`character-chip-art ${character.preview ? "has-art" : "fallback-art"}`}>
                    {character.preview ? (
                      <img src={character.preview} alt={`${character.name} 角色预览`} />
                    ) : (
                      <div className="character-fallback-mark small">猎</div>
                    )}
                  </div>
                  <div className="character-chip-copy">
                    <strong>{character.name}</strong>
                    <span>{character.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
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
