function tier(value) {
  if (value >= 70) return "good";
  if (value >= 45) return "mid";
  return "bad";
}

export default function ScoreBar({ label, value }) {
  return (
    <div className="score-row">
      <span>{label}</span>
      <div className="score-track">
        <div
          className={`score-fill ${tier(value)}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      <span className="score-value">{value.toFixed(0)}</span>
    </div>
  );
}
