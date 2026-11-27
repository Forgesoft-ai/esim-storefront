/**
 * Planes crossing the map: a city lights up, a plane flies an arc from it to
 * another and leaves a trail, the destination lights up as it lands, and the
 * whole flight fades. A few at a time, so the map reads as journeys being
 * made rather than as traffic.
 *
 * Each plane is a way in: point at one and it holds still and names where
 * it's going; click it and the store opens that destination.
 *
 * Drawn in the map's own coordinates, inside its zoom layer, so flights pan
 * and zoom with the land under them. Plain DOM rather than React state: the
 * frame loop moves a handful of nodes sixty times a second.
 */

export interface Hub {
  /** The country the city is in, which a click on its plane opens. */
  code: string;
  lon: number;
  lat: number;
}

/** Cities spread so every part of the world has a few to fly between. */
export const HUBS: readonly Hub[] = [
  { code: 'gb', lon: -0.13, lat: 51.51 }, // London
  { code: 'fr', lon: 2.35, lat: 48.86 }, // Paris
  { code: 'de', lon: 13.4, lat: 52.52 }, // Berlin
  { code: 'es', lon: -3.7, lat: 40.42 }, // Madrid
  { code: 'pt', lon: -9.14, lat: 38.72 }, // Lisbon
  { code: 'it', lon: 12.5, lat: 41.9 }, // Rome
  { code: 'tr', lon: 28.98, lat: 41.01 }, // Istanbul
  { code: 'eg', lon: 31.24, lat: 30.04 }, // Cairo
  { code: 'ae', lon: 55.27, lat: 25.2 }, // Dubai
  { code: 'ng', lon: 3.38, lat: 6.52 }, // Lagos
  { code: 'ke', lon: 36.82, lat: -1.29 }, // Nairobi
  { code: 'za', lon: 18.42, lat: -33.92 }, // Cape Town
  { code: 'in', lon: 77.21, lat: 28.61 }, // Delhi
  { code: 'th', lon: 100.5, lat: 13.76 }, // Bangkok
  { code: 'vn', lon: 106.66, lat: 10.82 }, // Ho Chi Minh City
  { code: 'id', lon: 115.22, lat: -8.65 }, // Bali
  { code: 'ph', lon: 120.98, lat: 14.6 }, // Manila
  { code: 'cn', lon: 121.47, lat: 31.23 }, // Shanghai
  { code: 'kr', lon: 126.98, lat: 37.57 }, // Seoul
  { code: 'jp', lon: 139.69, lat: 35.69 }, // Tokyo
  { code: 'au', lon: 151.21, lat: -33.87 }, // Sydney
  { code: 'nz', lon: 174.76, lat: -36.85 }, // Auckland
  { code: 'us', lon: -74.01, lat: 40.71 }, // New York City
  { code: 'ca', lon: -79.38, lat: 43.65 }, // Toronto
  { code: 'us', lon: -118.24, lat: 34.05 }, // Los Angeles
  { code: 'ca', lon: -123.12, lat: 49.28 }, // Vancouver
  { code: 'mx', lon: -99.13, lat: 19.43 }, // Mexico City
  { code: 'co', lon: -74.07, lat: 4.71 }, // Bogotá
  { code: 'pe', lon: -77.04, lat: -12.05 }, // Lima
  { code: 'br', lon: -43.17, lat: -22.91 }, // Rio de Janeiro
  { code: 'ar', lon: -58.38, lat: -34.6 }, // Buenos Aires
];

const MAX_FLIGHTS = 3;
/** The origin lights up this long before the plane leaves. */
const BOARDING = 700;
/** Time in the air, scaled by distance between these. */
const FLIGHT_MIN = 3200;
const FLIGHT_MAX = 5600;
/** The destination stays lit this long after landing, then it all fades. */
const ARRIVED = 1400;
const FADE_OUT = 700;
/** A new flight is considered this often, while there is room for one. */
const SPAWN_MIN = 1200;
const SPAWN_MAX = 2600;
/** In map units (the map is 960 wide): closer cities aren't worth a flight. */
const MIN_HOP = 80;
const MAX_HOP = 520;
/** Two lit cities closer than this would put their rings on each other. */
const CLEARANCE = 24;
/** West of this is the Americas, which get a flight whenever none is airborne. */
const AMERICAS_EAST = -30;

