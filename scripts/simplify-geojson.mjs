import fs from "node:fs";
import path from "node:path";

const files = process.argv.slice(2);
const tolerance = Number(process.env.MAP_TOLERANCE || 0.0012);
const squaredTolerance = tolerance * tolerance;

function squaredSegmentDistance(point, start, end) {
  let x = start[0];
  let y = start[1];
  let dx = end[0] - x;
  let dy = end[1] - y;

  if (dx !== 0 || dy !== 0) {
    const amount = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);
    if (amount > 1) {
      x = end[0];
      y = end[1];
    } else if (amount > 0) {
      x += dx * amount;
      y += dy * amount;
    }
  }

  dx = point[0] - x;
  dy = point[1] - y;
  return dx * dx + dy * dy;
}

function simplifyLine(points) {
  if (points.length <= 2) return points;
  const markers = new Uint8Array(points.length);
  const stack = [[0, points.length - 1]];
  markers[0] = 1;
  markers[points.length - 1] = 1;

  while (stack.length) {
    const [first, last] = stack.pop();
    let furthest = squaredTolerance;
    let index = 0;
    for (let current = first + 1; current < last; current += 1) {
      const distance = squaredSegmentDistance(points[current], points[first], points[last]);
      if (distance > furthest) {
        index = current;
        furthest = distance;
      }
    }
    if (index) {
      markers[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }

  return points.filter((_, index) => markers[index]);
}

function roundPoint(point) {
  return [Number(point[0].toFixed(5)), Number(point[1].toFixed(5))];
}

function simplifyRing(ring) {
  if (ring.length < 8) return ring.map(roundPoint);
  const open = ring.slice(0, -1);
  let split = 1;
  let furthest = -1;
  for (let index = 1; index < open.length; index += 1) {
    const dx = open[index][0] - open[0][0];
    const dy = open[index][1] - open[0][1];
    const distance = dx * dx + dy * dy;
    if (distance > furthest) {
      split = index;
      furthest = distance;
    }
  }

  const firstHalf = simplifyLine(open.slice(0, split + 1));
  const secondHalf = simplifyLine([...open.slice(split), open[0]]);
  const simplified = [...firstHalf.slice(0, -1), ...secondHalf].map(roundPoint);
  return simplified.length >= 4 ? simplified : ring.map(roundPoint);
}

function simplifyGeometry(geometry) {
  if (geometry.type === "Polygon") {
    geometry.coordinates = geometry.coordinates.map(simplifyRing);
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates = geometry.coordinates.map((polygon) => polygon.map(simplifyRing));
  }
}

for (const file of files) {
  const absolute = path.resolve(file);
  const geojson = JSON.parse(fs.readFileSync(absolute, "utf8"));
  for (const feature of geojson.features) simplifyGeometry(feature.geometry);
  fs.writeFileSync(absolute, JSON.stringify(geojson));
}
