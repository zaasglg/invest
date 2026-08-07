import { Link } from '@inertiajs/react'
import { Line } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import { MathUtils, Path, Shape, Vector3 } from 'three'
import { index as issuesIndex } from '@/routes/issues'
import districtsRaw from './data/turkistan-districts.geojson?raw'
import elevationRaw from './data/turkistan-elevation.json?raw'
import boundaryRaw from './data/turkistan-region.geojson?raw'
import './inmap.css'

type GeoCoordinate = [longitude: number, latitude: number]
type WorldCoordinate = [x: number, y: number, z: number]

interface BoundaryData {
  features: Array<{
    geometry: {
      type: 'Polygon'
      coordinates: GeoCoordinate[][]
    }
  }>
}

interface ElevationData {
  bbox: [number, number, number, number]
}

interface DistrictData {
  features: Array<{
    properties: {
      osmId: string
      name: string
    }
    geometry: {
      type: 'MultiLineString'
      coordinates: GeoCoordinate[][]
    }
  }>
}

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
  /** Landing hero: full-bleed map without analytics chrome. */
  variant?: 'dashboard' | 'landing'
}

interface DistrictMapModel {
  id: string
  regionId: number | null
  name: string
  center: { x: number; z: number }
  extent: number
  shapes: Shape[]
  lines: WorldCoordinate[][]
}

const boundaryData = JSON.parse(boundaryRaw) as BoundaryData
const elevationData = JSON.parse(elevationRaw) as ElevationData
const districtData = JSON.parse(districtsRaw) as DistrictData
const regionRings = boundaryData.features[0].geometry.coordinates
const [minLongitude, minLatitude, maxLongitude, maxLatitude] =
  elevationData.bbox

const MAP_MAX_SIZE = 14
const DISTRICT_FILL_DEFAULT = '#123342'
const DISTRICT_FILL_SELECTED = '#22d3ee'

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
    label: 'Жобаларға салынған инвестициялар',
    shortLabel: 'Инвестициялар',
    unit: 'млн ₸',
    decimals: 1,
    color: '#22d3ee',
  },
  {
    key: 'projects',
    label: 'Инвестициялық жобалар',
    shortLabel: 'Жобалар',
    unit: 'дана',
    decimals: 0,
    color: '#2dd4bf',
  },
  {
    key: 'jobs',
    label: 'Жұмыс орындары',
    shortLabel: 'Жұмыс орындары',
    unit: 'адам',
    decimals: 0,
    color: '#a5f3fc',
  },
  {
    key: 'problems',
    label: 'Секторлар бойынша мәселелер',
    shortLabel: 'Мәселелер',
    unit: 'дана',
    decimals: 0,
    color: '#fbbf24',
  },
]

const problemSectorLabels = [
  { key: 'sez' as const, label: 'АЭА' },
  { key: 'iz' as const, label: 'ИА' },
  { key: 'prom' as const, label: 'Өнеркәсіп' },
  { key: 'nedro' as const, label: 'Жер қойнауы' },
  { key: 'invest' as const, label: 'Инвестиция' },
]

const emptySectorRow: SectorRow = {
  investment: 0,
  projectCount: 0,
  problemCount: 0,
  jobCount: 0,
}

const emptySectorData: SectorData = {
  sez: emptySectorRow,
  iz: emptySectorRow,
  prom: emptySectorRow,
  nedro: emptySectorRow,
  invest: emptySectorRow,
  all_projects: emptySectorRow,
}

function longitudeToMercator(longitude: number) {
  return MathUtils.degToRad(longitude)
}

function latitudeToMercator(latitude: number) {
  const latitudeRadians = MathUtils.degToRad(latitude)
  return Math.log(Math.tan(Math.PI / 4 + latitudeRadians / 2))
}

