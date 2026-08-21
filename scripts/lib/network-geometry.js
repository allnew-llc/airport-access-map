const ROUTE_IDS = Object.freeze([
  "jr-sobu",
  "jr-narita",
  "keisei-main",
  "hokuso",
  "sky-access",
  "e51",
  "c4",
  "route-51",
  "route-295"
]);

const ROUTE_CONFIG = Object.freeze({
  "jr-sobu": { label: "JR総武線（東京―佐倉）", category: "railway", operator: "jr", accessRoute: "jr", order: 10, labelCoordinate: [139.985, 35.69] },
  "jr-narita": { label: "JR成田線（佐倉―空港）", category: "railway", operator: "jr", accessRoute: "jr", order: 20, labelCoordinate: [140.295, 35.77] },
  "keisei-main": { label: "京成本線", category: "railway", operator: "keisei", accessRoute: "keisei-main", order: 30, labelCoordinate: [140.145, 35.71] },
  hokuso: { label: "北総線区間", category: "railway", operator: "hokuso", accessRoute: "sky-access", order: 40, labelCoordinate: [140.045, 35.785] },
  "sky-access": { label: "成田スカイアクセス", category: "railway", operator: "access", accessRoute: "sky-access", order: 50, labelCoordinate: [140.285, 35.815] },
  e51: { label: "東関東道 E51", category: "road", operator: "e51", order: 60 },
  c4: { label: "圏央道 C4", category: "road", operator: "c4", order: 70 },
  "route-51": { label: "国道51号", category: "road", operator: "route51", order: 80 },
  "route-295": { label: "国道295号", category: "road", operator: "route295", order: 90 }
});

// Only the portions used by airport-bound services are published. The source
// Overpass query returns every named JR segment inside the large regional bbox,
// including the Choshi and Abiko branches of the Narita Line.
const RAIL_ACCESS_CORRIDORS = Object.freeze({
  "jr-sobu": {
    toleranceKm: 0.9,
    path: [[139.7671, 35.6812], [139.8143, 35.6967], [139.9081, 35.7295], [139.9852, 35.7018], [140.0237, 35.6916], [140.1034, 35.6911], [140.1135, 35.6134], [140.1261, 35.6129], [140.2259, 35.7097]]
  },
  "jr-narita": {
    toleranceKm: 0.9,
    path: [[140.2259, 35.7097], [140.2533, 35.7288], [140.2938, 35.7602], [140.3131, 35.7770], [140.3365, 35.7750], [140.3580, 35.7716], [140.3877, 35.7730], [140.3863, 35.7720]]
  }
});

function pointSegmentDistanceKm(point, start, end) {
  const meanLatitude = (point[1] + start[1] + end[1]) / 3 * Math.PI / 180;
  const longitudeScale = Math.cos(meanLatitude);
  const px = (point[0] - start[0]) * longitudeScale;
  const py = point[1] - start[1];
  const dx = (end[0] - start[0]) * longitudeScale;
  const dy = end[1] - start[1];
  const denominator = dx * dx + dy * dy;
  const progress = denominator === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / denominator));
  return Math.hypot(px - dx * progress, py - dy * progress) * 111.32;
}

function coordinateInRailAccessCorridor(routeId, coordinate) {
  const corridor = RAIL_ACCESS_CORRIDORS[routeId];
  if (!corridor) return true;
  for (let index = 1; index < corridor.path.length; index += 1) {
    if (pointSegmentDistanceKm(coordinate, corridor.path[index - 1], corridor.path[index]) <= corridor.toleranceKm) return true;
  }
  return false;
}

function accessSegmentsForRoute(routeId, coordinates) {
  if (!RAIL_ACCESS_CORRIDORS[routeId]) return [coordinates];
  const segments = [];
  let current = [];
  for (const coordinate of coordinates) {
    if (coordinateInRailAccessCorridor(routeId, coordinate)) {
      current.push(coordinate);
      continue;
    }
    if (current.length >= 2) segments.push(current);
    current = [];
  }
  if (current.length >= 2) segments.push(current);
  return segments;
}

function routeIdForElement(element) {
  const name = element?.tags?.name ?? "";
  const ref = element?.tags?.ref ?? "";
  if (name === "総武本線") return "jr-sobu";
  if (["成田線", "成田線（空港支線）", "JR成田線（空港支線）"].includes(name)) return "jr-narita";
  if (name === "京成本線") return "keisei-main";
  if (["北総線", "北総線・京成成田空港線"].includes(name)) return "hokuso";
  if (name === "京成成田空港線") return "sky-access";
  if (name === "東関東自動車道") return "e51";
  if (name.startsWith("首都圏中央連絡自動車道")) return "c4";
  if (name === "国道51号") return "route-51";
  if (name === "国道295号" || /(^|;)\s*295(;|$)/.test(ref)) return "route-295";
  return undefined;
}

function coordinatesForElement(element) {
  if (!Array.isArray(element?.geometry)) return [];
  return element.geometry
    .map((node) => [Number(node.lon), Number(node.lat)])
    .filter(([longitude, latitude]) => Number.isFinite(longitude) && Number.isFinite(latitude));
}

