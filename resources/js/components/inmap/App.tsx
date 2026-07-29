import { Link } from '@inertiajs/react'
import { Line } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import { MathUtils, Path, Shape, Vector3 } from 'three'
import './inmap.css'

type GeoCoordinate = [longitude: number, latitude: number]
type WorldCoordinate = [x: number, y: number, z: number]

interface LatLngPoint {
  lat: number
  lng: number
}

interface DashboardRegion {
  id: number
  name: string
  color?: string | null
  geometry?: LatLngPoint[] | LatLngPoint[][] | null
}

interface SectorRow {
  investment: number
  projectCount: number | null
  problemCount: number
  jobCount: number | null
}

interface SectorData {
  sez: SectorRow
  iz: SectorRow
  prom: SectorRow
  nedro: SectorRow
  invest: SectorRow
  all_projects?: SectorRow
}

interface SectorSummary {
  total: SectorData
  byRegion: Record<number, SectorData>
}

interface RegionYearlySeries {
  investment: number[]
  projects: number[]
  jobs: number[]
}

interface RegionYearly {
  years: number[]
  total: RegionYearlySeries
  byRegion: Record<number, RegionYearlySeries>
}

export interface InMapAppProps {
  regions: DashboardRegion[]
  sectorSummary: SectorSummary
  regionYearly: RegionYearly
}

interface Projection {
  project: (coordinate: GeoCoordinate) => { x: number; z: number }
}

interface DistrictMapModel {
  id: string
  regionId: number
  name: string
  color: string
  center: { x: number; z: number }
  extent: number
  shapes: Shape[]
  lines: WorldCoordinate[][]
}

const MAP_MAX_SIZE = 14

/** Teal / cyan palette like the original map (not lime-green). */
const districtMapColors = [
  '#0e7490',
  '#0891b2',
  '#06b6d4',
  '#0d9488',
  '#14b8a6',
  '#155e75',
  '#0f766e',
  '#22d3ee',
  '#2dd4bf',
  '#164e63',
]

function districtColorForId(regionId: number) {
  // Stable "random" pick from the palette by region id.
  return districtMapColors[Math.abs(regionId) % districtMapColors.length]
}

type IndicatorKey = 'investment' | 'projects' | 'jobs' | 'problems'

interface IndicatorDefinition {
  key: IndicatorKey
  label: string
  shortLabel: string
  unit: string
  decimals: number
  color: string
}

const indicatorDefinitions: IndicatorDefinition[] = [
  {
    key: 'investment',
    label: 'Инвестиции проектов',
    shortLabel: 'Инвестиции',
    unit: 'млн ₸',
    decimals: 1,
    color: '#22d3ee',
  },
  {
    key: 'projects',
    label: 'Инвестиционные проекты',
    shortLabel: 'Проекты',
    unit: 'шт.',
    decimals: 0,
    color: '#2dd4bf',
  },
  {
    key: 'jobs',
    label: 'Рабочие места',
    shortLabel: 'Рабочие места',
    unit: 'чел.',
    decimals: 0,
    color: '#a5f3fc',
  },
  {
    key: 'problems',
    label: 'Проблемы по секторам',
    shortLabel: 'Проблемы',
    unit: 'шт.',
    decimals: 0,
    color: '#fbbf24',
  },
]

const problemSectorLabels = [
  { key: 'sez' as const, label: 'АЭА' },
  { key: 'iz' as const, label: 'ИА' },
  { key: 'prom' as const, label: 'Пром' },
  { key: 'nedro' as const, label: 'Недро' },
  { key: 'invest' as const, label: 'Инвест' },
]

const emptySectorRow: SectorRow = {
  investment: 0,
  projectCount: 0,
  problemCount: 0,
  jobCount: 0,
}

function longitudeToMercator(longitude: number) {
  return MathUtils.degToRad(longitude)
}

