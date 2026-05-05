import { useEffect, useMemo, useState } from "react";
import { AdventureMenu } from "./components/AdventureMenu";
import { GameHUD } from "./components/GameHUD";
import { PixelGameCanvas } from "./components/PixelGameCanvas";
import { TutorialCallout, TutorialStepHUD } from "./components/TutorialCallout";
import { StageSelect } from "./components/StageSelect";
import { ensureAudioReady, setMusicEnabled, startBackgroundMusic, stopBackgroundMusic } from "./adventure/audio";
import { createInitialState } from "./adventure/engine";
import { getStageById, STAGES } from "./adventure/stages";
import { Screen, GameState, ProgressState } from "./adventure/types";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { assetUrl } from "./utils/assets";

const INITIAL_PROGRESS: ProgressState = { unlockedStage: STAGES.length, completed: [] };

export default function App() {
  const [screen, setScreen]               = useState<Screen>("menu");
  const [progress, setProgress]           = useLocalStorage<ProgressState>("twilight-hunter-progress", INITIAL_PROGRESS);
  const [musicEnabled, setMusicEnabledState] = useLocalStorage<boolean>("twilight-hunter-music-enabled", true);
  const [currentStageId, setCurrentStageId] = useState(1);
  const [gameState, setGameState]         = useState<GameState>(() => createInitialState(1));
  const [showHint, setShowHint]           = useState(true);
  const [tutorialStep, setTutorialStep]   = useState(1);
  const [pauseMenuOpen, setPauseMenuOpen] = useState(false);

  const currentStage = useMemo(() => getStageById(currentStageId), [currentStageId]);
  const nextStageToStart = useMemo(
    () => STAGES.find((stage) => !progress.completed.includes(stage.id))?.id ?? 1,
    [progress.completed],
  );

  useEffect(() => {
    setGameState(createInitialState(currentStageId));
    setShowHint(true);
    setTutorialStep(1);
    setPauseMenuOpen(false);
  }, [currentStageId]);

  useEffect(() => {
    const normalizedCompleted = progress.completed
      .filter((stageId) => stageId >= 1 && stageId <= STAGES.length)
      .sort((a, b) => a - b);

    if (
      progress.unlockedStage !== STAGES.length ||
      normalizedCompleted.length !== progress.completed.length ||
      normalizedCompleted.some((stageId, index) => stageId !== progress.completed[index])
    ) {
      setProgress({
        unlockedStage: STAGES.length,
        completed: normalizedCompleted,
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
    setGameState(createInitialState(stageId));
    setShowHint(true);
    setTutorialStep(1);
    setPauseMenuOpen(false);
    setScreen("game");
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
      });
    }
  };

  const enemiesLeft = gameState.enemies.filter((e) => e.alive).length;
  const isTutorialStage = Boolean(currentStage.tutorialSteps);
  const canPause = screen === "game" && gameState.status === "playing";

  return (
    <main
      className={`app-shell ${
        screen === "menu" || screen === "stages"
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
          onStart={() => {
            ensureAudioReady();
            void startBackgroundMusic("game");
            openStage(nextStageToStart);
          }}
          onStages={() => {
            ensureAudioReady();
            void startBackgroundMusic("menu");
            setScreen("stages");
          }}
          onToggleMusic={() => setMusicEnabledState((value) => !value)}
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
            openStage(stageId);
          }}
        />
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
            onStateChange={setGameState}
            onVictory={markStageComplete}
            onDefeat={() => undefined}
            onPlayerAction={() => setShowHint(false)}
            tutorialStep={isTutorialStage ? tutorialStep : undefined}
            onTutorialAdvance={isTutorialStage ? setTutorialStep : undefined}
          >
            <div className="hud-corner hud-top-center">
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
                  <div className="pause-tip">按 `Esc` 也可以继续战斗</div>
                </div>
                <div className="hero-actions result-actions">
                  <button className="menu-stone-button medium" onClick={() => setPauseMenuOpen(false)}>
                    继续战斗
                  </button>
                  <button
                    className="menu-stone-button medium secondary"
                    onClick={() => {
                      setGameState(createInitialState(currentStageId));
                      setShowHint(true);
                      setTutorialStep(1);
                      setPauseMenuOpen(false);
                    }}
                  >
                    重新挑战
                  </button>
                  <button
                    className="ghost-button small-button result-exit"
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
                    <button className="menu-stone-button medium" onClick={() => openStage(currentStageId + 1)}>
                      下一关
                    </button>
                  )}
                  <button
                    className={`menu-stone-button medium ${gameState.status === "won" ? "secondary" : ""}`}
                    onClick={() => {
                      setGameState(createInitialState(currentStageId));
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
