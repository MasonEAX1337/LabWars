import { useEffect, useRef } from 'react';
export function Rules({ close }: { close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} onCancel={close} className="rules"><header><h2>Your lab. Your strategy.</h2><button onClick={close} aria-label="Close rules">×</button></header><p>Six rounds. Two to eight rival labs. Build useful AI and finish with the most Impact.</p>
    <ol><li><strong>Bid.</strong> Offer 0–3 credits for a bonus accelerator. Half the room, rounded up, can win. Winners pay their bids and get +1 Accuracy. Ties follow the displayed rotating priority.</li><li><strong>Build.</strong> Pick one of three briefs and a model. Invest in data, training, and evaluation. Targets and stretch goals change each round. Your live preview shows the exact result. Choices lock when submitted.</li><li><strong>Release.</strong> Commercial success earns 6 credits and 1 research. Open research earns 2 credits and 3 research.</li><li><strong>Reveal.</strong> Meeting every mandatory target earns 3 Impact. Meeting the stretch target earns another 1. A failed brief earns no reward.</li><li><strong>Upgrade.</strong> Spend 3 research on one permanent upgrade or save it. Upgrades apply next round. Distillation spreads to rivals one round after its buyer first uses it.</li></ol>
    <p>Start with 12 credits. Receive 5 more at the start of rounds 2–6. Your lab and resources carry forward. Unsubmitted builds time out for 0 points; unsubmitted bids become passes.</p>
    <p><strong>Winning:</strong> Highest Impact after round six. Ties go to completed briefs, then stretch targets, then a shared win. Maximum: 24 Impact.</p>
    <p className="muted">Ratings and economics are fictional. Evaluation & fixes includes correcting issues found during testing. Clearing browser data can lose your guest identity.</p><button className="primary" onClick={close}>Back to the lab</button></dialog>;
}
