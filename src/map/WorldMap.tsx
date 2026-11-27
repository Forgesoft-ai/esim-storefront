import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { select } from 'd3-selection';
import 'd3-transition';
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior } from 'd3-zoom';
import { memo, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { HeatIcon } from '../components/icons';
import { useI18n } from '../i18n/context';
import { startFlights } from './flights';
import { COUNTRY_FEATURES, DOT_COUNTRIES } from './geography';

/** No animation for anyone who asks for reduced motion. */
const motion = (ms: number) => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms);

/** A country's heatmap colour, over its usual fill; nothing sold keeps the usual grey. */
const heatFill = (color: string | undefined) => (color ? { fill: color } : undefined);

const WIDTH = 960;
const HEIGHT = 500;
const MAX_ZOOM = 24;

// Fitted to the land itself, so the map fills its box edge to edge.
const projection = geoNaturalEarth1().fitExtent(
  [
    [8, 8],
    [WIDTH - 8, HEIGHT - 8],
  ],
  { type: 'FeatureCollection', features: COUNTRY_FEATURES },
);
const path = geoPath(projection);

/** Shapes are drawn once: only their colours change. */
/**
 * Where to fly for a country: its largest landmass, so France frames France
 * rather than everything from French Guiana to Réunion, and the United States
 * its lower 48 rather than Alaska and Hawaii too.
 */
function mainBounds(f: (typeof COUNTRY_FEATURES)[number]) {
  if (f.geometry.type !== 'MultiPolygon') return path.bounds(f);
  const parts = f.geometry.coordinates.map((coordinates) => ({ type: 'Polygon' as const, coordinates }));
  const largest = parts.reduce((best, part) => (path.area(part) > path.area(best) ? part : best));
  return path.bounds(largest);
}

const SHAPES = COUNTRY_FEATURES.map((f) => ({
  code: f.code,
  name: f.properties.name,
  d: path(f) ?? '',
  bounds: mainBounds(f),
}));
const DOTS = Object.entries(DOT_COUNTRIES).map(([code, lonLat]) => ({ code, point: projection(lonLat) ?? [0, 0] }));

export type Coverage = 'own' | 'covered' | 'none';

interface Props {
  /** How each country is covered: its own plan, only by regional or global ones, or not at all. */
  coverage: (code: string) => Coverage;
  /** Countries to highlight: the selected country, or every country a selected plan covers. */
  highlighted: ReadonlySet<string>;
  /** The destination itself, drawn stronger than the rest of its plan's countries. */
  focused?: string;
  /** Changes when the map should fly to `highlighted`. */
  focusKey: string;
  /** Pixels at the map's end edge covered by the plan panel, kept clear when flying. */
  insetEnd?: number;
  label: (code: string) => string;
  onSelect: (code: string) => void;
  /** Each country's colour while the price heatmap is on; left out, it's off. */
  heat?: (code: string) => string | undefined;
  /** Turns the price heatmap on or off. */
  onToggleHeat?: () => void;
  /** The heatmap's key, shown beside the controls while it's on. */
  heatLegend?: ReactNode;
}

/**
 * The world, coloured by where Atli sells plans. Drag to pan, scroll or pinch
 * to zoom, click a country to see its plans.
 */
