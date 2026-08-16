import { Link } from '@inertiajs/react'
import { Line } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import { MathUtils, Path, Shape, Vector3 } from 'three'
import { index as issuesIndex } from '@/routes/issues'
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
  type: 'FeatureCollection'
  features: Array<{
    id: string
    properties: {
      name: string
      name_kk: string
      kind: 'district' | 'city'
    }
    geometry: {
      type: 'MultiPolygon'
      coordinates: GeoCoordinate[][][]
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
  subtype?: 'district' | 'city' | null
  sort_order?: number | null
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
  subtype: 'district' | 'city' | null
  sortOrder: number | null
  center: { x: number; z: number }
  extent: number
  shapes: Shape[]
  lines: WorldCoordinate[][]
}

const boundaryData = JSON.parse(boundaryRaw) as BoundaryData
const elevationData = JSON.parse(elevationRaw) as ElevationData
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
    unit: '₸',
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
  { key: 'all_projects' as const, label: 'Жобалар' },
  { key: 'sez' as const, label: 'АЭА' },
  { key: 'iz' as const, label: 'ИА' },
  { key: 'prom' as const, label: 'Өнеркәсіп' },
  { key: 'nedro' as const, label: 'Жер қойнауы' },
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

const districtRegionNames: Record<string, string> = {
  'kz.61.10': 'Түркістан қаласы',
  'kz.61.16': 'Арыс қаласы',
  'kz.61.20': 'Кентау қаласы',
  'kz.61.36': 'Бәйдібек ауданы',
  'kz.61.38': 'Жетісай ауданы',
  'kz.61.39': 'Келес ауданы',
  'kz.61.40': 'Қазығұрт ауданы',
  'kz.61.44': 'Мақтаарал ауданы',
  'kz.61.46': 'Ордабасы ауданы',
  'kz.61.48': 'Отырар ауданы',
  'kz.61.52': 'Сайрам ауданы',
  'kz.61.54': 'Сарыағаш ауданы',
  'kz.61.55': 'Сауран ауданы',
  'kz.61.56': 'Созақ ауданы',
  'kz.61.58': 'Төлеби ауданы',
  'kz.61.60': 'Түлкібас ауданы',
  'kz.61.64': 'Шардара ауданы',
}

const TURKISTAN_CITY_ID = 'kz.61.10'
const SAURAN_DISTRICT_ID = 'kz.61.55'

function coordinateKey(coordinate: GeoCoordinate) {
  return `${coordinate[0]},${coordinate[1]}`
}

function openDistrictRing(coordinates: GeoCoordinate[]) {
  const first = coordinates[0]
  const last = coordinates[coordinates.length - 1]

  return coordinateKey(first) === coordinateKey(last)
    ? coordinates.slice(0, -1)
    : [...coordinates]
}

function mergeTouchingDistrictRings(
  baseRing: GeoCoordinate[],
  attachedRing: GeoCoordinate[],
) {
  type Edge = { from: GeoCoordinate; to: GeoCoordinate }

  const remainingEdges = new Map<string, Edge>()
  const rings = [openDistrictRing(baseRing), openDistrictRing(attachedRing)]
  let sourceEdgeCount = 0

  rings.forEach((ring) => {
    ring.forEach((from, index) => {
      const to = ring[(index + 1) % ring.length]
      const edgeKey = `${coordinateKey(from)}>${coordinateKey(to)}`
      const reverseEdgeKey = `${coordinateKey(to)}>${coordinateKey(from)}`

      sourceEdgeCount += 1
      if (remainingEdges.has(reverseEdgeKey)) {
        remainingEdges.delete(reverseEdgeKey)
      } else {
        remainingEdges.set(edgeKey, { from, to })
      }
    })
  })

  if (remainingEdges.size === sourceEdgeCount) return null

  const edgesByStart = new Map<string, Edge>()
  for (const edge of remainingEdges.values()) {
    const startKey = coordinateKey(edge.from)
    if (edgesByStart.has(startKey)) return null
    edgesByStart.set(startKey, edge)
  }

  const firstEdge = remainingEdges.values().next().value as Edge | undefined
  if (!firstEdge) return null

  const mergedRing: GeoCoordinate[] = [firstEdge.from]
  const visitedEdges = new Set<string>()
  let currentEdge: Edge | undefined = firstEdge

  while (currentEdge) {
    const edgeKey = `${coordinateKey(currentEdge.from)}>${coordinateKey(currentEdge.to)}`
    if (visitedEdges.has(edgeKey)) return null

    visitedEdges.add(edgeKey)
    mergedRing.push(currentEdge.to)

    if (coordinateKey(currentEdge.to) === coordinateKey(firstEdge.from)) {
      break
    }

    currentEdge = edgesByStart.get(coordinateKey(currentEdge.to))
  }

  return visitedEdges.size === remainingEdges.size ? mergedRing : null
}

function districtPolygonArea(polygon: GeoCoordinate[][]) {
  const ring = polygon[0]
  let area = 0

  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index]
    const next = ring[(index + 1) % ring.length]
    area += current[0] * next[1] - next[0] * current[1]
  }

  return Math.abs(area / 2)
}

