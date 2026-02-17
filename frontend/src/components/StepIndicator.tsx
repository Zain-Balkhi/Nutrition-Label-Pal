interface StepIndicatorProps {
    currentStep: 1 | 2 | 3;
  }
  
  export default function StepIndicator({ currentStep }: StepIndicatorProps) {
    const steps = [
      { num: 1, label: 'Step 1' },
      { num: 2, label: 'Step 2' },
      { num: 3, label: 'Step 3' },
    ];
  
    return (
      <div className="step-indicator">
        {steps.map((step, i) => (
          <div key={step.num} className="step-wrapper">
            <div
              className={`step-pill ${
                currentStep === step.num
                  ? 'active'
                  : currentStep > step.num
                    ? 'completed'
                    : ''
              }`}
            >
              {step.label}
            </div>
            {i < steps.length - 1 && <span className="step-arrow">→</span>}
          </div>
        ))}
      </div>
    );
  }