import './HomePage.css';

interface HomePageProps {
  onGetStarted: () => void;
  onTryNow: () => void;
}

// Mock nutrition label for hero visual
function MockLabel() {
  return (
    <div className="mock-label">
      <div className="mock-label-title">Nutrition Facts</div>
      <div className="mock-label-servings">8 servings per container</div>
      <div className="mock-label-serving-size">
        <span>Serving size</span>
        <span>2 cookies (30g)</span>
      </div>
      <div className="mock-label-calories-bar">
        <div>
          <div className="mock-label-amount-per">Amount per serving</div>
          <div className="mock-label-calories-label">Calories</div>
        </div>
        <div className="mock-label-calories-value">140</div>
      </div>
      <div className="mock-label-divider mock-label-divider--thin" />
      <div className="mock-label-dv-header">% Daily Value*</div>
      {[
        { name: 'Total Fat', val: '6g', dv: '8%' },
        { name: 'Saturated Fat', val: '2g', dv: '10%', indent: true },
        { name: 'Trans Fat', val: '0g', dv: '', indent: true },
        { name: 'Cholesterol', val: '10mg', dv: '3%' },
        { name: 'Sodium', val: '110mg', dv: '5%' },
        { name: 'Total Carbohydrate', val: '20g', dv: '7%' },
        { name: 'Dietary Fiber', val: '1g', dv: '4%', indent: true },
        { name: 'Total Sugars', val: '9g', dv: '', indent: true },
        { name: 'Protein', val: '2g', dv: '' },
      ].map((row) => (
        <div key={row.name} className={`mock-label-row${row.indent ? ' mock-label-row--indent' : ''}`}>
          <span className="mock-label-row-name">{row.name}</span>
          <span className="mock-label-row-right">
            <span>{row.val}</span>
            {row.dv && <span className="mock-label-row-dv">{row.dv}</span>}
          </span>
        </div>
      ))}
      <div className="mock-label-divider mock-label-divider--thick" />
      <div className="mock-label-micronutrients">
        <span>Vitamin D 0mcg <strong>0%</strong></span>
        <span>Calcium 20mg <strong>2%</strong></span>
        <span>Iron 1mg <strong>6%</strong></span>
        <span>Potassium 70mg <strong>2%</strong></span>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: '🧠',
    title: 'Smart Recipe Parsing',
    description:
      'Paste any recipe in plain English. Our AI (GPT-4o-mini) extracts and normalizes every ingredient — no special formatting needed.',
  },
  {
    icon: '🔬',
    title: 'USDA-Verified Data',
    description:
      'Nutritional values sourced directly from the USDA FoodData Central database, the same source used by nutrition professionals.',
  },
  {
    icon: '📋',
    title: 'FDA-Compliant Labels',
    description:
      'All rounding follows 21 CFR 101.9 regulations. All 14 required nutrients are included, formatted exactly as required.',
  },
  {
    icon: '⬇️',
    title: 'Download as PNG',
    description:
      'Export your label as a high-quality image ready to print, attach to packaging, or upload to your website.',
  },
  {
    icon: '💾',
    title: 'Save & Manage Recipes',
    description:
      'Create a free account to save, edit, and manage all your recipes in one place. Access them anytime.',
  },
  {
    icon: '🆓',
    title: 'Completely Free',
    description:
      'No subscriptions, no lab fees, no hidden costs. Built as an open, accessible tool for small food businesses.',
  },
];

const STEPS = [
  {
    num: '1',
    title: 'Enter Your Recipe',
    description:
      'Paste your recipe text, specify the number of servings and serving size. No special formatting required.',
    icon: '📝',
  },
  {
    num: '2',
    title: 'Review Ingredients',
    description:
      'Verify AI-matched USDA food items. Swap alternatives if the default match doesn\'t fit your ingredient.',
    icon: '🔍',
  },
  {
    num: '3',
    title: 'Download Your Label',
    description:
      'Get a print-ready FDA-formatted nutrition facts label. Save it to your account or download immediately.',
    icon: '🏷️',
  },
];

// Example recipe cards shown in the examples section
// Replace these placeholder descriptions with actual screenshots when available
const EXAMPLES = [
  { title: 'Chocolate Chip Cookies', servings: '24 cookies', desc: 'Classic bakery-style cookie' },
  { title: 'Banana Protein Smoothie', servings: '1 serving (400g)', desc: 'Meal prep shake' },
  { title: 'Homemade Granola', servings: '12 servings', desc: 'Farmers market granola' },
];