function lineLengthSquared(coordinates) {
  let total = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    const [previousLongitude, previousLatitude] = coordinates[index - 1];
    const [longitude, latitude] = coordinates[index];
    total += (longitude - previousLongitude) ** 2 + (latitude - previousLatitude) ** 2;
  }
  return total;
}

function midpoint(coordinates) {
  return coordinates[Math.floor(coordinates.length / 2)];
}

export function buildNetworkFeatureCollection(overpassPayload, metadata = {}) {
  const elements = Array.isArray(overpassPayload?.elements) ? overpassPayload.elements : [];
  const routeFeatures = [];
  const longestByRoute = new Map();

  for (const element of elements) {
    const routeId = routeIdForElement(element);
    const coordinates = coordinatesForElement(element);
    if (!routeId || coordinates.length < 2) continue;
    const config = ROUTE_CONFIG[routeId];
    const accessSegments = accessSegmentsForRoute(routeId, coordinates);
    for (const [segmentIndex, segmentCoordinates] of accessSegments.entries()) {
      const length = lineLengthSquared(segmentCoordinates);
      const feature = {
        type: "Feature",
        geometry: { type: "LineString", coordinates: segmentCoordinates },
        properties: {
          id: `osm-way-${element.id}${accessSegments.length > 1 ? `-${segmentIndex + 1}` : ""}`,
          osm_way_id: element.id,
          kind: "route",
          route_id: routeId,
          route_label: config.label,
          access_route: config.accessRoute ?? routeId,
          access_scope: config.category === "railway" ? "airport_access_corridor" : "regional_reference",
          category: config.category,
          operator: config.operator,
          order: config.order,
          source_scope: "network_reference_only",
          status_meaning: "route_geometry_only",
          osm_name: element.tags?.name ?? null,
          osm_ref: element.tags?.ref ?? null
        }
      };
      routeFeatures.push(feature);
      if (!longestByRoute.has(routeId) || length > longestByRoute.get(routeId).length) {
        longestByRoute.set(routeId, { length, coordinates: segmentCoordinates });
      }
    }
  }

  const labelFeatures = ROUTE_IDS.flatMap((routeId) => {
    const longest = longestByRoute.get(routeId);
    if (!longest) return [];
    const config = ROUTE_CONFIG[routeId];
    return [{
      type: "Feature",
      geometry: { type: "Point", coordinates: config.labelCoordinate ?? midpoint(longest.coordinates) },
      properties: {
        id: `route-label-${routeId}`,
        kind: "label",
        route_id: routeId,
        route_label: config.label,
        access_route: config.accessRoute ?? routeId,
        access_scope: config.category === "railway" ? "airport_access_corridor" : "regional_reference",
        category: config.category,
        operator: config.operator,
        order: config.order,
        source_scope: "network_reference_only",
        status_meaning: "route_geometry_only"
      }
    }];
  });

  return {
    type: "FeatureCollection",
    metadata: {
      generated_at: metadata.generatedAt ?? new Date().toISOString(),
      source: "OpenStreetMap contributors",
      source_url: "https://www.openstreetmap.org/copyright",
      license: "ODbL 1.0",
      license_url: "https://opendatacommons.org/licenses/odbl/1-0/",
      acquisition: "Overpass API out geom; static build-time snapshot",
      query_sha256: metadata.querySha256,
      overpass_generator: overpassPayload?.generator ?? null,
      bbox: [139.55, 35.45, 140.75, 36.10],
      route_count: longestByRoute.size,
      line_feature_count: routeFeatures.length,
      status_meaning: "Geometry does not indicate operation, safety or availability."
    },
    features: [...routeFeatures, ...labelFeatures]
  };
}

export function validateNetworkFeatureCollection(collection) {
  if (collection?.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
    throw new Error("Network geometry must be a GeoJSON FeatureCollection");
  }
  const lines = collection.features.filter((feature) => feature?.geometry?.type === "LineString");
  if (lines.length < 100) throw new Error(`Network geometry has too few line features: ${lines.length}`);
  const presentRoutes = new Set(lines.map((feature) => feature?.properties?.route_id));
  const missingRoutes = ROUTE_IDS.filter((routeId) => !presentRoutes.has(routeId));
  if (missingRoutes.length > 0) throw new Error(`Network geometry is missing routes: ${missingRoutes.join(", ")}`);
  for (const feature of lines) {
    if (feature.properties?.source_scope !== "network_reference_only") throw new Error(`Unsafe source scope: ${feature.properties?.id}`);
    if (feature.properties?.status_meaning !== "route_geometry_only") throw new Error(`Unsafe status meaning: ${feature.properties?.id}`);
    if (!Array.isArray(feature.geometry.coordinates) || feature.geometry.coordinates.length < 2) throw new Error(`Invalid line: ${feature.properties?.id}`);
    if (feature.properties?.category === "railway" && feature.properties?.access_scope !== "airport_access_corridor") {
      throw new Error(`Railway line is not scoped to an airport access corridor: ${feature.properties?.id}`);
    }
    for (const coordinate of feature.geometry.coordinates) {
      if (!coordinateInRailAccessCorridor(feature.properties?.route_id, coordinate)) {
        throw new Error(`Railway coordinate is outside its airport access corridor: ${feature.properties?.id}`);
      }
    }
  }
  return { lineCount: lines.length, routeCount: presentRoutes.size };
}

export { ROUTE_IDS };
