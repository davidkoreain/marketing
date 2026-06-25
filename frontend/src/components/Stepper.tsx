import React from "react";

interface StepperProps {
  currentStage: "input" | "post" | "image" | "video" | "publish" | "done";
}

const STEPS = [
  { id: "input", label: "정보 입력" },
  { id: "post", label: "홍보글" },
  { id: "image", label: "이미지" },
  { id: "video", label: "영상" },
  { id: "publish", label: "배포" },
  { id: "done", label: "완료" },
];

export default function Stepper({ currentStage }: StepperProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === currentStage);
  
  // Calculate active line width percentage
  const lineWidthPercent = currentIndex <= 0 ? 0 : (currentIndex / (STEPS.length - 1)) * 100;

  return (
    <div className="stepper-container">
      <div className="stepper-line-bg" />
      <div 
        className="stepper-line-active" 
        style={{ width: `${lineWidthPercent}%` }}
      />
      
      {STEPS.map((step, idx) => {
        const isActive = step.id === currentStage;
        const isCompleted = idx < currentIndex;
        
        return (
          <div 
            key={step.id} 
            className={`stepper-step ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
          >
            <div className="stepper-node">
              {isCompleted ? "✓" : idx + 1}
            </div>
            <div className="stepper-label">{step.label}</div>
          </div>
        );
      })}
    </div>
  );
}