function latitudeToMercator(latitude: number) {
  const latitudeRadians = MathUtils.degToRad(latitude)
  return Math.log(Math.tan(Math.PI / 4 + latitudeRadians / 2))
}

function normalizeLatLng(point: unknown): LatLngPoint | null {
  if (!point || typeof point !== 'object') return null

  const record = point as Record<string, unknown>
  let rawLat = record.lat
  let rawLng = record.lng

  if (Array.isArray(rawLat)) rawLat = rawLat[0]
  if (Array.isArray(rawLng)) rawLng = rawLng[0]

  let lat = Number(rawLat)
  let lng = Number(rawLng)

  if (Number.isNaN(lat) || Number.isNaN(lng)) return null

  // Fix swapped lat/lng (Kazakhstan: lat ~40–46, lng ~66–72)
  if (lat > 50 && lng < 50) {
    ;[lat, lng] = [lng, lat]
  }

  if (lat < 35 || lat > 55 || lng < 50 || lng > 90) return null

  return { lat, lng }
}

function getRegionPolygons(geometry: unknown): LatLngPoint[][] {
  if (!geometry || !Array.isArray(geometry) || geometry.length === 0) {
    return []
  }

  if (Array.isArray(geometry[0])) {
    return geometry
      .map((polygon) =>
        (polygon as unknown[])
          .map((point) => normalizeLatLng(point))
          .filter((point): point is LatLngPoint => point !== null),
      )
      .filter((polygon) => polygon.length >= 3)
  }

  const points = geometry
    .map((point) => normalizeLatLng(point))
    .filter((point): point is LatLngPoint => point !== null)

  return points.length >= 3 ? [points] : []
}

function polygonsToRings(polygons: LatLngPoint[][]): GeoCoordinate[][] {
  return polygons.map((polygon) => {
    const ring: GeoCoordinate[] = polygon.map((point) => [
      point.lng,
      point.lat,
    ])
    const first = ring[0]
    const last = ring[ring.length - 1]

    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push(first)
    }

    return ring
  })
}

function simplifyDistrictRing(coordinates: GeoCoordinate[]) {
  const maximumPoints = 240
  const step = Math.max(1, Math.ceil(coordinates.length / maximumPoints))
  const simplified = coordinates.filter(
    (_, index) => index % step === 0 || index === coordinates.length - 1,
  )
  const first = simplified[0]
  const last = simplified[simplified.length - 1]

  if (first[0] !== last[0] || first[1] !== last[1]) {
    simplified.push(first)
  }

  return simplified
}

function createProjection(allCoordinates: GeoCoordinate[]): Projection {
  if (allCoordinates.length === 0) {
    return {
      project: () => ({ x: 0, z: 0 }),
    }
  }

  const longitudes = allCoordinates.map(([longitude]) => longitude)
  const latitudes = allCoordinates.map(([, latitude]) => latitude)
  const minLongitude = Math.min(...longitudes)
  const maxLongitude = Math.max(...longitudes)
  const minLatitude = Math.min(...latitudes)
  const maxLatitude = Math.max(...latitudes)

  const minMercatorX = longitudeToMercator(minLongitude)
  const maxMercatorX = longitudeToMercator(maxLongitude)
  const minMercatorY = latitudeToMercator(minLatitude)
  const maxMercatorY = latitudeToMercator(maxLatitude)
  const mercatorCenterX = (minMercatorX + maxMercatorX) / 2
  const mercatorCenterY = (minMercatorY + maxMercatorY) / 2
  const span = Math.max(
    maxMercatorX - minMercatorX,
    maxMercatorY - minMercatorY,
    0.0001,
  )
  const mapScale = MAP_MAX_SIZE / span

  return {
    project([longitude, latitude]) {
      return {
        x: (longitudeToMercator(longitude) - mercatorCenterX) * mapScale,
        z: -(latitudeToMercator(latitude) - mercatorCenterY) * mapScale,
      }
    },
  }
}