export default function HomePage({ onGetStarted, onTryNow }: HomePageProps) {
  return (
    <div className="home-page">

      {/* ── Hero ── */}
      <section className="home-hero">
        <div className="home-hero-text">
          <div className="home-hero-badge">CIS4914 Senior Design · University of Florida</div>
          <h1 className="home-hero-heading">
            Professional nutrition labels,{' '}
            <span className="home-hero-accent">in minutes.</span>
          </h1>
          <p className="home-hero-subheading">
            Built for farmers market vendors, cottage food producers, and meal prep
            entrepreneurs who need FDA-compliant nutrition labels without expensive
            lab testing.
          </p>
          <div className="home-hero-actions">
            <button type="button" className="btn-home-primary" onClick={onGetStarted}>
              Create Free Account
            </button>
            <button type="button" className="btn-home-secondary" onClick={onTryNow}>
              Try It Now →
            </button>
          </div>
          <p className="home-hero-note">
            No credit card required. Powered by USDA FoodData Central + OpenAI.
          </p>
        </div>
        <div className="home-hero-visual">
          <div className="home-hero-visual-label">
            <MockLabel />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="home-section home-features">
        <div className="home-section-inner">
          <h2 className="home-section-title">Everything you need to label your food</h2>
          <p className="home-section-subtitle">
            From raw recipe text to a downloadable FDA-formatted label — all in one place.
          </p>
          <div className="home-features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="home-feature-card">
                <div className="home-feature-icon">{f.icon}</div>
                <h3 className="home-feature-title">{f.title}</h3>
                <p className="home-feature-desc">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="home-section home-how">
        <div className="home-section-inner">
          <h2 className="home-section-title">How it works</h2>
          <p className="home-section-subtitle">Three steps from recipe to label.</p>
          <div className="home-steps">
            {STEPS.map((s, i) => (
              <div key={s.num} className="home-step">
                <div className="home-step-num">{s.num}</div>
                <div className="home-step-icon">{s.icon}</div>
                <h3 className="home-step-title">{s.title}</h3>
                <p className="home-step-desc">{s.description}</p>
                {i < STEPS.length - 1 && <div className="home-step-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Example Labels ── */}
      <section className="home-section home-examples">
        <div className="home-section-inner">
          <h2 className="home-section-title">See it in action</h2>
          <p className="home-section-subtitle">
            Labels generated in seconds from plain-text recipes.
          </p>
          <div className="home-examples-grid">
            {EXAMPLES.map((ex) => (
              <div key={ex.title} className="home-example-card">
                {/* Replace the placeholder below with an actual label screenshot PNG */}
                <div className="home-example-img-placeholder">
                  <img src="/logo.png" alt={ex.title} className="home-example-logo-placeholder" />
                  <span className="home-example-placeholder-note">Replace with label screenshot</span>
                </div>
                <div className="home-example-info">
                  <h4 className="home-example-title">{ex.title}</h4>
                  <p className="home-example-meta">{ex.servings} · {ex.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="home-examples-cta">
            <button type="button" className="btn-home-primary" onClick={onTryNow}>
              Generate Your Own Label
            </button>
          </div>
        </div>
      </section>

      {/* ── About the Project ── */}
      <section className="home-section home-about">
        <div className="home-section-inner home-about-inner">
          <div className="home-about-text">
            <div className="home-hero-badge">About</div>
            <h2 className="home-section-title home-section-title--left">
              A senior design project with real-world impact
            </h2>
            <p className="home-about-desc">
              We noticed that many small food producers — farmers market vendors, cottage food 
              businesses, meal prep services — have no practical way to get accurate nutrition 
              labels. Lab testing costs hundreds of dollars. Manual calculation requires FDA 
              expertise most small producers don't have.
            </p>
            <p className="home-about-desc">
              Our solution: accept a recipe in plain text, use an LLM to extract and normalize
              ingredients, query the USDA FoodData Central API for verified nutrition data, apply
              FDA-mandated rounding rules (21 CFR 101.9), and generate a ready-to-use label.
              Free. Accurate. Accessible.
            </p>
            <div className="home-about-tech">
              <span className="home-tech-badge">React + TypeScript</span>
              <span className="home-tech-badge">Python FastAPI</span>
              <span className="home-tech-badge">USDA FoodData Central</span>
              <span className="home-tech-badge">OpenAI GPT-4o-mini</span>
              <span className="home-tech-badge">PostgreSQL</span>
            </div>
          </div>
          <div className="home-about-team">
            <h3 className="home-about-team-title">Team Yikes</h3>
            <div className="home-team-list">
              <div className="home-team-member">
                <div className="home-team-avatar">SB</div>
                <div>
                  <div className="home-team-name">Syed Balkhi</div>
                  <div className="home-team-role">Team Lead · Backend Dev</div>
                </div>
              </div>
              <div className="home-team-member">
                <div className="home-team-avatar">JP</div>
                <div>
                  <div className="home-team-name">Jehan Peralta</div>
                  <div className="home-team-role">Scrum Master · Frontend Dev</div>
                </div>
              </div>
              <div className="home-team-member">
                <div className="home-team-avatar">TR</div>
                <div>
                  <div className="home-team-name">Taran Ramu</div>
                  <div className="home-team-role">Full-Stack Dev</div>
                </div>
              </div>
            </div>
            <div className="home-team-advisor">
              <span className="home-team-advisor-label">Advisor:</span> Rong Zhang
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="home-section home-cta-section">
        <div className="home-section-inner home-cta-inner">
          <h2 className="home-cta-title">Ready to label your recipes?</h2>
          <p className="home-cta-subtitle">
            Free forever. No lab required. Generate your first label in under 2 minutes.
          </p>
          <div className="home-hero-actions home-cta-actions">
            <button type="button" className="btn-home-primary btn-home-primary--large" onClick={onGetStarted}>
              Create Free Account
            </button>
            <button type="button" className="btn-home-secondary" onClick={onTryNow}>
              Try Without an Account →
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="home-footer">
        <div className="home-footer-inner">
          <div className="home-footer-brand">
            <img src="/logo.png" alt="Nutrition Label Pal" className="home-footer-logo" />
            <span className="home-footer-name">Nutrition Label Pal</span>
          </div>
          <div className="home-footer-links">
            <span>CIS4914 Senior Design · Spring 2026</span>
            <span>University of Florida</span>
            <a
              href="https://github.com/Zain-Balkhi/Nutrition-Label-Pal"
              target="_blank"
              rel="noopener noreferrer"
              className="home-footer-link"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
