import { HEAT_COLORS } from './heat';

interface Props {
  title: string;
  min: string;
  max: string;
  cheaper: string;
  dearer: string;
}

/** The heatmap's key: its seven colours, from the cheapest lowest price to the dearest. */
export function HeatLegend({ title, min, max, cheaper, dearer }: Props) {
  return (
    <figure className="heat-legend" aria-label={`${title}: ${cheaper} ${min}, ${dearer} ${max}`}>
      <figcaption>{title}</figcaption>
      <div className="heat-legend__bar" aria-hidden>
        {HEAT_COLORS.map((color) => (
          <span key={color} style={{ background: color }} />
        ))}
      </div>
      <div className="heat-legend__ends" aria-hidden>
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </figure>
  );
}
