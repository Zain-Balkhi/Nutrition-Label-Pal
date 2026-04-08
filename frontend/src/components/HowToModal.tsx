interface HowToModalProps {
  onClose: () => void;
}

export default function HowToModal({ onClose }: HowToModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card howto-modal" onClick={e => e.stopPropagation()}>
        <div className="howto-header">
          <h2 className="modal-title">How It Works</h2>
          <button type="button" className="howto-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="howto-steps">
          <div className="howto-step">
            <span className="howto-step-num">1</span>
            <div>
              <strong>Paste your recipe</strong>
              <p>Copy and paste the ingredient list from any recipe. Just the ingredients — no instructions needed.</p>
            </div>
          </div>
          <div className="howto-step">
            <span className="howto-step-num">2</span>
            <div>
              <strong>Review ingredient matches</strong>
              <p>We match each ingredient to the USDA nutrition database. You can adjust or exclude any ingredient.</p>
            </div>
          </div>
          <div className="howto-step">
            <span className="howto-step-num">3</span>
            <div>
              <strong>Get your nutrition label</strong>
              <p>View your FDA-compliant label in 4 formats. Edit, download as PDF, or save to your account.</p>
            </div>
          </div>
        </div>

        <div className="howto-example">
          <h3 className="howto-example-title">Example Input</h3>
          <pre className="howto-example-text">{`1 1/2 cups all purpose flour
1 cup whole milk
2 eggs
2 tbsp butter, melted
1 tbsp sugar
1 tsp baking powder
1/2 tsp salt`}</pre>
          <p className="howto-example-note">
            Tip: Include quantities and units for the most accurate results. Serving info can be entered separately below the text area.
          </p>
        </div>

        <button type="button" className="btn-create howto-got-it" onClick={onClose}>
          Got it!
        </button>
      </div>
    </div>
  );
}