function isPointInRing(
  longitude: number,
  latitude: number,
  ring: GeoCoordinate[],
) {
  let inside = false

  for (
    let current = 0, previous = ring.length - 1;
    current < ring.length;
    previous = current++
  ) {
    const [currentLongitude, currentLatitude] = ring[current]
    const [previousLongitude, previousLatitude] = ring[previous]
    const crossesRay =
      currentLatitude > latitude !== previousLatitude > latitude &&
      longitude <
        ((previousLongitude - currentLongitude) *
          (latitude - currentLatitude)) /
          (previousLatitude - currentLatitude) +
          currentLongitude

    if (crossesRay) inside = !inside
  }

  return inside
}

function addDistrictRingToPath(
  path: Shape | Path,
  coordinates: GeoCoordinate[],
  project: Projection['project'],
) {
  coordinates.forEach((coordinate, index) => {
    const { x, z } = project(coordinate)

    if (index === 0) {
      path.moveTo(x, -z)
    } else {
      path.lineTo(x, -z)
    }
  })

  path.closePath()
}

function createDistrictShapes(
  rings: GeoCoordinate[][],
  project: Projection['project'],
) {
  const containers = rings.map((ring, ringIndex) => {
    const sample = ring[Math.floor(ring.length / 3)]

    return rings.flatMap((candidate, candidateIndex) => {
      if (
        ringIndex === candidateIndex ||
        !isPointInRing(sample[0], sample[1], candidate)
      ) {
        return []
      }

      return [candidateIndex]
    })
  })

  return rings.flatMap((ring, ringIndex) => {
    if (containers[ringIndex].length % 2 !== 0) return []

    const shape = new Shape()
    addDistrictRingToPath(shape, ring, project)

    rings.forEach((holeRing, holeIndex) => {
      const isDirectHole =
        containers[holeIndex].includes(ringIndex) &&
        containers[holeIndex].length === containers[ringIndex].length + 1

      if (!isDirectHole) return

      const hole = new Path()
      addDistrictRingToPath(hole, holeRing, project)
      shape.holes.push(hole)
    })

    return [shape]
  })
}

function createBasePlateShape(
  project: Projection['project'],
  allCoordinates: GeoCoordinate[],
) {
  if (allCoordinates.length === 0) {
    const shape = new Shape()
    shape.moveTo(-6, -6)
    shape.lineTo(6, -6)
    shape.lineTo(6, 6)
    shape.lineTo(-6, 6)
    shape.closePath()
    return shape
  }

  const projected = allCoordinates.map((coordinate) => project(coordinate))
  const padding = 0.45
  const minX = Math.min(...projected.map((point) => point.x)) - padding
  const maxX = Math.max(...projected.map((point) => point.x)) + padding
  const minZ = Math.min(...projected.map((point) => point.z)) - padding
  const maxZ = Math.max(...projected.map((point) => point.z)) + padding

  const shape = new Shape()
  shape.moveTo(minX, -maxZ)
  shape.lineTo(maxX, -maxZ)
  shape.lineTo(maxX, -minZ)
  shape.lineTo(minX, -minZ)
  shape.closePath()
  return shape
}

