export default function MatchBadge({ score }) {
  const config = {
    high: {
      label: 'High Match',
      emoji: '\uD83D\uDD34',
      classes: 'bg-red-100 text-red-800 border border-red-200',
    },
    possible: {
      label: 'Possible Match',
      emoji: '\uD83D\uDFE1',
      classes: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    },
    unlikely: {
      label: 'Unlikely',
      emoji: '\u26AA',
      classes: 'bg-gray-100 text-gray-600 border border-gray-200',
    },
  };

  const c = config[score] || config.unlikely;

  return (
    <span className={`badge ${c.classes}`}>
      <span className="mr-1">{c.emoji}</span>
      {c.label}
    </span>
  );
}