function moveDetachedTurkistanZoneToSauran(data: DistrictData): DistrictData {
  const turkistan = data.features.find(
    (feature) => feature.id === TURKISTAN_CITY_ID,
  )
  const sauran = data.features.find(
    (feature) => feature.id === SAURAN_DISTRICT_ID,
  )

  if (!turkistan || !sauran || turkistan.geometry.coordinates.length < 2) {
    return data
  }

  const mainPolygon = turkistan.geometry.coordinates.reduce(
    (largest, polygon) =>
      districtPolygonArea(polygon) > districtPolygonArea(largest)
        ? polygon
        : largest,
  )
  const sauranPolygons = sauran.geometry.coordinates.map((polygon) =>
    polygon.map((ring) => [...ring]),
  )
  const retainedTurkistanPolygons = [mainPolygon]

  for (const polygon of turkistan.geometry.coordinates) {
    if (polygon === mainPolygon) continue

    let wasMoved = false
    for (let index = 0; index < sauranPolygons.length; index += 1) {
      const mergedOuterRing = mergeTouchingDistrictRings(
        sauranPolygons[index][0],
        polygon[0],
      )
      if (!mergedOuterRing) continue

      sauranPolygons[index] = [
        mergedOuterRing,
        ...sauranPolygons[index].slice(1),
      ]
      wasMoved = true
      break
    }

    if (!wasMoved) retainedTurkistanPolygons.push(polygon)
  }

  return {
    ...data,
    features: data.features.map((feature) => {
      if (feature.id === TURKISTAN_CITY_ID) {
        return {
          ...feature,
          geometry: {
            ...feature.geometry,
            coordinates: retainedTurkistanPolygons,
          },
        }
      }

      if (feature.id === SAURAN_DISTRICT_ID) {
        return {
          ...feature,
          geometry: {
            ...feature.geometry,
            coordinates: sauranPolygons,
          },
        }
      }

      return feature
    }),
  }
}

function closeDistrictRing(coordinates: GeoCoordinate[]) {
  const ring = [...coordinates]
  const first = ring[0]
  const last = ring[ring.length - 1]

  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push(first)
  }

  return ring
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