function buildDistrictMapModels(regions: DashboardRegion[]): {
  models: DistrictMapModel[]
  baseShape: Shape
} {
  const prepared = regions
    .map((region, index) => {
      const polygons = getRegionPolygons(region.geometry)
      const rings = polygonsToRings(polygons).map(simplifyDistrictRing)

      return {
        region,
        index,
        rings,
      }
    })
    .filter((item) => item.rings.some((ring) => ring.length >= 4))

  const allCoordinates = prepared.flatMap((item) => item.rings.flat())
  const { project } = createProjection(allCoordinates)

  const models = prepared.map(({ region, rings }) => {
    const projectedPoints = rings.flatMap((ring) =>
      ring.map((coordinate) => project(coordinate)),
    )
    const minimumX = Math.min(...projectedPoints.map((point) => point.x))
    const maximumX = Math.max(...projectedPoints.map((point) => point.x))
    const minimumZ = Math.min(...projectedPoints.map((point) => point.z))
    const maximumZ = Math.max(...projectedPoints.map((point) => point.z))

    const model: DistrictMapModel = {
      id: String(region.id),
      regionId: region.id,
      name: region.name,
      color: districtColorForId(region.id),
      center: {
        x: (minimumX + maximumX) / 2,
        z: (minimumZ + maximumZ) / 2,
      },
      extent: Math.max(maximumX - minimumX, maximumZ - minimumZ),
      shapes: createDistrictShapes(rings, project),
      lines: rings.map((ring) =>
        ring.map((coordinate) => {
          const { x, z } = project(coordinate)
          return [x, 0.145, z] as WorldCoordinate
        }),
      ),
    }

    return model
  })

  const largestDistrict = models.reduce<DistrictMapModel | null>(
    (current, model) => (!current || model.extent > current.extent ? model : current),
    null,
  )
  const fallbackBaseShape = createBasePlateShape(project, allCoordinates)

  return {
    models,
    // Avoid "beige rectangle" by using the biggest district outline as a base.
    // If it can't be computed, fallback to rectangle.
    baseShape: largestDistrict?.shapes[0] ?? fallbackBaseShape,
  }
}

function getSectorRow(
  sectorSummary: SectorSummary,
  regionId: number | null,
): SectorRow {
  if (regionId === null) {
    return sectorSummary.total.all_projects ?? emptySectorRow
  }

  return sectorSummary.byRegion[regionId]?.all_projects ?? emptySectorRow
}

function getSectorData(
  sectorSummary: SectorSummary,
  regionId: number | null,
): SectorData {
  if (regionId === null) {
    return sectorSummary.total
  }

  return (
    sectorSummary.byRegion[regionId] ?? {
      sez: emptySectorRow,
      iz: emptySectorRow,
      prom: emptySectorRow,
      nedro: emptySectorRow,
      invest: emptySectorRow,
      all_projects: emptySectorRow,
    }
  )
}

function getYearlySeries(
  regionYearly: RegionYearly,
  regionId: number | null,
): RegionYearlySeries {
  if (regionId === null) {
    return regionYearly.total
  }

  return (
    regionYearly.byRegion[regionId] ?? {
      investment: regionYearly.years.map(() => 0),
      projects: regionYearly.years.map(() => 0),
      jobs: regionYearly.years.map(() => 0),
    }
  )
}

function toDisplayValue(key: IndicatorKey, value: number) {
  if (key === 'investment') {
    return value / 1_000_000
  }

  return value
}

function formatAnalyticsValue(value: number, indicator: IndicatorDefinition) {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: indicator.decimals,
    maximumFractionDigits: indicator.decimals,
  }).format(value)
}

function growthPercent(values: number[]) {
  const first = values.find((value) => value > 0) ?? 0
  const last = values[values.length - 1] ?? 0

  if (first <= 0) return null

  return ((last - first) / first) * 100
}