/** Material Design's "flight" glyph, nose up, in a 24-unit box. Apache 2.0. */
const PLANE =
  'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z';

interface Point {
  x: number;
  y: number;
}

type City = Hub & Point;

interface Flight {
  from: City;
  to: City;
  bend: Point;
  start: number;
  duration: number;
  /** While pointed at, the flight's clock stands still. */
  held: boolean;
  nodes: {
    group: SVGGElement;
    trail: SVGPathElement;
    from: Ping;
    to: Ping;
    plane: SVGGElement;
  };
}

interface Ping {
  ring: SVGCircleElement;
  dot: SVGCircleElement;
}

const SVG = 'http://www.w3.org/2000/svg';
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const random = (min: number, max: number) => min + Math.random() * (max - min);
const shuffle = <T>(items: T[]) =>
  items
    .map((item) => [Math.random(), item] as const)
    .sort(([a], [b]) => a - b)
    .map(([, item]) => item);

function along({ from, bend, to }: Flight, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * bend.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * bend.y + t * t * to.y,
  };
}

function heading({ from, bend, to }: Flight, t: number): number {
  const dx = 2 * (1 - t) * (bend.x - from.x) + 2 * t * (to.x - bend.x);
  const dy = 2 * (1 - t) * (bend.y - from.y) + 2 * t * (to.y - bend.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function element<K extends keyof SVGElementTagNameMap>(name: K, attributes: Record<string, string | number> = {}) {
  const node = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

export interface FlightOptions {
  /** Where a city sits on the map, or null where the projection has no place for it. */
  project: (lonLat: [number, number]) => [number, number] | null;
  /** The map's zoom, so planes and rings stay one size on screen. */
  scale: () => number;
  /** False while the visitor is busy with a destination: flights finish, none start. */
  enabled: () => boolean;
  /** Whether a country can be opened, so a plane only heads somewhere on sale. */
  sold: (code: string) => boolean;
  /** Pointing at a plane: where it's going and where on screen, or null on leaving it. */
  onHover: (hover: { code: string; x: number; y: number } | null) => void;
  /** A click on a plane. */
  onPick: (code: string) => void;
}

/** Starts the flights in `layer`; the returned function stops them and clears up. */
export function startFlights(layer: SVGGElement, options: FlightOptions): () => void {
  const { project, scale, enabled, sold, onHover, onPick } = options;
  const root = element('g', { class: 'flights' });
  layer.append(root);

  let flights: Flight[] = [];
  let nextSpawn = performance.now() + 600;
  let last = performance.now();
  let frame = 0;

  const cities = (): City[] =>
    HUBS.filter((hub) => sold(hub.code)).flatMap((hub) => {
      const point = project([hub.lon, hub.lat]);
      return point ? [{ ...hub, x: point[0], y: point[1] }] : [];
    });

  function ping(): Ping {
    return { ring: element('circle', { class: 'flight__ring' }), dot: element('circle', { class: 'flight__dot' }) };
  }

  function create(from: City, to: City, now: number): Flight {
    // Bowed square to the route, towards the north, the way a great circle looks.
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    let nx = -(to.y - from.y) / distance;
    let ny = (to.x - from.x) / distance;
    if (ny > 0) [nx, ny] = [-nx, -ny];
    const lift = distance * 0.22;
    const group = element('g', { class: 'flight' });
    const trail = element('path', { class: 'flight__trail' });
    const pings = { from: ping(), to: ping() };
    const plane = element('g', { class: 'flight__plane' });
    // A generous invisible target round a small glyph.
    plane.append(
      element('circle', { class: 'flight__hit', r: 16 }),
      element('path', { d: PLANE, transform: 'translate(-12 -12)' }),
    );
    group.append(trail, pings.from.ring, pings.from.dot, pings.to.ring, pings.to.dot, plane);
    root.append(group);

    const flight: Flight = {
      from,
      to,
      bend: { x: (from.x + to.x) / 2 + nx * lift, y: (from.y + to.y) / 2 + ny * lift },
      start: now,
      duration: FLIGHT_MIN + (FLIGHT_MAX - FLIGHT_MIN) * clamp01(distance / MAX_HOP),
      held: false,
      nodes: { group, trail, plane, ...pings },
    };
    plane.addEventListener('pointerenter', (e) => {
      flight.held = true;
      onHover({ code: to.code, x: e.clientX, y: e.clientY });
    });
    plane.addEventListener('pointerleave', () => {
      flight.held = false;
      onHover(null);
    });
    plane.addEventListener('pointerdown', (e) => e.stopPropagation());
    plane.addEventListener('click', (e) => {
      e.stopPropagation();
      onHover(null);
      onPick(to.code);
    });
    return flight;
  }

  function spawn(now: number) {
    if (!enabled() || flights.length >= MAX_FLIGHTS) return;
    const busy = flights.flatMap((flight) => [flight.from, flight.to]);
    const free = cities().filter((city) =>
      busy.every((other) => Math.hypot(city.x - other.x, city.y - other.y) > CLEARANCE),
    );
    // Most cities are east of the Atlantic; whenever none of the flights in
    // the air touches the Americas, the next one leaves from there.
    const american = (hub: Hub) => hub.lon < AMERICAS_EAST;
    const owed = !flights.some((flight) => american(flight.from) || american(flight.to));
    const fromAmericas = free.filter(american);
    for (const from of shuffle(owed && fromAmericas.length ? fromAmericas : free)) {
      const to = shuffle(free).find((city) => {
        const distance = Math.hypot(city.x - from.x, city.y - from.y);
        return city.code !== from.code && distance > MIN_HOP && distance < MAX_HOP;
      });
      if (to) {
        flights.push(create(from, to, now));
        return;
      }
    }
  }

  function drawPing({ ring, dot }: Ping, point: Point, age: number, alpha: number, k: number) {
    const grown = clamp01(age / 1100);
    ring.setAttribute('cx', String(point.x));
    ring.setAttribute('cy', String(point.y));
    ring.setAttribute('r', String((2 + grown * 10) / k));
    ring.style.opacity = String(age < 0 || grown >= 1 ? 0 : alpha * (1 - grown));
    dot.setAttribute('cx', String(point.x));
    dot.setAttribute('cy', String(point.y));
    dot.setAttribute('r', String(2.2 / k));
    dot.style.opacity = String(age < 0 ? 0 : alpha * smooth(clamp01(age / 250)));
  }

  function draw(flight: Flight, now: number, k: number) {
    const { trail, plane } = flight.nodes;
    const age = now - flight.start;
    const lands = BOARDING + flight.duration;
    const fade = 1 - smooth(clamp01((age - lands - ARRIVED) / FADE_OUT));
    const progress = smooth(clamp01((age - BOARDING) / flight.duration));

    if (progress > 0) {
      const steps = Math.max(2, Math.ceil(progress * 40));
      let d = `M${flight.from.x} ${flight.from.y}`;
      for (let i = 1; i <= steps; i += 1) {
        const point = along(flight, (i / steps) * progress);
        d += `L${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      }
      trail.setAttribute('d', d);
    }
    trail.style.opacity = String(fade);

    drawPing(flight.nodes.from, flight.from, age, fade, k);
    drawPing(flight.nodes.to, flight.to, age - lands, fade, k);

    const flying = age >= BOARDING && age < lands + 250;
    plane.style.display = flying ? '' : 'none';
    if (flying) {
      const point = along(flight, progress);
      const landing = clamp01((age - lands) / 250);
      const size = (0.62 - 0.12 * clamp01((progress - 0.8) / 0.2)) / k;
      plane.style.opacity = String((1 - landing) * smooth(clamp01((age - BOARDING) / 200)));
      plane.setAttribute(
        'transform',
        `translate(${point.x} ${point.y}) rotate(${heading(flight, Math.min(progress, 0.999)) + 90}) scale(${size})`,
      );
    }
  }

  function tick(now: number) {
    const elapsed = Math.min(now - last, 100);
    last = now;
    const k = scale();
    flights = flights.filter((flight) => {
      if (flight.held) flight.start += elapsed;
      const done = now - flight.start > BOARDING + flight.duration + ARRIVED + FADE_OUT;
      if (done) flight.nodes.group.remove();
      return !done;
    });
    if (now >= nextSpawn) {
      spawn(now);
      nextSpawn = now + random(SPAWN_MIN, SPAWN_MAX);
    }
    for (const flight of flights) draw(flight, now, k);
    frame = requestAnimationFrame(tick);
  }

  frame = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(frame);
    root.remove();
  };
}
