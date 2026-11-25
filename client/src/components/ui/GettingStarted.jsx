import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, X } from 'lucide-react';
import ProgressBar from './ProgressBar';

const KEY = 'spendwise_onboarding_dismissed';

/** A short checklist for new accounts. It disappears once every step is done or the user dismisses it. */
export default function GettingStarted({ steps }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(KEY) === '1');
  const done = steps.filter(s => s.done).length;
  if (dismissed || done === steps.length) return null;

  return (
    <section className="panel onboard" aria-label="Getting started">
      <div className="panel-head">
        <div><h3>Get set up in a minute</h3><p>{done} of {steps.length} done. Each step unlocks more of SpendWise.</p></div>
        <button className="btn-icon" aria-label="Dismiss checklist" onClick={() => { localStorage.setItem(KEY, '1'); setDismissed(true); }}><X size={16} /></button>
      </div>
      <ProgressBar value={(done / steps.length) * 100} tone="gold" height={6} />
      <ul className="onboard-steps">
        {steps.map(step => (
          <li key={step.id} className={step.done ? 'is-done' : ''}>
            <i>{step.done && <Check size={13} />}</i>
            <span><strong>{step.title}</strong><small>{step.text}</small></span>
            {!step.done && (
              <button className="btn btn-secondary btn-sm" onClick={() => (step.to ? navigate(step.to) : step.run?.())}>
                {step.cta} <ArrowRight size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