function DistrictMapCamera({
  selectedDistrictId,
  districts,
}: {
  selectedDistrictId: string | null
  districts: DistrictMapModel[]
}) {
  const { camera, size } = useThree()
  const currentTargetRef = useRef(new Vector3())
  const targetDestinationRef = useRef(new Vector3())
  const positionDestinationRef = useRef(new Vector3())
  const selectedDistrict = districts.find(
    (district) => district.id === selectedDistrictId,
  )

  useEffect(() => {
    if (size.width < 560) {
      camera.position.set(0, 16.6, 13.4)
    } else {
      camera.position.set(0, 13.8, 11.2)
    }

    camera.lookAt(0, 0, 0)
  }, [camera, size.width])

  useFrame((_, delta) => {
    const positionDestination = positionDestinationRef.current
    const targetDestination = targetDestinationRef.current

    if (selectedDistrict) {
      const zoomHeight = MathUtils.clamp(
        selectedDistrict.extent * 1.15 + 2.4,
        5.2,
        10.5,
      )
      const zoomDepth = MathUtils.clamp(
        selectedDistrict.extent * 0.85 + 2,
        4.2,
        8.5,
      )

      positionDestination.set(
        selectedDistrict.center.x,
        zoomHeight,
        selectedDistrict.center.z + zoomDepth,
      )
      targetDestination.set(
        selectedDistrict.center.x,
        0.18,
        selectedDistrict.center.z,
      )
    } else {
      positionDestination.set(
        0,
        size.width < 560 ? 16.6 : 13.8,
        size.width < 560 ? 13.4 : 11.2,
      )
      targetDestination.set(0, 0, 0)
    }

    const damping = 1 - Math.exp(-delta * 2.8)
    camera.position.lerp(positionDestination, damping)
    currentTargetRef.current.lerp(targetDestination, damping)
    camera.lookAt(currentTargetRef.current)
  })

  return null
}

function DistrictSurface({
  district,
  isSelected,
  isDimmed,
  onSelect,
}: {
  district: DistrictMapModel
  isSelected: boolean
  isDimmed: boolean
  onSelect: () => void
}) {
  const groupRef = useRef<Group>(null)

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const targetHeight = isSelected ? 0.52 : 0
    groupRef.current.position.y = MathUtils.damp(
      groupRef.current.position.y,
      targetHeight,
      6,
      delta,
    )
  })

  const handlePointerOver = (event: { stopPropagation: () => void }) => {
    event.stopPropagation()
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = () => {
    document.body.style.cursor = ''
  }

  return (
    <group ref={groupRef}>
      {district.shapes.map((shape, index) => (
        <mesh
          key={`${district.id}-surface-${index}`}
          rotation-x={-Math.PI / 2}
          castShadow
          receiveShadow
          onClick={(event) => {
            event.stopPropagation()
            onSelect()
          }}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <extrudeGeometry
            args={[
              shape,
              {
                depth: 0.12,
                bevelEnabled: true,
                bevelSegments: 1,
                bevelSize: 0.025,
                bevelThickness: 0.025,
              },
            ]}
          />
          <meshStandardMaterial
            color={
              isSelected ? '#22d3ee' : isDimmed ? '#123342' : district.color
            }
            emissive={
              isSelected ? '#0891b2' : isDimmed ? '#071827' : '#042f2e'
            }
            emissiveIntensity={isSelected ? 1.25 : 0.18}
            metalness={0.2}
            roughness={0.68}
          />
        </mesh>
      ))}

      {district.lines.map((points, index) => (
        <Line
          key={`${district.id}-line-${index}`}
          points={points}
          color={isSelected ? '#ecfeff' : '#99f6e4'}
          lineWidth={isSelected ? 2.5 : 1.1}
          opacity={isDimmed ? 0.22 : 0.82}
          transparent
          depthTest={false}
          renderOrder={isSelected ? 10 : 4}
        />
      ))}
    </group>
  )
}

function DistrictMap3D({
  selectedDistrictId,
  onSelectDistrict,
  districts,
  baseShape,
}: {
  selectedDistrictId: string | null
  onSelectDistrict: (districtId: string | null) => void
  districts: DistrictMapModel[]
  baseShape: Shape
}) {
  return (
    <group position-y={-0.08} onPointerMissed={() => onSelectDistrict(null)}>
      <mesh position-y={-0.44} rotation-x={-Math.PI / 2} receiveShadow>
        <extrudeGeometry
          args={[
            baseShape,
            {
              depth: 0.38,
              bevelEnabled: true,
              bevelSegments: 2,
              bevelSize: 0.05,
              bevelThickness: 0.04,
            },
          ]}
        />
        <meshStandardMaterial
          color="#052e3d"
          emissive="#042f2e"
          emissiveIntensity={0.4}
          metalness={0.26}
          roughness={0.72}
        />
      </mesh>

      {districts.map((district) => (
        <DistrictSurface
          key={district.id}
          district={district}
          isSelected={selectedDistrictId === district.id}
          isDimmed={
            selectedDistrictId !== null && selectedDistrictId !== district.id
          }
          onSelect={() => onSelectDistrict(district.id)}
        />
      ))}
    </group>
  )
}

