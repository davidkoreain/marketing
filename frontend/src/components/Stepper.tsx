import React from "react";

interface StepperProps {
  currentStage: "input" | "post" | "image" | "video" | "publish" | "done";
  maxReachedStage?: "input" | "post" | "image" | "video" | "publish" | "done";
  onStepClick?: (stage: string) => void;
}

const STEPS = [
  { id: "input", label: "정보 입력" },
  { id: "post", label: "홍보글" },
  { id: "image", label: "이미지" },
  { id: "video", label: "영상" },
  { id: "publish", label: "배포" },
  { id: "done", label: "완료" },
];

export default function Stepper({ currentStage, maxReachedStage, onStepClick }: StepperProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === currentStage);
  // 실제 진행 최대치 — 미지정 시 currentStage 기준
  const maxIndex = STEPS.findIndex((step) => step.id === (maxReachedStage ?? currentStage));
  const lineWidthPercent = maxIndex <= 0 ? 0 : (maxIndex / (STEPS.length - 1)) * 100;

  return (
    <div className="stepper-container">
      <div className="stepper-line-bg" />
      <div
        className="stepper-line-active"
        style={{ width: `${lineWidthPercent}%` }}
      />

      {STEPS.map((step, idx) => {
        const isActive = step.id === currentStage;
        // maxIndex 기준으로 방문 여부 판단 (뒤로 가도 앞 단계들 체크 유지)
        const isVisited = idx <= maxIndex;
        const isCompleted = isVisited && !isActive;
        const isNavigable = isVisited && onStepClick;

        return (
          <div
            key={step.id}
            className={`stepper-step ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
            onClick={() => isNavigable && onStepClick(step.id)}
            style={{
              cursor: isNavigable ? "pointer" : "default",
              transition: "opacity 0.15s",
            }}
            title={isNavigable && !isActive ? `${step.label} 단계로 이동` : undefined}
          >
            <div
              className="stepper-node"
              style={isCompleted ? { boxShadow: "0 0 0 2px var(--color-primary)" } : undefined}
            >
              {isCompleted ? "✓" : idx + 1}
            </div>
            <div className="stepper-label">{step.label}</div>
          </div>
        );
      })}
    </div>
  );
}
