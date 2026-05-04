interface TutorialCalloutProps {
  hint?: string;
  onClose: () => void;
}

// Shown at stage start for non-tutorial stages (hint text)
export function TutorialCallout({ hint, onClose }: TutorialCalloutProps) {
  if (!hint) return null;
  return (
    <div className="tutorial-callout">
      <div>
        <strong>狩猎提示</strong>
        <p>{hint}</p>
        <span className="tutorial-callout-footnote">开始移动或攻击后会自动收起</span>
      </div>
      <button className="ghost-button small-button" onClick={onClose}>
        开始行动
      </button>
    </div>
  );
}

interface TutorialStepHUDProps {
  steps: string[];
  currentStep: number; // 1-based; 0 or > steps.length = hidden
}

// Shown during stage 1 gameplay — advances automatically
export function TutorialStepHUD({ steps, currentStep }: TutorialStepHUDProps) {
  if (currentStep < 1 || currentStep > steps.length) return null;
  const text = steps[currentStep - 1];
  const progress = currentStep / steps.length;

  return (
    <div className="tutorial-step-hud">
      <div className="tutorial-step-text">{text}</div>
      <div className="tutorial-step-bar">
        <div className="tutorial-step-fill" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