function AnalyticsBarChart({
  indicator,
  values,
  labels,
}: {
  indicator: IndicatorDefinition
  values: number[]
  labels: Array<string | number>
}) {
  const maximum = Math.max(1, ...values) * 1.12

  return (
    <div className="analytics-chart" aria-label={indicator.label}>
      {values.map((value, index) => (
        <div
          className="analytics-chart__column"
          key={`${labels[index]}-${index}`}
        >
          <span className="analytics-chart__value">
            {formatAnalyticsValue(value, indicator)}
          </span>
          <div className="analytics-chart__track">
            <div
              className="analytics-chart__bar"
              style={{
                height: `${Math.max(10, (value / maximum) * 100)}%`,
                backgroundColor: indicator.color,
              }}
            />
          </div>
          <strong>{labels[index]}</strong>
        </div>
      ))}
    </div>
  )
}

function DistrictExplorer({
  regions,
  sectorSummary,
  regionYearly,
}: InMapAppProps) {
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(
    null,
  )
  const [activeIndicatorKey, setActiveIndicatorKey] =
    useState<IndicatorKey>('investment')

  const { models: districtMapModels, baseShape } = useMemo(
    () => buildDistrictMapModels(regions),
    [regions],
  )

  const selectedDistrict =
    districtMapModels.find((district) => district.id === selectedDistrictId) ??
    null
  const regionId = selectedDistrict?.regionId ?? null
  const sectorRow = getSectorRow(sectorSummary, regionId)
  const sectorData = getSectorData(sectorSummary, regionId)
  const yearly = getYearlySeries(regionYearly, regionId)

  const activeIndicator =
    indicatorDefinitions.find(
      (indicator) => indicator.key === activeIndicatorKey,
    ) ?? indicatorDefinitions[0]

  const kpiValues: Record<IndicatorKey, number> = {
    investment: toDisplayValue('investment', sectorRow.investment),
    projects: sectorRow.projectCount ?? 0,
    jobs: sectorRow.jobCount ?? 0,
    problems: sectorRow.problemCount,
  }

  const chartValues =
    activeIndicatorKey === 'problems'
      ? problemSectorLabels.map((sector) =>
          toDisplayValue('problems', sectorData[sector.key].problemCount),
        )
      : yearly[activeIndicatorKey].map((value) =>
          toDisplayValue(activeIndicatorKey, value),
        )

  const chartLabels =
    activeIndicatorKey === 'problems'
      ? problemSectorLabels.map((sector) => sector.label)
      : regionYearly.years

  const growth =
    activeIndicatorKey === 'problems' ? null : growthPercent(chartValues)

  const yearRangeLabel =
    regionYearly.years.length > 0
      ? `${regionYearly.years[0]}–${regionYearly.years[regionYearly.years.length - 1]}`
      : ''

  return (
    <div className="district-explorer">
      <div className="district-dashboard">
        <section className="district-map-panel" aria-label="3D-карта районов">
          <div className="district-map-panel__topbar">
            <div>
              <span className="live-dot" />
              Интерактивная 3D-карта
            </div>
            <select
              value={selectedDistrictId ?? ''}
              onChange={(event) =>
                setSelectedDistrictId(event.target.value || null)
              }
              aria-label="Выбрать район"
            >
              <option value="">Вся область</option>
              {districtMapModels
                .slice()
                .sort((first, second) =>
                  first.name.localeCompare(second.name, 'ru'),
                )
                .map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="district-map-canvas">
            <Canvas
              shadows="percentage"
              camera={{ fov: 42, near: 0.1, far: 80 }}
              dpr={[1, 1.5]}
              gl={{
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance',
              }}
            >
              <DistrictMapCamera
                selectedDistrictId={selectedDistrictId}
                districts={districtMapModels}
              />
              <ambientLight intensity={0.65} />
              <hemisphereLight args={['#cffafe', '#020617', 1.45]} />
              <directionalLight
                castShadow
                color="#ecfeff"
                intensity={3.4}
                position={[7, 13, 8]}
                shadow-mapSize={[1024, 1024]}
              />
              <directionalLight
                color="#0f766e"
                intensity={1.5}
                position={[-9, 5, -6]}
              />
              <DistrictMap3D
                selectedDistrictId={selectedDistrictId}
                onSelectDistrict={setSelectedDistrictId}
                districts={districtMapModels}
                baseShape={baseShape}
              />
            </Canvas>
          </div>
        </section>

        <aside className="district-analytics" aria-live="polite">
          <div className="district-analytics__heading">
            <div>
              <p>{selectedDistrict ? 'Профиль территории' : 'Сводка региона'}</p>
              <h2>
                {selectedDistrict
                  ? selectedDistrict.name
                  : 'Туркестанская область'}
              </h2>
            </div>
            {selectedDistrict && (
              <button
                type="button"
                onClick={() => setSelectedDistrictId(null)}
              >
                Вся область
              </button>
            )}
          </div>

          <div className="analytics-kpis">
            {indicatorDefinitions.map((indicator) => {
              const value = kpiValues[indicator.key]
              const seriesGrowth =
                indicator.key === 'problems'
                  ? null
                  : growthPercent(
                      yearly[indicator.key].map((item) =>
                        toDisplayValue(indicator.key, item),
                      ),
                    )

              return (
                <article key={indicator.key}>
                  <span>{indicator.shortLabel}</span>
                  <strong>
                    {formatAnalyticsValue(value, indicator)}
                    <small>{indicator.unit}</small>
                  </strong>
                  {seriesGrowth !== null ? (
                    <p>
                      {seriesGrowth >= 0 ? '+' : ''}
                      {seriesGrowth.toFixed(1)}% за период
                    </p>
                  ) : (
                    <p>Текущие данные</p>
                  )}
                </article>
              )
            })}
          </div>

          <div className="analytics-detail">
            <div className="analytics-detail__header">
              <div>
                <span>
                  {activeIndicatorKey === 'problems'
                    ? 'По секторам'
                    : `Динамика ${yearRangeLabel}`}
                </span>
                <h3>{activeIndicator.label}</h3>
              </div>
              {growth !== null && (
                <strong>
                  {growth >= 0 ? '+' : ''}
                  {growth.toFixed(1)}%
                </strong>
              )}
            </div>

            <div className="indicator-tabs" aria-label="Выбор показателя">
              {indicatorDefinitions.map((indicator) => (
                <button
                  key={indicator.key}
                  type="button"
                  className={
                    activeIndicatorKey === indicator.key ? 'is-active' : ''
                  }
                  onClick={() => setActiveIndicatorKey(indicator.key)}
                >
                  {indicator.shortLabel}
                </button>
              ))}
            </div>

            <AnalyticsBarChart
              indicator={activeIndicator}
              values={chartValues}
              labels={chartLabels}
            />
          </div>

          {selectedDistrict && (
            <Link
              href={`/regions/${selectedDistrict.regionId}`}
              className="district-analytics__open"
            >
              Открыть страницу района
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </aside>
      </div>
    </div>
  )
}

function App({ regions, sectorSummary, regionYearly }: InMapAppProps) {
  return (
    <div className="inmap-embed inmap-embed--districts">
      <DistrictExplorer
        regions={regions}
        sectorSummary={sectorSummary}
        regionYearly={regionYearly}
      />
    </div>
  )
}

export default App