export const WorldMap = memo(function WorldMap({
  coverage,
  highlighted,
  focused,
  focusKey,
  insetEnd = 0,
  label,
  onSelect,
  heat,
  onToggleHeat,
  heatLegend,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const layerRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown>>(null);
  const { t } = useI18n();
  const [scale, setScale] = useState(1);
  const [hover, setHover] = useState<{ code: string; x: number; y: number; plane?: boolean } | null>(null);

  // What the flights read on every frame, without restarting them.
  const live = useRef({ scale, coverage, onSelect, label, busy: highlighted.size > 0 });
  live.current = { scale, coverage, onSelect, label, busy: highlighted.size > 0 };

  useEffect(() => {
    if (!layerRef.current || motion(1) === 0) return;
    return startFlights(layerRef.current, {
      project: (lonLat) => projection(lonLat),
      scale: () => live.current.scale,
      enabled: () => !live.current.busy && live.current.scale < 1.5 && !document.hidden,
      sold: (code) => live.current.coverage(code) !== 'none',
      onHover: (at) => setHover(at ? { ...at, plane: true } : null),
      onPick: (code) => live.current.onSelect(code),
      describe: (code) => live.current.label(code),
    });
  }, []);

  useEffect(() => {
    const svg = select(svgRef.current!);
    const behaviour = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, MAX_ZOOM])
      .translateExtent([
        [0, 0],
        [WIDTH, HEIGHT],
      ])
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        layerRef.current?.setAttribute('transform', event.transform.toString());
        setScale(event.transform.k);
      });
    zoomRef.current = behaviour;
    svg.call(behaviour).on('dblclick.zoom', null);
    return () => {
      svg.on('.zoom', null);
    };
  }, []);

  // Fly to whatever was just selected, framing all of it.
  useEffect(() => {
    const svg = svgRef.current;
    const behaviour = zoomRef.current;
    if (!svg || !behaviour) return;
    const boxes = [
      ...SHAPES.filter((s) => highlighted.has(s.code)).map((s) => s.bounds),
      ...DOTS.filter((d) => highlighted.has(d.code)).map(({ point: [x, y] }) => [
        [x - 6, y - 6],
        [x + 6, y + 6],
      ]),
    ];
    let transform = zoomIdentity;
    if (boxes.length) {
      const x0 = Math.min(...boxes.map((b) => b[0][0]));
      const y0 = Math.min(...boxes.map((b) => b[0][1]));
      const x1 = Math.max(...boxes.map((b) => b[1][0]));
      const y1 = Math.max(...boxes.map((b) => b[1][1]));
      // The part of the map not under the panel, in the map's own units.
      const rect = svg.getBoundingClientRect();
      const unit = Math.min(rect.width / WIDTH, rect.height / HEIGHT) || 1;
      const letterbox = (rect.width - WIDTH * unit) / 2;
      const inset = Math.max(0, (insetEnd - letterbox) / unit);
      const rtl = getComputedStyle(svg).direction === 'rtl';
      const left = rtl ? inset : 0;
      const right = WIDTH - (rtl ? 0 : inset);
      const k = Math.min(MAX_ZOOM / 2, 0.8 / Math.max((x1 - x0) / (right - left), (y1 - y0) / HEIGHT));
      transform = zoomIdentity
        .translate((left + right) / 2, HEIGHT / 2)
        .scale(Math.max(1, k))
        .translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    }
    select(svg).transition().duration(motion(750)).call(behaviour.transform, transform);
    // `highlighted` follows `focusKey`, so the key alone says when to fly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  const zoomBy = (factor: number) => {
    if (svgRef.current && zoomRef.current)
      select(svgRef.current).transition().duration(motion(300)).call(zoomRef.current.scaleBy, factor);
  };
  const reset = () => {
    if (svgRef.current && zoomRef.current)
      select(svgRef.current).transition().duration(motion(500)).call(zoomRef.current.transform, zoomIdentity);
  };

  const shapes = useMemo(
    () =>
      SHAPES.map(({ code, name, d }, i) => {
        const level = code ? coverage(code) : 'none';
        const selectable = level !== 'none';
        return (
          <path
            key={`${code || name}-${i}`}
            d={d}
            className={`country country--${level}${highlighted.has(code) ? ' is-highlighted' : ''}${code && code === focused ? ' is-focused' : ''}`}
            style={heat && code ? heatFill(heat(code)) : undefined}
            onClick={selectable ? () => onSelect(code) : undefined}
            onPointerMove={(e) => setHover({ code: code || name, x: e.clientX, y: e.clientY })}
            onPointerLeave={() => setHover(null)}
          />
        );
      }),
    [coverage, highlighted, focused, onSelect, heat],
  );

  return (
    <div
      className={`map${focused ? ' has-focus' : ''}${heat ? ' has-heat' : ''}${highlighted.size ? ' has-selection' : ''}`}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={t('map.label')}
      >
        <g ref={layerRef}>
          {shapes}
          {DOTS.map(({ code, point: [x, y] }) => {
            const level = coverage(code);
            return (
              <circle
                key={code}
                cx={x}
                cy={y}
                r={4 / Math.sqrt(scale)}
                className={`country country--${level} country--dot${highlighted.has(code) ? ' is-highlighted' : ''}${code === focused ? ' is-focused' : ''}`}
                style={heat ? heatFill(heat(code)) : undefined}
                onClick={level !== 'none' ? () => onSelect(code) : undefined}
                onPointerMove={(e) => setHover({ code, x: e.clientX, y: e.clientY })}
                onPointerLeave={() => setHover(null)}
              />
            );
          })}
        </g>
      </svg>

      <div className="map__controls">
        <button type="button" onClick={() => zoomBy(1.8)} aria-label={t('map.zoomIn')}>
          +
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.8)} aria-label={t('map.zoomOut')}>
          −
        </button>
        <button type="button" onClick={reset} aria-label={t('map.reset')}>
          ⟲
        </button>
        {onToggleHeat ? (
          <button
            type="button"
            className="map__heat-toggle"
            onClick={onToggleHeat}
            aria-pressed={Boolean(heat)}
            aria-label={t('map.heatmap')}
            title={t('map.heatmap')}
          >
            <HeatIcon width={18} height={18} />
          </button>
        ) : null}
      </div>
      {heat && heatLegend ? <div className="map__heat-legend">{heatLegend}</div> : null}

      {hover ? (
        <div className="map__tooltip" style={{ left: hover.x, top: hover.y }} aria-hidden>
          {hover.plane ? '✈ ' : ''}
          {label(hover.code)}
        </div>
      ) : null}
    </div>
  );
});
