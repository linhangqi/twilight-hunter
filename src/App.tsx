import { useEffect, useMemo, useState } from "react";
import { AdventureMenu } from "./components/AdventureMenu";
import { GameHUD } from "./components/GameHUD";
import { PixelGameCanvas } from "./components/PixelGameCanvas";
import { TutorialCallout, TutorialStepHUD } from "./components/TutorialCallout";
import { StageSelect } from "./components/StageSelect";
import { ensureAudioReady, setMusicEnabled, startBackgroundMusic, stopBackgroundMusic } from "./adventure/audio";
import { createInitialState, getRandomUpgradeChoices, PASSIVE_UPGRADES } from "./adventure/engine";
import { getStageById, STAGES } from "./adventure/stages";
import { CharacterId, Screen, GameState, ProgressState, PassiveUpgrade } from "./adventure/types";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { assetUrl } from "./utils/assets";

const INITIAL_PROGRESS: ProgressState = { unlockedStage: STAGES.length, completed: [], passives: [] };

export default function App() {
  const [screen, setScreen]               = useState<Screen>("menu");
  const [progress, setProgress]           = useLocalStorage<ProgressState>("twilight-hunter-progress", INITIAL_PROGRESS);
  const [musicEnabled, setMusicEnabledState] = useLocalStorage<boolean>("twilight-hunter-music-enabled", true);
  const [selectedCharacter, setSelectedCharacter] = useLocalStorage<CharacterId>("twilight-hunter-character", "hunter");
  const [currentStageId, setCurrentStageId] = useState(1);
  const [gameState, setGameState]         = useState<GameState>(() => createInitialState(1, selectedCharacter, progress.passives ?? []));
  const [showHint, setShowHint]           = useState(true);
  const [tutorialStep, setTutorialStep]   = useState(1);
  const [pauseMenuOpen, setPauseMenuOpen] = useState(false);
  const [upgradeChoices, setUpgradeChoices] = useState<PassiveUpgrade[]>([]);
  const [pendingNextStageId, setPendingNextStageId] = useState<number | null>(null);

  const currentStage = useMemo(() => getStageById(currentStageId), [currentStageId]);
  const nextStageToStart = useMemo(
    () => STAGES.find((stage) => !progress.completed.includes(stage.id))?.id ?? 1,
    [progress.completed],
  );

  // Ensure passives array exists in progress
  const passives = progress.passives ?? [];

  useEffect(() => {
    setGameState(createInitialState(currentStageId, selectedCharacter, passives));
    setShowHint(true);
    setTutorialStep(1);
    setPauseMenuOpen(false);
  }, [currentStageId, selectedCharacter]);

  useEffect(() => {
    const normalizedCompleted = progress.completed
      .filter((stageId) => stageId >= 1 && stageId <= STAGES.length)
      .sort((a, b) => a - b);

    if (
      progress.unlockedStage !== STAGES.length ||
      normalizedCompleted.length !== progress.completed.length ||
      normalizedCompleted.some((stageId, index) => stageId !== progress.completed[index]) ||
      !progress.passives
    ) {
      setProgress({
        unlockedStage: STAGES.length,
        completed: normalizedCompleted,
        passives: progress.passives ?? [],
      });
    }
  }, [progress, setProgress]);

  useEffect(() => {
    setMusicEnabled(musicEnabled);
  }, [musicEnabled]);

  useEffect(() => {
    void startBackgroundMusic(screen === "game" ? "game" : "menu");
    return () => { stopBackgroundMusic(); };
  }, [screen, musicEnabled]);

  useEffect(() => {
    if (screen !== "game") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Escape") return;
      event.preventDefault();
      if (gameState.status !== "playing") return;
      setPauseMenuOpen((value) => !value);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gameState.status, screen]);

  const openStage = (stageId: number) => {
    setCurrentStageId(stageId);
    setGameState(createInitialState(stageId, selectedCharacter, passives));
    setShowHint(true);
    setTutorialStep(1);
    setPauseMenuOpen(false);
    setPendingNextStageId(null);
    setScreen("game");
  };

  const openStageWithIntro = (stageId: number) => {
    const stage = getStageById(stageId);
    if (stage.intro) {
      setPendingNextStageId(stageId);
      setCurrentStageId(stageId);
      setScreen("stage_intro");
    } else {
      openStage(stageId);
    }
  };

  const markStageComplete = () => {
    const alreadyDone   = progress.completed.includes(currentStageId);
    const nextUnlocked  = Math.min(STAGES.length, Math.max(progress.unlockedStage, currentStageId + 1));
    if (!alreadyDone || nextUnlocked !== progress.unlockedStage) {
      setProgress({
        unlockedStage: nextUnlocked,
        completed: alreadyDone
          ? progress.completed
          : [...progress.completed, currentStageId].sort((a, b) => a - b),
        passives,
      });
    }
  };

  const handleUpgradeChoice = (upgradeId: string) => {
    const newPassives = [...passives, upgradeId];
    setProgress({ ...progress, passives: newPassives });
    if (pendingNextStageId !== null) {
      // openStageWithIntro will re-set pendingNextStageId, so don't clear it here
      openStageWithIntro(pendingNextStageId);
    } else {
      setScreen("stages");
    }
  };

  const showUpgradeScreen = (nextStageId?: number) => {
    const choices = getRandomUpgradeChoices(passives, 3);
    if (choices.length === 0) {
      // All upgrades owned
      if (nextStageId) {
        openStageWithIntro(nextStageId);
      } else {
        setScreen("stages");
      }
      return;
    }
    setUpgradeChoices(choices);
    if (nextStageId) setPendingNextStageId(nextStageId);
    setScreen("upgrade");
  };

  const enemiesLeft = gameState.enemies.filter((e) => e.alive).length;
  const isTutorialStage = Boolean(currentStage.tutorialSteps);
  const canPause = screen === "game" && gameState.status === "playing";

  return (
    <main
      className={`app-shell ${
        screen === "menu" || screen === "stages" || screen === "stage_intro" || screen === "upgrade"
          ? "menu-mode"
          : screen === "game"
            ? "game-mode"
            : ""
      }`}
    >
      <div className="sky-glow sky-left" />
      <div className="sky-glow sky-right" />

      {screen === "menu" && (
        <AdventureMenu
          completedCount={progress.completed.length}
          totalStages={STAGES.length}
          musicEnabled={musicEnabled}
          selectedCharacter={selectedCharacter}
          onStart={() => {
            ensureAudioReady();
            void startBackgroundMusic("game");
            openStageWithIntro(nextStageToStart);
          }}
          onStages={() => {
            ensureAudioReady();
            void startBackgroundMusic("menu");
            setScreen("stages");
          }}
          onToggleMusic={() => setMusicEnabledState((value) => !value)}
          onSelectCharacter={setSelectedCharacter}
        />
      )}

      {screen === "stages" && (
        <StageSelect
          stages={STAGES}
          unlockedStage={progress.unlockedStage}
          completed={progress.completed}
          onBack={() => setScreen("menu")}
          onSelect={(stageId) => {
            ensureAudioReady();
            void startBackgroundMusic("game");
            openStageWithIntro(stageId);
          }}
        />
      )}

      {screen === "stage_intro" && (
        <div className="stage-intro-overlay">
          <div className="stage-intro-panel">
            <span className="stage-intro-badge">第 {currentStageId} 关</span>
            <h2 className="stage-intro-title">{currentStage.name}</h2>
            <p className="stage-intro-text">{currentStage.intro}</p>
            <button
              className="menu-stone-button medium"
              onClick={() => {
                if (pendingNextStageId !== null) {
                  openStage(pendingNextStageId);
                  setPendingNextStageId(null);
                }
              }}
            >
              进入战场
            </button>
          </div>
        </div>
      )}

      {screen === "upgrade" && (
        <div className="stage-intro-overlay">
          <div className="upgrade-panel">
            <span className="stage-intro-badge">通关奖励</span>
            <h2 className="stage-intro-title">选择一项被动增益</h2>
            <div className="upgrade-choices">
              {upgradeChoices.map((u) => (
                <button
                  key={u.id}
                  className="upgrade-card"
                  onClick={() => handleUpgradeChoice(u.id)}
                >
                  <span className="upgrade-icon">{u.icon}</span>
                  <strong>{u.name}</strong>
                  <span className="upgrade-desc">{u.description}</span>
                </button>
              ))}
            </div>
            {passives.length > 0 && (
              <div className="owned-passives">
                <span>已拥有: </span>
                {passives.map((id) => {
                  const u = PASSIVE_UPGRADES.find((p) => p.id === id);
                  return u ? <span key={id} className="owned-passive-tag">{u.icon} {u.name}</span> : null;
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {screen === "game" && (
        <section className="game-screen">
          {/* Stage 1: step-by-step tutorial HUD */}
          {isTutorialStage && gameState.status === "playing" && !pauseMenuOpen && (
            <div className="tutorial-floating">
              <TutorialStepHUD
                steps={currentStage.tutorialSteps!}
                currentStep={tutorialStep}
              />
            </div>
          )}

          {/* Other stages: one-time hint callout */}
          {!isTutorialStage && showHint && gameState.status === "playing" && !pauseMenuOpen && (
            <div className="tutorial-floating">
              <TutorialCallout
                hint={currentStage.hint}
                onClose={() => setShowHint(false)}
              />
            </div>
          )}

          <PixelGameCanvas
            stage={currentStage}
            state={gameState}
            paused={pauseMenuOpen}
            passives={passives}
            onStateChange={setGameState}
            onVictory={markStageComplete}
            onDefeat={() => undefined}
            onPlayerAction={() => setShowHint(false)}
            tutorialStep={isTutorialStage ? tutorialStep : undefined}
            onTutorialAdvance={isTutorialStage ? setTutorialStep : undefined}
          >
            <div className="hud-corner hud-top-center stage-chip-fade">
              <div className="stage-chip">
                第 {currentStageId} 关 · {currentStage.name}
              </div>
            </div>
            <GameHUD
              health={gameState.player.health}
              maxHealth={gameState.player.maxHealth}
              crystals={gameState.player.crystals}
              crystalsNeeded={currentStage.crystalsNeeded}
              enemiesLeft={enemiesLeft}
              dashCooldown={gameState.player.dashCooldown}
            />
          </PixelGameCanvas>

          {pauseMenuOpen && canPause && (
            <div className="result-overlay">
              <div className="result-scrim" />
              <div className="result-banner game-result-panel pause-panel">
                <div className="result-mark">停</div>
                <div className="result-copy">
                  <span className="result-kicker">暂停中</span>
                  <strong className="result-title">狩猎暂缓</strong>
                  <p className="result-body">
                    战场时间已经冻结。你可以继续当前战斗、重新挑战本关，或返回关卡选择。
                  </p>
                  <div className="result-stats">
                    <div>
                      <span>当前关卡</span>
                      <strong>第 {currentStageId} 关 · {currentStage.name}</strong>
                    </div>
                    <div>
                      <span>战况</span>
                      <strong>{gameState.player.crystals} / {currentStage.crystalsNeeded} 晶核 · {enemiesLeft} 敌人</strong>
                    </div>
                  </div>
                  <div className="pause-tip">按 `Esc` 也可以继续战斗 · Shift/L 冲刺闪避</div>
                </div>
                <div className="hero-actions result-actions">
                  <button className="menu-stone-button medium" onClick={() => setPauseMenuOpen(false)}>
                    继续战斗
                  </button>
                  <button
                    className="menu-stone-button medium secondary"
                    onClick={() => {
                      setGameState(createInitialState(currentStageId, selectedCharacter, passives));
                      setShowHint(true);
                      setTutorialStep(1);
                      setPauseMenuOpen(false);
                    }}
                  >
                    重新挑战
                  </button>
                  <button
                    className="menu-stone-button medium secondary result-exit"
                    onClick={() => {
                      setPauseMenuOpen(false);
                      setScreen("stages");
                    }}
                  >
                    返回选关
                  </button>
                </div>
              </div>
            </div>
          )}

          {gameState.status !== "playing" && (
            <div className="result-overlay">
              <div className="result-scrim" />
              <div className={`result-banner game-result-panel ${gameState.status === "won" ? "victory" : "defeat"} ${gameState.status === "won" && currentStageId === STAGES.length ? "final-victory" : ""}`}>
                <div className="result-mark">
                  {gameState.status === "won" ? "胜" : "败"}
                </div>
                <div className="result-copy">
                  <span className="result-kicker">
                    {gameState.status === "won"
                      ? currentStageId === STAGES.length
                        ? "终章完成"
                        : `第 ${currentStageId} 关突破`
                      : "狩猎失败"}
                  </span>
                  <strong className="result-title">
                    {gameState.status === "won"
                      ? currentStageId === STAGES.length
                        ? "小公主已经获救"
                        : "前路已经开启"
                      : "在此地倒下了"}
                  </strong>
                  <p className="result-body">
                    {gameState.status === "won"
                      ? currentStageId === STAGES.length
                        ? "暗影龙已经倒下，裂隙深处的封印解除。你终于在终焉之地找到了被困的小公主。"
                        : "晶核已经归位，传送门重新稳定。稍作整备后，继续深入下一片废土。"
                      : "怪群压制了你的节奏。重新整理走位和出手时机，再试一次。"}
                  </p>
                  {gameState.status === "won" && currentStageId === STAGES.length && (
                    <div className="final-scene-art">
                      <img src={assetUrl("assets/generated/story/final-rescue-scene.png")} alt="救出小公主的终章画面" />
                    </div>
                  )}
                  <div className="result-stats">
                    <div>
                      <span>{gameState.status === "won" && currentStageId === STAGES.length ? "救援结果" : "晶核"}</span>
                      <strong>
                        {gameState.status === "won" && currentStageId === STAGES.length
                          ? "小公主安全脱困"
                          : `${gameState.player.crystals} / ${currentStage.crystalsNeeded}`}
                      </strong>
                    </div>
                    <div>
                      <span>{gameState.status === "won" && currentStageId === STAGES.length ? "终焉之敌" : "剩余生命"}</span>
                      <strong>
                        {gameState.status === "won" && currentStageId === STAGES.length
                          ? "暗影龙已被讨伐"
                          : `${Math.max(0, gameState.player.health)} / ${gameState.player.maxHealth}`}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="hero-actions result-actions">
                  {gameState.status === "won" && currentStageId < STAGES.length && (
                    <button className="menu-stone-button medium" onClick={() => showUpgradeScreen(currentStageId + 1)}>
                      下一关
                    </button>
                  )}
                  <button
                    className={`menu-stone-button medium ${gameState.status === "won" ? "secondary" : ""}`}
                    onClick={() => {
                      setGameState(createInitialState(currentStageId, selectedCharacter, passives));
                      setShowHint(true);
                      setTutorialStep(1);
                      setPauseMenuOpen(false);
                    }}
                  >
                    再来一次
                  </button>
                  <button className="ghost-button small-button result-exit" onClick={() => setScreen("stages")}>
                    返回选关
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