const minMercatorX = longitudeToMercator(minLongitude)
const maxMercatorX = longitudeToMercator(maxLongitude)
const minMercatorY = latitudeToMercator(minLatitude)
const maxMercatorY = latitudeToMercator(maxLatitude)
const mercatorCenterX = (minMercatorX + maxMercatorX) / 2
const mercatorCenterY = (minMercatorY + maxMercatorY) / 2
const mapScale =
  MAP_MAX_SIZE /
  Math.max(maxMercatorX - minMercatorX, maxMercatorY - minMercatorY)

function projectCoordinate([longitude, latitude]: GeoCoordinate) {
  return {
    x: (longitudeToMercator(longitude) - mercatorCenterX) * mapScale,
    z: -(latitudeToMercator(latitude) - mercatorCenterY) * mapScale,
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

function createRegionShape() {
  const shape = new Shape()

  regionRings.forEach((ring, ringIndex) => {
    const path = ringIndex === 0 ? shape : new Path()

    ring.forEach((coordinate, pointIndex) => {
      const { x, z } = projectCoordinate(coordinate)

      if (pointIndex === 0) {
        path.moveTo(x, -z)
      } else {
        path.lineTo(x, -z)
      }
    })

    path.closePath()

    if (ringIndex > 0) shape.holes.push(path)
  })

  return shape
}

function getDistrictDisplayName(name: string) {
  const displayNames: Record<string, string> = {
    'Арысь городская администрация': 'Арыс қаласы',
    'городская администрация Кентау': 'Кентау қаласы',
    'район Байдибека': 'Бәйдібек ауданы',
    'Туркестан Г.А.': 'Түркістан қаласы',
  }

  return displayNames[name] ?? name
}

const districtRegionNames: Record<string, string> = {
  'Арысь городская администрация': 'Арыс қаласы',
  'городская администрация Кентау': 'Кентау қаласы',
  'Жетисайский район': 'Жетісай ауданы',
  'Казыгуртский район': 'Қазығұрт ауданы',
  'Келесский район': 'Келес ауданы',
  'Мактааральский район': 'Мақтаарал ауданы',
  'Ордабасынский район': 'Ордабасы ауданы',
  'Отрарский район': 'Отырар ауданы',
  'район Байдибека': 'Бәйдібек ауданы',
  'Сайрамский район': 'Сайрам ауданы',
  'Сарыагашский район': 'Сарыағаш ауданы',
  'Сауранский район': 'Сауран ауданы',
  'Сузакский район': 'Созақ ауданы',
  'Толебийский район': 'Төлеби ауданы',
  'Туркестан Г.А.': 'Түркістан қаласы',
  'Тюлькубасский район': 'Түлкібас ауданы',
  'Шардаринский район': 'Шардара ауданы',
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

function addDistrictRingToPath(
  path: Shape | Path,
  coordinates: GeoCoordinate[],
) {
  coordinates.forEach((coordinate, index) => {
    const { x, z } = projectCoordinate(coordinate)

    if (index === 0) {
      path.moveTo(x, -z)
    } else {
      path.lineTo(x, -z)
    }
  })

  path.closePath()
}

function createDistrictShapes(rings: GeoCoordinate[][]) {
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
    addDistrictRingToPath(shape, ring)

    rings.forEach((holeRing, holeIndex) => {
      const isDirectHole =
        containers[holeIndex].includes(ringIndex) &&
        containers[holeIndex].length === containers[ringIndex].length + 1

      if (!isDirectHole) return

      const hole = new Path()
      addDistrictRingToPath(hole, holeRing)
      shape.holes.push(hole)
    })

    return [shape]
  })
}

function buildDistrictMapModels(regions: DashboardRegion[]): {
  models: DistrictMapModel[]
} {
  const regionsByName = new Map(regions.map((region) => [region.name, region]))

  const models = districtData.features.map((district) => {
    const rings = district.geometry.coordinates.map(simplifyDistrictRing)
    const projectedPoints = rings.flatMap((ring) =>
      ring.map((coordinate) => projectCoordinate(coordinate)),
    )
    const minimumX = Math.min(...projectedPoints.map((point) => point.x))
    const maximumX = Math.max(...projectedPoints.map((point) => point.x))
    const minimumZ = Math.min(...projectedPoints.map((point) => point.z))
    const maximumZ = Math.max(...projectedPoints.map((point) => point.z))
    const region = regionsByName.get(
      districtRegionNames[district.properties.name],
    )

    const model: DistrictMapModel = {
      id: district.properties.osmId,
      regionId: region?.id ?? null,
      name: region?.name ?? getDistrictDisplayName(district.properties.name),
      center: {
        x: (minimumX + maximumX) / 2,
        z: (minimumZ + maximumZ) / 2,
      },
      extent: Math.max(maximumX - minimumX, maximumZ - minimumZ),
      shapes: createDistrictShapes(rings),
      lines: rings.map((ring) =>
        ring.map((coordinate) => {
          const { x, z } = projectCoordinate(coordinate)
          return [x, 0.145, z] as WorldCoordinate
        }),
      ),
    }

    return model
  })

  return {
    models,
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
  return new Intl.NumberFormat('kk-KZ', {
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
    currentTargetRef.current.set(0, 0, 0)
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
              isSelected ? DISTRICT_FILL_SELECTED : DISTRICT_FILL_DEFAULT
            }
            emissive={isSelected ? '#0891b2' : '#071827'}
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
}: {
  selectedDistrictId: string | null
  onSelectDistrict: (districtId: string | null) => void
  districts: DistrictMapModel[]
}) {
  const regionShape = useMemo(() => createRegionShape(), [])

  return (
    <group position-y={-0.08} onPointerMissed={() => onSelectDistrict(null)}>
      <mesh position-y={-0.44} rotation-x={-Math.PI / 2} receiveShadow>
        <extrudeGeometry
          args={[
            regionShape,
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
  variant = 'dashboard',
}: InMapAppProps) {
  const isLanding = variant === 'landing'
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(
    null,
  )
  const [activeIndicatorKey, setActiveIndicatorKey] =
    useState<IndicatorKey>('investment')
  const [mapMenuOpen, setMapMenuOpen] = useState(false)

  const { models: districtMapModels } = useMemo(
    () => buildDistrictMapModels(regions),
    [regions],
  )

  const selectedDistrict =
    districtMapModels.find((district) => district.id === selectedDistrictId) ??
    null
  const regionId = selectedDistrict?.regionId ?? null
  const regionIssuesUrl = issuesIndex(
    regionId === null ? undefined : { query: { region_id: regionId } },
  ).url
  const hasSelectedRegion =
    selectedDistrict === null || selectedDistrict.regionId !== null
  const sectorRow = hasSelectedRegion
    ? getSectorRow(sectorSummary, regionId)
    : emptySectorRow
  const sectorData = hasSelectedRegion
    ? getSectorData(sectorSummary, regionId)
    : emptySectorData
  const yearly = hasSelectedRegion
    ? getYearlySeries(regionYearly, regionId)
    : {
        investment: regionYearly.years.map(() => 0),
        projects: regionYearly.years.map(() => 0),
        jobs: regionYearly.years.map(() => 0),
      }

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
        <section
          className="district-map-panel"
          aria-label="Аудандардың 3D картасы"
        >
          {!isLanding && (
            <div
              className={`district-map-menu${mapMenuOpen ? ' is-open' : ''}`}
            >
              <button
                type="button"
                className="district-map-menu__toggle"
                aria-expanded={mapMenuOpen}
                aria-controls="district-map-menu-panel"
                aria-label={
                  mapMenuOpen ? 'Карта мәзірін жабу' : 'Карта мәзірі'
                }
                onClick={() => setMapMenuOpen((open) => !open)}
              >
                <span />
                <span />
                <span />
              </button>

              {mapMenuOpen && (
                <div
                  id="district-map-menu-panel"
                  className="district-map-menu__panel"
                  role="listbox"
                  aria-label="Аймақтар"
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedDistrictId === null}
                    className={`district-map-menu__item${
                      selectedDistrictId === null ? ' is-active' : ''
                    }`}
                    onClick={() => {
                      setSelectedDistrictId(null)
                      setMapMenuOpen(false)
                    }}
                  >
                    Бүкіл облыс
                  </button>
                  {districtMapModels
                    .slice()
                    .sort((first, second) =>
                      first.name.localeCompare(second.name, 'kk'),
                    )
                    .map((district) => (
                      <button
                        key={district.id}
                        type="button"
                        role="option"
                        aria-selected={selectedDistrictId === district.id}
                        className={`district-map-menu__item${
                          selectedDistrictId === district.id
                            ? ' is-active'
                            : ''
                        }`}
                        onClick={() => {
                          setSelectedDistrictId(district.id)
                          setMapMenuOpen(false)
                        }}
                      >
                        {district.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          <div className="district-map-canvas">
            <Canvas
              shadows
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
              />
            </Canvas>
          </div>
        </section>

        {!isLanding && (
          <aside className="district-analytics" aria-live="polite">
            <div className="district-analytics__heading">
              <div>
                <p>
                  {selectedDistrict
                    ? 'Аумақ профилі'
                    : 'Аймақ бойынша жиынтық'}
                </p>
                <h2>
                  {selectedDistrict
                    ? selectedDistrict.name
                    : 'Түркістан облысы'}
                </h2>
              </div>
              {selectedDistrict && (
                <button
                  type="button"
                  onClick={() => setSelectedDistrictId(null)}
                >
                  Бүкіл облыс
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

                const content = (
                  <>
                    <span>{indicator.shortLabel}</span>
                    <strong>
                      {formatAnalyticsValue(value, indicator)}
                      <small>{indicator.unit}</small>
                    </strong>
                    {seriesGrowth !== null ? (
                      <p>
                        {seriesGrowth >= 0 ? '+' : ''}
                        {seriesGrowth.toFixed(1)}% кезең ішінде
                      </p>
                    ) : (
                      <p>Тізімді ашу →</p>
                    )}
                  </>
                )

                return indicator.key === 'problems' ? (
                  <Link
                    key={indicator.key}
                    href={regionIssuesUrl}
                    className="analytics-kpi-link"
                  >
                    <article>{content}</article>
                  </Link>
                ) : (
                  <article key={indicator.key}>{content}</article>
                )
              })}
            </div>

            <div className="analytics-detail">
              <div className="analytics-detail__header">
                <div>
                  <span>
                    {activeIndicatorKey === 'problems'
                      ? 'Секторлар бойынша'
                      : `${yearRangeLabel} аралығындағы өзгеріс`}
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

              <div
                className="indicator-tabs"
                aria-label="Көрсеткішті таңдау"
              >
                {indicatorDefinitions.map((indicator) =>
                  indicator.key === 'problems' ? (
                    <Link key={indicator.key} href={regionIssuesUrl}>
                      {indicator.shortLabel}
                    </Link>
                  ) : (
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
                  ),
                )}
              </div>

              <AnalyticsBarChart
                indicator={activeIndicator}
                values={chartValues}
                labels={chartLabels}
              />
            </div>

          {selectedDistrict && selectedDistrict.regionId !== null && (
            <Link
              href={`/regions/${selectedDistrict.regionId}`}
              className="district-analytics__open"
              >
                Аудан бетін ашу
                <span aria-hidden="true">→</span>
              </Link>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}

function App({
  regions,
  sectorSummary,
  regionYearly,
  variant = 'dashboard',
}: InMapAppProps) {
  const isLanding = variant === 'landing'

  return (
    <div
      className={`inmap-embed inmap-embed--districts${
        isLanding ? ' inmap-embed--landing' : ''
      }`}
    >
      <DistrictExplorer
        regions={regions}
        sectorSummary={sectorSummary}
        regionYearly={regionYearly}
        variant={variant}
      />
    </div>
  )
}

export default App
