import { ReactNode, useEffect, useRef } from "react";
import {
  ensureAudioReady,
  playComboSound,
  playDashSound,
  playEnemyDeathSound,
  playEnemyHitSound,
  playFireballHitSound,
  playFireballLaunchSound,
  playHitSound,
  playLoseSound,
  playPickupSound,
  playShieldBlockSound,
  playSwingSound,
  playWinSound,
  setMusicIntensity,
} from "../adventure/audio";
import { updateGame } from "../adventure/engine";
import { renderGame } from "../adventure/render";
import { VIEW_HEIGHT, VIEW_WIDTH } from "../adventure/stages";
import { GameState, InputState, StageDefinition } from "../adventure/types";

interface PixelGameCanvasProps {
  stage: StageDefinition;
  state: GameState;
  paused?: boolean;
  passives?: string[];
  onStateChange: (state: GameState) => void;
  onVictory: () => void;
  onDefeat: () => void;
  onPlayerAction?: () => void;
  onTutorialAdvance?: (step: number) => void;
  tutorialStep?: number;
  children?: ReactNode;
}

export function PixelGameCanvas({
  stage,
  state,
  paused = false,
  passives = [],
  onStateChange,
  onVictory,
  onDefeat,
  onPlayerAction,
  onTutorialAdvance,
  tutorialStep,
  children,
}: PixelGameCanvasProps) {
  const canvasRef        = useRef<HTMLCanvasElement | null>(null);
  const stateRef         = useRef(state);
  const tutorialStepRef  = useRef(tutorialStep ?? 0);
  const keysRef          = useRef<InputState>({ left: false, right: false, jump: false, jumpPressed: false, attack: false, dash: false, dashPressed: false });
  const previousKeysRef  = useRef({ jump: false, dash: false });
  const actionNotifiedRef = useRef(false);
  const previousRef      = useRef({
    attackTimer:     state.player.attackTimer,
    health:          state.player.health,
    crystals:        state.player.crystals,
    status:          state.status,
    enemyHealth:     state.enemies.reduce((s, e) => s + Math.max(e.health, 0), 0),
    enemyShieldHp:   state.enemies.reduce((s, e) => s + e.shieldHp, 0),
    projectileCount: state.projectiles.length,
    onGround:        state.player.onGround,
    attacked:        false,
    enemyAlive:      state.enemies.filter((e) => e.alive).length,
    comboCount:      0,
    dashTimer:       0,
  });

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { tutorialStepRef.current = tutorialStep ?? 0; }, [tutorialStep]);
  useEffect(() => {
    actionNotifiedRef.current = false;
  }, [stage.id, state.status]);

  useEffect(() => {
    previousRef.current = {
      attackTimer:     state.player.attackTimer,
      health:          state.player.health,
      crystals:        state.player.crystals,
      status:          state.status,
      enemyHealth:     state.enemies.reduce((s, e) => s + Math.max(e.health, 0), 0),
      enemyShieldHp:   state.enemies.reduce((s, e) => s + e.shieldHp, 0),
      projectileCount: state.projectiles.length,
      onGround:        state.player.onGround,
      attacked:        false,
      enemyAlive:      state.enemies.filter((e) => e.alive).length,
      comboCount:      state.combo.count,
      dashTimer:       state.player.dashTimer,
    };
  }, [stage.id, state.enemies, state.player.attackTimer, state.player.crystals,
      state.player.health, state.player.onGround, state.projectiles.length, state.status,
      state.combo.count, state.player.dashTimer]);

  useEffect(() => {
    const clearInput = () => {
      keysRef.current = { left: false, right: false, jump: false, jumpPressed: false, attack: false, dash: false, dashPressed: false };
      previousKeysRef.current = { jump: false, dash: false };
    };
    const handleKey = (pressed: boolean) => (e: KeyboardEvent) => {
      if (["ArrowLeft","ArrowRight","ArrowUp"," ","KeyA","KeyD","KeyW","KeyJ","KeyF","ShiftLeft","ShiftRight","KeyL"].includes(e.code)) {
        e.preventDefault();
      }
      if (pressed) ensureAudioReady();
      const k = keysRef.current;
      if (e.code === "ArrowLeft"  || e.code === "KeyA") k.left   = pressed;
      if (e.code === "ArrowRight" || e.code === "KeyD") k.right  = pressed;
      if (e.code === "ArrowUp"    || e.code === "KeyW" || e.code === "Space") k.jump = pressed;
      if (e.code === "KeyJ"       || e.code === "KeyF") k.attack = pressed;
      if (e.code === "ShiftLeft"  || e.code === "ShiftRight" || e.code === "KeyL") k.dash = pressed;
    };
    const down = handleKey(true);
    const up   = handleKey(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clearInput);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clearInput);
    };
  }, []);

  useEffect(() => {
    if (!paused) return;
    keysRef.current = { left: false, right: false, jump: false, jumpPressed: false, attack: false, dash: false, dashPressed: false };
    previousKeysRef.current = { jump: false, dash: false };
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let frameId  = 0;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 1 / 30);
      lastTime = time;

      if (paused) {
        renderGame(ctx, stage, stateRef.current);
        frameId = window.requestAnimationFrame(loop);
        return;
      }

      const keyState = keysRef.current;
      const inputState: InputState = {
        ...keyState,
        jumpPressed: keyState.jump && !previousKeysRef.current.jump,
        dashPressed: keyState.dash && !previousKeysRef.current.dash,
      };
      previousKeysRef.current.jump = keyState.jump;
      previousKeysRef.current.dash = keyState.dash;

      if (
        !actionNotifiedRef.current &&
        stateRef.current.status === "playing" &&
        (inputState.left || inputState.right || inputState.jump || inputState.attack)
      ) {
        actionNotifiedRef.current = true;
        onPlayerAction?.();
      }

      const nextState = updateGame(stateRef.current, stage, inputState, dt, passives);
      const prev      = previousRef.current;

      // ── Sound events ───────────────────────────────────────────────────────

      // Swing
      if (nextState.player.attackTimer > 0 && prev.attackTimer <= 0) {
        playSwingSound();
      }
      // Player hurt (hit or projectile)
      if (nextState.player.health < prev.health) {
        playHitSound();
      }
      // Enemy hit (health reduced)
      const nextEnemyHp = nextState.enemies.reduce((s, e) => s + Math.max(e.health, 0), 0);
      if (nextEnemyHp < prev.enemyHealth) {
        playEnemyHitSound();
      }
      // Enemy death
      const nextAlive = nextState.enemies.filter((e) => e.alive).length;
      if (nextAlive < prev.enemyAlive) {
        playEnemyDeathSound();
      }
      // Shield block (shield hp dropped but enemy health didn't)
      const nextShieldHp = nextState.enemies.reduce((s, e) => s + e.shieldHp, 0);
      if (nextShieldHp < prev.enemyShieldHp && nextEnemyHp === prev.enemyHealth) {
        playShieldBlockSound();
      }
      // Projectile launched
      if (nextState.projectiles.length > prev.projectileCount) {
        playFireballLaunchSound();
      }
      // Projectile hit player (health dropped AND projectile count shrank from non-zero)
      if (
        nextState.player.health < prev.health &&
        prev.projectileCount > 0 &&
        nextState.projectiles.length < prev.projectileCount
      ) {
        playFireballHitSound();
      }
      // Pickup
      if (nextState.player.crystals > prev.crystals) {
        playPickupSound();
      }
      // Dash
      if (nextState.player.dashTimer > 0 && prev.dashTimer <= 0) {
        playDashSound();
      }
      // Combo sound
      if (nextState.combo.count > prev.comboCount && nextState.combo.count >= 2) {
        playComboSound(nextState.combo.count);
      }
      // Win / Lose
      if (nextState.status === "won" && prev.status !== "won") {
        playWinSound();
        onVictory();
      }
      if (nextState.status === "lost" && prev.status !== "lost") {
        playLoseSound();
        onDefeat();
      }

      // ── Dynamic BGM intensity ────────────────────────────────────────────

      const totalEnemies = nextState.enemies.length;
      const aliveEnemies = nextAlive;
      if (totalEnemies > 0) {
        setMusicIntensity(aliveEnemies <= Math.ceil(totalEnemies / 2));
      }

      // ── Tutorial step advancement (stage 1 only) ───────────────────────────

      if (stage.tutorialSteps && onTutorialAdvance) {
        const step  = tutorialStepRef.current;
        const total = stage.tutorialSteps.length;
        if (step > 0 && step <= total) {
          let advanced = false;
          if (step === 1 && Math.abs(nextState.player.vx) > 8) {
            advanced = true;
          } else if (step === 2 && !nextState.player.onGround) {
            advanced = true;
          } else if (step === 3 && nextState.player.attackTimer > 0) {
            advanced = true;
          } else if (step === 4 && nextAlive < prev.enemyAlive) {
            advanced = true;
          } else if (step === 5 && nextState.player.crystals > 0) {
            advanced = true;
          }
          if (advanced) {
            tutorialStepRef.current = step + 1;
            onTutorialAdvance(step + 1);
          }
        }
      }

      previousRef.current = {
        attackTimer:     nextState.player.attackTimer,
        health:          nextState.player.health,
        crystals:        nextState.player.crystals,
        status:          nextState.status,
        enemyHealth:     nextEnemyHp,
        enemyShieldHp:   nextShieldHp,
        projectileCount: nextState.projectiles.length,
        onGround:        nextState.player.onGround,
        attacked:        nextState.player.attackTimer > 0,
        enemyAlive:      nextAlive,
        comboCount:      nextState.combo.count,
        dashTimer:       nextState.player.dashTimer,
      };

      stateRef.current = nextState;
      onStateChange(nextState);
      renderGame(ctx, stage, nextState);
      frameId = window.requestAnimationFrame(loop);
    };

    frameId = window.requestAnimationFrame(loop);
    return () => { window.cancelAnimationFrame(frameId); };
  }, [onDefeat, onPlayerAction, onStateChange, onVictory, onTutorialAdvance, paused, passives, stage]);

  return (
    <div className="canvas-wrapper">
      {children}
      <canvas ref={canvasRef} width={VIEW_WIDTH} height={VIEW_HEIGHT} className="pixel-canvas" />
    </div>
  );
}