function buildDistrictMapModels(
  regions: DashboardRegion[],
  districtData: DistrictData,
): {
  models: DistrictMapModel[]
} {
  const regionsByName = new Map(regions.map((region) => [region.name, region]))

  const models = districtData.features.map((district) => {
    const rings = district.geometry.coordinates.flat().map(closeDistrictRing)
    const projectedPoints = rings.flatMap((ring) =>
      ring.map((coordinate) => projectCoordinate(coordinate)),
    )
    const minimumX = Math.min(...projectedPoints.map((point) => point.x))
    const maximumX = Math.max(...projectedPoints.map((point) => point.x))
    const minimumZ = Math.min(...projectedPoints.map((point) => point.z))
    const maximumZ = Math.max(...projectedPoints.map((point) => point.z))
    const region = regionsByName.get(districtRegionNames[district.id])

    const model: DistrictMapModel = {
      id: district.id,
      regionId: region?.id ?? null,
      name:
        region?.name ??
        districtRegionNames[district.id] ??
        district.properties.name_kk ??
        district.properties.name,
      subtype: region?.subtype ?? null,
      sortOrder: region?.sort_order ?? null,
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

function getAnalyticsDisplay(
  value: number,
  indicator: IndicatorDefinition,
): { value: string; unit: string } {
  let divisor = 1
  let unit = indicator.unit

  if (indicator.key === 'investment') {
    const absoluteValue = Math.abs(value)

    if (absoluteValue >= 1_000_000_000) {
      divisor = 1_000_000_000
      unit = 'млрд ₸'
    } else if (absoluteValue >= 1_000_000) {
      divisor = 1_000_000
      unit = 'млн ₸'
    } else if (absoluteValue >= 1_000) {
      divisor = 1_000
      unit = 'мың ₸'
    }
  }

  return {
    value: new Intl.NumberFormat('kk-KZ', {
      minimumFractionDigits:
        indicator.key === 'investment' ? 0 : indicator.decimals,
      maximumFractionDigits: indicator.decimals,
    }).format(value / divisor),
    unit,
  }
}

function growthPercent(values: number[]) {
  const firstIndex = values.findIndex((value) => value > 0)
  const lastIndex = values.length - 1

  if (firstIndex < 0 || firstIndex === lastIndex) return null

  const first = values[firstIndex]
  const last = values[values.length - 1] ?? 0

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
      {values.map((value, index) => {
        const displayValue = getAnalyticsDisplay(value, indicator)

        return (
          <div
            className="analytics-chart__column"
            key={`${labels[index]}-${index}`}
          >
            <span className="analytics-chart__value">
              {displayValue.value}
              {indicator.key === 'investment' && value !== 0 && (
                <small> {displayValue.unit.replace(' ₸', '')}</small>
              )}
            </span>
            <div className="analytics-chart__track">
              <div
                className="analytics-chart__bar"
                style={{
                  height:
                    value > 0
                      ? `${Math.max(10, (value / maximum) * 100)}%`
                      : '0%',
                  backgroundColor: indicator.color,
                }}
              />
            </div>
            <strong>{labels[index]}</strong>
          </div>
        )
      })}
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
  const [districtData, setDistrictData] = useState<DistrictData | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch('/data/turkestan-districts.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`District map request failed: ${response.status}`)
        }

        return response.json() as Promise<DistrictData>
      })
      .then((data) =>
        setDistrictData(moveDetachedTurkistanZoneToSauran(data)),
      )
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setDistrictData(null)
      })

    return () => controller.abort()
  }, [])

  const { models: districtMapModels } = useMemo(
    () =>
      districtData
        ? buildDistrictMapModels(regions, districtData)
        : { models: [] },
    [districtData, regions],
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
  const totalProblemCount =
    sectorRow.problemCount +
    sectorData.sez.problemCount +
    sectorData.iz.problemCount +
    sectorData.prom.problemCount +
    sectorData.nedro.problemCount
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
    investment: sectorRow.investment,
    projects: sectorRow.projectCount ?? 0,
    jobs: sectorRow.jobCount ?? 0,
    problems: totalProblemCount,
  }

  const chartValues =
    activeIndicatorKey === 'problems'
      ? problemSectorLabels.map(
          (sector) => sectorData[sector.key]?.problemCount ?? 0,
        )
      : yearly[activeIndicatorKey]

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
                    .sort(
                      (first, second) =>
                        (first.sortOrder ?? Number.MAX_SAFE_INTEGER) -
                          (second.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
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
                    : growthPercent(yearly[indicator.key])
                const displayValue = getAnalyticsDisplay(value, indicator)

                const content = (
                  <>
                    <span>{indicator.shortLabel}</span>
                    <strong>
                      {displayValue.value}
                      <small>{displayValue.unit}</small>
                    </strong>
                    {indicator.key === 'problems' ? (
                      <p>Жоба + 4 сектор →</p>
                    ) : seriesGrowth !== null ? (
                      <p>
                        {seriesGrowth >= 0 ? '+' : ''}
                        {seriesGrowth.toFixed(1)}% кезең ішінде
                      </p>
                    ) : (
                      <p>Салыстыруға дерек жоқ</p>
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
                      : `${yearRangeLabel} аралығында басталған жобалар`}
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
                {selectedDistrict.subtype === 'city'
                  ? 'Қала бетіне өту'
                  : 'Аудан бетіне өту'}
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
