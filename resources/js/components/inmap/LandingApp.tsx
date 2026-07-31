import { Html, Line, Scroll, ScrollControls, useScroll } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  GridHelper,
  Group,
  InstancedMesh,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Path,
  PerspectiveCamera,
  PointLight,
  Shape,
  Vector3,
} from 'three'
import elevationRaw from './data/turkistan-elevation.json?raw'
import districtsRaw from './data/turkistan-districts.geojson?raw'
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
  columns: number
  rows: number
  minimumElevation: number
  maximumElevation: number
  city: {
    longitude: number
    latitude: number
    elevation: number
  }
  elevations: number[]
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

const boundaryData = JSON.parse(boundaryRaw) as BoundaryData
const elevationData = JSON.parse(elevationRaw) as ElevationData
const districtData = JSON.parse(districtsRaw) as DistrictData
const regionRings = boundaryData.features[0].geometry.coordinates
const [minLongitude, minLatitude, maxLongitude, maxLatitude] =
  elevationData.bbox

const MAP_MAX_SIZE = 14
const ELEVATION_SCALE = 0.00065

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

function elevationToWorldHeight(elevation: number) {
  return Math.max(0.04, (elevation - 30) * ELEVATION_SCALE)
}

function sampleElevation(longitude: number, latitude: number) {
  const { columns, rows, elevations } = elevationData
  const columnPosition = MathUtils.clamp(
    ((longitude - minLongitude) / (maxLongitude - minLongitude)) * columns,
    0,
    columns,
  )
  const rowPosition = MathUtils.clamp(
    ((maxLatitude - latitude) / (maxLatitude - minLatitude)) * rows,
    0,
    rows,
  )
  const leftColumn = Math.floor(columnPosition)
  const rightColumn = Math.min(columns, leftColumn + 1)
  const topRow = Math.floor(rowPosition)
  const bottomRow = Math.min(rows, topRow + 1)
  const horizontalMix = columnPosition - leftColumn
  const verticalMix = rowPosition - topRow
  const topLeft = elevations[topRow * (columns + 1) + leftColumn]
  const topRight = elevations[topRow * (columns + 1) + rightColumn]
  const bottomLeft = elevations[bottomRow * (columns + 1) + leftColumn]
  const bottomRight = elevations[bottomRow * (columns + 1) + rightColumn]
  const top = MathUtils.lerp(topLeft, topRight, horizontalMix)
  const bottom = MathUtils.lerp(bottomLeft, bottomRight, horizontalMix)

  return MathUtils.lerp(top, bottom, verticalMix)
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

function isInsideRegion(longitude: number, latitude: number) {
  if (!isPointInRing(longitude, latitude, regionRings[0])) return false

  return !regionRings
    .slice(1)
    .some((hole) => isPointInRing(longitude, latitude, hole))
}

function createTerrainGeometry() {
  const geometry = new BufferGeometry()
  const { columns, rows, elevations } = elevationData
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []

  const lowland = new Color('#115e59')
  const steppe = new Color('#14b8a6')
  const mountain = new Color('#67e8f9')
  const peak = new Color('#ecfeff')
  const vertexColor = new Color()

  for (let row = 0; row <= rows; row += 1) {
    const latitude =
      maxLatitude - (row / rows) * (maxLatitude - minLatitude)

    for (let column = 0; column <= columns; column += 1) {
      const longitude =
        minLongitude +
        (column / columns) * (maxLongitude - minLongitude)
      const elevation = elevations[row * (columns + 1) + column]
      const { x, z } = projectCoordinate([longitude, latitude])
      const height = elevationToWorldHeight(elevation)
      const normalizedElevation = MathUtils.clamp(
        (elevation - 100) / 3400,
        0,
        1,
      )

      positions.push(x, height, z)

      if (normalizedElevation < 0.3) {
        vertexColor
          .copy(lowland)
          .lerp(steppe, normalizedElevation / 0.3)
      } else if (normalizedElevation < 0.75) {
        vertexColor
          .copy(steppe)
          .lerp(mountain, (normalizedElevation - 0.3) / 0.45)
      } else {
        vertexColor
          .copy(mountain)
          .lerp(peak, (normalizedElevation - 0.75) / 0.25)
      }

      colors.push(vertexColor.r, vertexColor.g, vertexColor.b)
    }
  }

  for (let row = 0; row < rows; row += 1) {
    const centerLatitude =
      maxLatitude - ((row + 0.5) / rows) * (maxLatitude - minLatitude)

    for (let column = 0; column < columns; column += 1) {
      const centerLongitude =
        minLongitude +
        ((column + 0.5) / columns) * (maxLongitude - minLongitude)

      if (!isInsideRegion(centerLongitude, centerLatitude)) continue

      const topLeft = row * (columns + 1) + column
      const topRight = topLeft + 1
      const bottomLeft = (row + 1) * (columns + 1) + column
      const bottomRight = bottomLeft + 1

      indices.push(topLeft, bottomLeft, topRight)
      indices.push(topRight, bottomLeft, bottomRight)
    }
  }

  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  return geometry
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

function coordinatesToTerrainLine(coordinates: GeoCoordinate[]) {
  return coordinates.map(([longitude, latitude]) => {
    const { x, z } = projectCoordinate([longitude, latitude])
    const height =
      elevationToWorldHeight(sampleElevation(longitude, latitude)) + 0.055

    return [x, height, z] as [number, number, number]
  })
}

function DistrictBoundaries() {
  const districtLines = useMemo(
    () =>
      districtData.features.flatMap((district) =>
        district.geometry.coordinates.map((coordinates, index) => ({
          key: `${district.properties.osmId}-${index}`,
          points: coordinatesToTerrainLine(coordinates),
        })),
      ),
    [],
  )
  const regionLines = useMemo(
    () => regionRings.map((ring) => coordinatesToTerrainLine(ring)),
    [],
  )

  return (
    <group>
      {districtLines.map((line) => (
        <Line
          key={line.key}
          points={line.points}
          color="#99f6e4"
          lineWidth={1.15}
          opacity={0.82}
          transparent
          renderOrder={4}
        />
      ))}

      {regionLines.map((points, index) => (
        <Line
          key={`region-${index}`}
          points={points}
          color="#ecfeff"
          lineWidth={2.4}
          opacity={0.95}
          transparent
          renderOrder={5}
        />
      ))}
    </group>
  )
}

const projectedCity = projectCoordinate([
  elevationData.city.longitude,
  elevationData.city.latitude,
])
const cityHeight = elevationToWorldHeight(elevationData.city.elevation)
const MAP_CENTER = new Vector3(0, 0.35, 0)
const CITY_TARGET = new Vector3(
  projectedCity.x,
  cityHeight + 0.1,
  projectedCity.z,
)
const TOP_DOWN_POSITION = new Vector3(0, 20, 0.01)
const CITY_APPROACH_POSITION = new Vector3(
  projectedCity.x + 0.8,
  cityHeight + 4.4,
  projectedCity.z + 5.2,
)
const CITY_DRONE_POSITION = new Vector3(
  projectedCity.x + 0.28,
  cityHeight + 1.28,
  projectedCity.z + 2.15,
)
const CITY_DRONE_TARGET = new Vector3(
  projectedCity.x,
  cityHeight + 0.38,
  projectedCity.z,
)
const FACTORY_TARGET = new Vector3(
  projectedCity.x,
  cityHeight + 0.62,
  projectedCity.z,
)
const FACTORY_WORLD_SCALE = 0.42
const FACTORY_ORBIT_RADIUS = 2.05
const FACTORY_ORBIT_HEIGHT = cityHeight + 1.48
const FACTORY_GROUND_HEIGHT = cityHeight + 0.035
const ORBIT_RADIUS = Math.hypot(
  CITY_DRONE_POSITION.x - FACTORY_TARGET.x,
  CITY_DRONE_POSITION.z - FACTORY_TARGET.z,
)
const ORBIT_START_ANGLE = Math.atan2(
  CITY_DRONE_POSITION.z - FACTORY_TARGET.z,
  CITY_DRONE_POSITION.x - FACTORY_TARGET.x,
)
const ORBIT_ARC = Math.PI * 2
const ORBIT_END_ANGLE = ORBIT_START_ANGLE + ORBIT_ARC
const ORBIT_END_POSITION = new Vector3(
  FACTORY_TARGET.x + Math.cos(ORBIT_END_ANGLE) * FACTORY_ORBIT_RADIUS,
  FACTORY_ORBIT_HEIGHT,
  FACTORY_TARGET.z + Math.sin(ORBIT_END_ANGLE) * FACTORY_ORBIT_RADIUS,
)
const PROTECTION_VIEW_TARGET = new Vector3(
  projectedCity.x - 0.5,
  cityHeight + 1.25,
  projectedCity.z + 0.56,
)
const PAN_POSITION = new Vector3(
  projectedCity.x + 3.8,
  cityHeight + 3.2,
  projectedCity.z + 3.4,
)
const ANALYTICS_POSITION = new Vector3(7.2, 10.5, 8.4)
const cameraDestination = new Vector3()
const cameraTargetDestination = new Vector3()
const currentCameraTarget = MAP_CENTER.clone()
const SCROLL_TIMELINE = {
  topViewEnd: 0.125,
  deepZoomStart: 0.3,
  deepZoomEnd: 0.45,
  infrastructureStart: 0.35,
  infrastructureEnd: 0.45,
  factoryRevealStart: 0.45,
  factoryRevealEnd: 0.5,
  factorySceneEnd: 0.625,
  infrastructureExitStart: 0.63,
  infrastructureExitEnd: 0.71,
  protectionRevealStart: 0.64,
  protectionRevealEnd: 0.73,
  protectionPanEnd: 0.75,
  protectionSceneEnd: 0.875,
  analyticsStart: 0.9,
  foregroundExitEnd: 0.925,
  analyticsEnd: 0.96,
} as const

const factoryBoxParts: Array<{
  position: WorldCoordinate
  scale: WorldCoordinate
  rotation?: WorldCoordinate
}> = [
  { position: [0, 0.08, 0], scale: [3.3, 0.16, 2] },
  { position: [-0.45, 0.58, 0], scale: [1.9, 1, 1.25] },
  { position: [0.94, 0.44, -0.12], scale: [0.82, 0.72, 1.05] },
  { position: [-1.25, 0.35, -0.55], scale: [0.62, 0.55, 0.62] },
  { position: [-0.18, 0.29, 0.82], scale: [1.55, 0.42, 0.4] },
  {
    position: [-0.92, 1.12, 0],
    scale: [0.95, 0.1, 1.32],
    rotation: [0, 0, 0.28],
  },
  {
    position: [-0.08, 1.12, 0],
    scale: [0.95, 0.1, 1.32],
    rotation: [0, 0, -0.28],
  },
]

const factoryChimneys: Array<{
  position: WorldCoordinate
  height: number
  radius: number
}> = [
  { position: [1.28, 1.12, -0.55], height: 1.82, radius: 0.13 },
  { position: [0.86, 1, -0.52], height: 1.48, radius: 0.11 },
]

const factorySilos: Array<{
  position: WorldCoordinate
  height: number
}> = [
  { position: [1.18, 0.58, 0.55], height: 0.92 },
  { position: [0.68, 0.52, 0.58], height: 0.8 },
]

const factoryWindows: WorldCoordinate[] = [
  [-1.05, 0.62, 0.64],
  [-0.7, 0.62, 0.64],
  [-0.35, 0.62, 0.64],
  [0, 0.62, 0.64],
  [0.35, 0.62, 0.64],
  [-1.28, 0.39, -0.22],
]

interface CityBuilding {
  position: [x: number, z: number]
  footprint: [width: number, depth: number]
  height: number
  delay: number
}

const CITY_BUILDING_COUNT = 42
const buildingTransform = new Object3D()

function createCityBuildings(count: number): CityBuilding[] {
  let seed = 8247
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  return Array.from({ length: count }, (_, index) => {
    const angle = random() * Math.PI * 2
    const radius = 0.78 + Math.sqrt(random()) * 1.25

    return {
      position: [
        Math.cos(angle) * radius + (random() - 0.5) * 0.16,
        Math.sin(angle) * radius + (random() - 0.5) * 0.16,
      ],
      footprint: [0.12 + random() * 0.18, 0.12 + random() * 0.2],
      height: 0.24 + random() * 0.92,
      delay: (index % 9) * 0.018,
    }
  })
}

function smoothRange(offset: number, start: number, end: number) {
  return MathUtils.smoothstep(
    MathUtils.clamp((offset - start) / (end - start), 0, 1),
    0,
    1,
  )
}

function getDistrictCenter(district: DistrictData['features'][number]) {
  const coordinates = district.geometry.coordinates.flat()
  const center = coordinates.reduce(
    (sum, [longitude, latitude]) => {
      sum.longitude += longitude
      sum.latitude += latitude
      return sum
    },
    { longitude: 0, latitude: 0 },
  )

  return {
    longitude: center.longitude / coordinates.length,
    latitude: center.latitude / coordinates.length,
  }
}

interface AnalyticsColumn {
  key: string
  x: number
  z: number
  baseHeight: number
  height: number
  delay: number
}

function separateNearbyAnalyticsColumns(columns: AnalyticsColumn[]) {
  const separated = columns.map((column) => ({ ...column }))
  const minimumDistance = 0.82

  for (let pass = 0; pass < 8; pass += 1) {
    for (let first = 0; first < separated.length; first += 1) {
      for (let second = first + 1; second < separated.length; second += 1) {
        const firstColumn = separated[first]
        const secondColumn = separated[second]
        let deltaX = secondColumn.x - firstColumn.x
        let deltaZ = secondColumn.z - firstColumn.z
        let distance = Math.hypot(deltaX, deltaZ)

        if (distance >= minimumDistance) continue

        if (distance < 0.001) {
          const angle = (first * 2.4 + second * 1.7) % (Math.PI * 2)
          deltaX = Math.cos(angle)
          deltaZ = Math.sin(angle)
          distance = 1
        }

        const displacement = (minimumDistance - distance) * 0.5
        const directionX = deltaX / distance
        const directionZ = deltaZ / distance

        firstColumn.x -= directionX * displacement
        firstColumn.z -= directionZ * displacement
        secondColumn.x += directionX * displacement
        secondColumn.z += directionZ * displacement
      }
    }
  }

  return separated
}

const analyticsColumns = separateNearbyAnalyticsColumns(
  districtData.features.map((district, index) => {
    const center = getDistrictCenter(district)
    const projected = projectCoordinate([center.longitude, center.latitude])
    const elevation = elevationToWorldHeight(
      sampleElevation(center.longitude, center.latitude),
    )

    return {
      key: district.properties.osmId,
      x: projected.x,
      z: projected.z,
      baseHeight: elevation + 0.06,
      height: 0.52 + ((index * 0.37) % 0.92),
      delay: index * 0.0015,
    }
  }),
)

function CityInfrastructure() {
  const scroll = useScroll()
  const groupRef = useRef<Group>(null)
  const gridRef = useRef<GridHelper>(null)
  const buildingsRef = useRef<InstancedMesh>(null)
  const buildingMaterialRef = useRef<MeshStandardMaterial>(null)
  const lightRef = useRef<PointLight>(null)
  const buildings = useMemo(
    () => createCityBuildings(CITY_BUILDING_COUNT),
    [],
  )

  useFrame(() => {
    const revealProgress = smoothRange(
      scroll.offset,
      SCROLL_TIMELINE.infrastructureStart,
      SCROLL_TIMELINE.infrastructureEnd,
    )
    const exitProgress = smoothRange(
      scroll.offset,
      SCROLL_TIMELINE.infrastructureExitStart,
      SCROLL_TIMELINE.infrastructureExitEnd,
    )
    const presence = revealProgress * (1 - exitProgress)

    if (groupRef.current) {
      groupRef.current.visible = presence > 0.001
      groupRef.current.position.y =
        cityHeight + 0.035 - exitProgress * 0.28
    }

    if (gridRef.current) {
      const materials = Array.isArray(gridRef.current.material)
        ? gridRef.current.material
        : [gridRef.current.material]

      materials.forEach((material) => {
        material.transparent = true
        material.depthWrite = false
        material.opacity = MathUtils.lerp(0, 0.72, presence)
      })
    }

    if (buildingsRef.current) {
      buildings.forEach((building, index) => {
        const buildingProgress = MathUtils.smoothstep(
          MathUtils.clamp(
            (revealProgress - building.delay) / (1 - building.delay),
            0,
            1,
          ),
          0,
          1,
        )
        const height =
          building.height *
          buildingProgress *
          MathUtils.lerp(1, 0.12, exitProgress)

        buildingTransform.position.set(
          building.position[0],
          height * 0.5,
          building.position[1],
        )
        buildingTransform.scale.set(
          building.footprint[0],
          Math.max(0.001, height),
          building.footprint[1],
        )
        buildingTransform.updateMatrix()
        buildingsRef.current?.setMatrixAt(index, buildingTransform.matrix)
      })

      buildingsRef.current.instanceMatrix.needsUpdate = true
    }

    if (buildingMaterialRef.current) {
      buildingMaterialRef.current.opacity = MathUtils.lerp(
        0,
        0.3,
        presence,
      )
      buildingMaterialRef.current.emissiveIntensity = MathUtils.lerp(
        0,
        1.8,
        presence,
      )
    }

    if (lightRef.current) {
      lightRef.current.intensity = MathUtils.lerp(0, 2, presence)
    }
  })

  return (
    <group
      ref={groupRef}
      position={[projectedCity.x, cityHeight + 0.035, projectedCity.z]}
      visible={false}
    >
      <gridHelper
        ref={gridRef}
        args={[4.4, 24, '#67e8f9', '#0891b2']}
        position-y={0.008}
        renderOrder={6}
      />

      <instancedMesh
        ref={buildingsRef}
        args={[undefined, undefined, buildings.length]}
        castShadow
      >
        <boxGeometry />
        <meshStandardMaterial
          ref={buildingMaterialRef}
          color="#67e8f9"
          emissive="#06b6d4"
          emissiveIntensity={0}
          roughness={0.38}
          metalness={0.18}
          wireframe
          transparent
          opacity={0}
          depthWrite={false}
        />
      </instancedMesh>

      <pointLight
        ref={lightRef}
        color="#22d3ee"
        intensity={0}
        distance={5}
        position={[0, 1.1, 0]}
      />
    </group>
  )
}

function ProjectMockup() {
  const scroll = useScroll()
  const groupRef = useRef<Group>(null)
  const lightRef = useRef<PointLight>(null)
  const wireMaterialRefs = useRef<Array<MeshBasicMaterial | null>>([])
  const accentMaterialRefs = useRef<Array<MeshBasicMaterial | null>>([])

  useFrame(({ clock }) => {
    if (!groupRef.current) return

    const progress = smoothRange(
      scroll.offset,
      SCROLL_TIMELINE.factoryRevealStart,
      SCROLL_TIMELINE.factoryRevealEnd,
    )
    const exitProgress = smoothRange(
      scroll.offset,
      SCROLL_TIMELINE.protectionSceneEnd,
      SCROLL_TIMELINE.foregroundExitEnd,
    )
    const presence = progress * (1 - exitProgress)
    const easedProgress = 1 - Math.pow(1 - progress, 3)
    const pop = 1 + Math.sin(progress * Math.PI) * 0.12
    const idlePulse =
      progress > 0.999 ? 1 + Math.sin(clock.elapsedTime * 2.1) * 0.012 : 1
    const scale = MathUtils.lerp(
      0,
      FACTORY_WORLD_SCALE,
      easedProgress,
    ) * pop * idlePulse * (1 - exitProgress)

    groupRef.current.visible = presence > 0.001
    groupRef.current.position.y =
      FACTORY_GROUND_HEIGHT -
      MathUtils.lerp(0.38, 0, easedProgress) -
      exitProgress * 0.18
    groupRef.current.scale.setScalar(scale)
    groupRef.current.rotation.y = MathUtils.lerp(
      -0.14,
      0,
      easedProgress,
    )
    wireMaterialRefs.current.forEach((material) => {
      if (material) material.opacity = MathUtils.lerp(0, 0.92, presence)
    })
    accentMaterialRefs.current.forEach((material) => {
      if (material) material.opacity = MathUtils.lerp(0, 1, presence)
    })
    if (lightRef.current) lightRef.current.intensity = 4.2 * presence
  })

  return (
    <group
      ref={groupRef}
      position={[
        projectedCity.x,
        FACTORY_GROUND_HEIGHT,
        projectedCity.z,
      ]}
      visible={false}
    >
      {factoryBoxParts.map(({ position, scale, rotation }, index) => (
        <mesh
          key={`box-${index}`}
          position={position}
          rotation={rotation}
          scale={scale}
        >
          <boxGeometry />
          <meshBasicMaterial
            ref={(material) => {
              wireMaterialRefs.current[index] = material
            }}
            color="#fb923c"
            wireframe
            transparent
            opacity={0}
          />
        </mesh>
      ))}

      {factoryChimneys.map(({ position, height, radius }, index) => (
        <group key={`chimney-${index}`}>
          <mesh position={position}>
            <cylinderGeometry args={[radius * 0.78, radius, height, 14]} />
            <meshBasicMaterial
              ref={(material) => {
                wireMaterialRefs.current[20 + index] = material
              }}
              color="#fbbf24"
              wireframe
              transparent
              opacity={0}
            />
          </mesh>
          <mesh
            position={[
              position[0],
              position[1] + height * 0.5,
              position[2],
            ]}
            rotation-x={Math.PI / 2}
          >
            <torusGeometry args={[radius * 0.92, 0.026, 8, 24]} />
            <meshBasicMaterial
              ref={(material) => {
                accentMaterialRefs.current[10 + index] = material
              }}
              color="#fff7ae"
              transparent
              opacity={0}
            />
          </mesh>
        </group>
      ))}

      {factorySilos.map(({ position, height }, index) => (
        <group key={`silo-${index}`}>
          <mesh position={position}>
            <cylinderGeometry args={[0.29, 0.29, height, 16]} />
            <meshBasicMaterial
              ref={(material) => {
                wireMaterialRefs.current[30 + index] = material
              }}
              color="#fb923c"
              wireframe
              transparent
              opacity={0}
            />
          </mesh>
          <mesh
            position={[
              position[0],
              position[1] + height * 0.5 + 0.13,
              position[2],
            ]}
          >
            <coneGeometry args={[0.3, 0.26, 16]} />
            <meshBasicMaterial
              ref={(material) => {
                wireMaterialRefs.current[40 + index] = material
              }}
              color="#fbbf24"
              wireframe
              transparent
              opacity={0}
            />
          </mesh>
        </group>
      ))}

      <mesh position={[0.52, 0.83, 0.54]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.055, 0.055, 1.28, 10]} />
        <meshBasicMaterial
          ref={(material) => {
            wireMaterialRefs.current[50] = material
          }}
          color="#fff7ae"
          wireframe
          transparent
          opacity={0}
        />
      </mesh>

      <mesh position={[1.12, 0.98, 0.22]}>
        <cylinderGeometry args={[0.05, 0.05, 0.78, 10]} />
        <meshBasicMaterial
          ref={(material) => {
            wireMaterialRefs.current[51] = material
          }}
          color="#fff7ae"
          wireframe
          transparent
          opacity={0}
        />
      </mesh>

      {factoryWindows.map((position, index) => (
        <mesh key={`window-${index}`} position={position} scale={[1, 1, 0.45]}>
          <boxGeometry args={[0.24, 0.11, 0.06]} />
          <meshBasicMaterial
            ref={(material) => {
              accentMaterialRefs.current[index] = material
            }}
            color="#fef3c7"
            transparent
            opacity={0}
          />
        </mesh>
      ))}

      <mesh position={[0, 0.045, 0]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[1.95, 0.025, 8, 64]} />
        <meshBasicMaterial
          ref={(material) => {
            accentMaterialRefs.current[20] = material
          }}
          color="#f59e0b"
          transparent
          opacity={0}
        />
      </mesh>

      <pointLight
        ref={lightRef}
        color="#f59e0b"
        intensity={0}
        distance={6}
        position={[0, 1.2, 0]}
      />
    </group>
  )
}

function ProtectionShield() {
  const scroll = useScroll()
  const groupRef = useRef<Group>(null)
  const shieldMaterialRef = useRef<MeshStandardMaterial>(null)
  const insetMaterialRef = useRef<MeshStandardMaterial>(null)
  const haloMaterialRef = useRef<MeshBasicMaterial>(null)
  const lightRef = useRef<PointLight>(null)
  const lockMaterialRefs = useRef<Array<MeshBasicMaterial | null>>([])
  const shieldShape = useMemo(() => {
    const shape = new Shape()

    shape.moveTo(0, 0.68)
    shape.bezierCurveTo(0.22, 0.62, 0.39, 0.53, 0.52, 0.43)
    shape.lineTo(0.47, -0.12)
    shape.bezierCurveTo(0.43, -0.48, 0.22, -0.72, 0, -0.84)
    shape.bezierCurveTo(-0.22, -0.72, -0.43, -0.48, -0.47, -0.12)
    shape.lineTo(-0.52, 0.43)
    shape.bezierCurveTo(-0.39, 0.53, -0.22, 0.62, 0, 0.68)

    return shape
  }, [])

  useFrame(({ camera, clock }) => {
    if (!groupRef.current) return

    const progress = smoothRange(
      scroll.offset,
      SCROLL_TIMELINE.protectionRevealStart,
      SCROLL_TIMELINE.protectionRevealEnd,
    )
    const exitProgress = smoothRange(
      scroll.offset,
      SCROLL_TIMELINE.protectionSceneEnd,
      SCROLL_TIMELINE.foregroundExitEnd,
    )
    const presence = progress * (1 - exitProgress)
    const easedProgress = 1 - Math.pow(1 - progress, 3)
    const pulse =
      progress > 0.999 ? 1 + Math.sin(clock.elapsedTime * 2.2) * 0.025 : 1

    groupRef.current.visible = presence > 0.001
    groupRef.current.position.y =
      cityHeight +
      MathUtils.lerp(0.78, 1.62, easedProgress) +
      exitProgress * 0.12
    groupRef.current.scale.setScalar(
      Math.max(0.001, easedProgress * pulse * 0.62 * (1 - exitProgress)),
    )
    groupRef.current.lookAt(camera.position)
    groupRef.current.rotation.z =
      Math.sin(clock.elapsedTime * 1.1) * 0.025 * easedProgress

    if (shieldMaterialRef.current) {
      shieldMaterialRef.current.opacity = presence * 0.92
      shieldMaterialRef.current.emissiveIntensity = MathUtils.lerp(
        0,
        2.6,
        presence,
      )
    }

    if (insetMaterialRef.current) {
      insetMaterialRef.current.opacity = presence * 0.22
    }

    if (haloMaterialRef.current) {
      haloMaterialRef.current.opacity =
        presence * (0.34 + Math.sin(clock.elapsedTime * 2.4) * 0.1)
    }

    lockMaterialRefs.current.forEach((material) => {
      if (material) material.opacity = presence
    })
    if (lightRef.current) lightRef.current.intensity = 3.2 * presence
  })

  return (
    <group
      ref={groupRef}
      position={[projectedCity.x, cityHeight + 0.78, projectedCity.z]}
      visible={false}
    >
      <mesh castShadow>
        <extrudeGeometry
          args={[
            shieldShape,
            {
              depth: 0.16,
              bevelEnabled: true,
              bevelSegments: 3,
              bevelSize: 0.045,
              bevelThickness: 0.045,
            },
          ]}
        />
        <meshStandardMaterial
          ref={shieldMaterialRef}
          color="#5eead4"
          emissive="#10b981"
          emissiveIntensity={0}
          metalness={0.54}
          roughness={0.18}
          transparent
          opacity={0}
        />
      </mesh>

      <mesh position-z={0.205} scale={0.78}>
        <shapeGeometry args={[shieldShape, 3]} />
        <meshStandardMaterial
          ref={insetMaterialRef}
          color="#042f2e"
          emissive="#0f766e"
          emissiveIntensity={1.4}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      <group position={[0, -0.02, 0.235]}>
        <mesh position={[0, -0.12, 0.035]}>
          <boxGeometry args={[0.5, 0.4, 0.08]} />
          <meshBasicMaterial
            ref={(material) => {
              lockMaterialRefs.current[0] = material
            }}
            color="#ecfdf5"
            transparent
            opacity={0}
          />
        </mesh>
        <mesh position={[0, 0.07, 0.025]}>
          <torusGeometry args={[0.18, 0.05, 10, 32, Math.PI]} />
          <meshBasicMaterial
            ref={(material) => {
              lockMaterialRefs.current[1] = material
            }}
            color="#ecfdf5"
            transparent
            opacity={0}
          />
        </mesh>
        <mesh position={[0, -0.11, 0.081]}>
          <circleGeometry args={[0.052, 24]} />
          <meshBasicMaterial
            ref={(material) => {
              lockMaterialRefs.current[2] = material
            }}
            color="#064e3b"
            transparent
            opacity={0}
          />
        </mesh>
        <mesh position={[0, -0.2, 0.081]}>
          <boxGeometry args={[0.038, 0.11, 0.018]} />
          <meshBasicMaterial
            ref={(material) => {
              lockMaterialRefs.current[3] = material
            }}
            color="#064e3b"
            transparent
            opacity={0}
          />
        </mesh>
      </group>

      <mesh position-z={-0.03}>
        <torusGeometry args={[0.92, 0.018, 10, 64]} />
        <meshBasicMaterial
          ref={haloMaterialRef}
          color="#6ee7b7"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      <pointLight
        ref={lightRef}
        color="#34d399"
        intensity={0}
        distance={5}
        position={[0, 0, 0.45]}
      />
    </group>
  )
}

function AnalyticsColumns() {
  const scroll = useScroll()
  const barRefs = useRef<Array<Mesh | null>>([])
  const capRefs = useRef<Array<Mesh | null>>([])

  useFrame(({ clock }) => {
    analyticsColumns.forEach((column, index) => {
      const progress = smoothRange(
        scroll.offset,
        SCROLL_TIMELINE.analyticsStart + column.delay,
        SCROLL_TIMELINE.analyticsEnd + column.delay,
      )
      const height = column.height * progress
      const bar = barRefs.current[index]
      const cap = capRefs.current[index]

      if (bar) {
        const material = bar.material as MeshStandardMaterial

        bar.visible = progress > 0.001
        bar.position.y = column.baseHeight + height * 0.5
        bar.scale.y = Math.max(0.001, height)
        material.opacity = progress * 0.86
      }

      if (cap) {
        const material = cap.material as MeshStandardMaterial

        cap.visible = progress > 0.001
        cap.position.y = column.baseHeight + height
        cap.scale.setScalar(
          progress * (1 + Math.sin(clock.elapsedTime * 2.8 + index) * 0.12),
        )
        material.opacity = progress * 0.86
      }
    })
  })

  return (
    <group>
      {analyticsColumns.map((column, index) => (
        <group key={column.key} position-x={column.x} position-z={column.z}>
          <mesh
            ref={(node) => {
              barRefs.current[index] = node
            }}
            visible={false}
          >
            <cylinderGeometry args={[0.065, 0.095, 1, 12]} />
            <meshStandardMaterial
              color="#67e8f9"
              emissive="#0891b2"
              emissiveIntensity={4}
              metalness={0.18}
              roughness={0.22}
              transparent
              opacity={0}
            />
          </mesh>
          <mesh
            ref={(node) => {
              capRefs.current[index] = node
            }}
            visible={false}
          >
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial
              color="#67e8f9"
              emissive="#0891b2"
              emissiveIntensity={4}
              metalness={0.18}
              roughness={0.22}
              transparent
              opacity={0}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function MapGeometry() {
  const scroll = useScroll()
  const mapRef = useRef<Group>(null)
  const markerRef = useRef<Group>(null)
  const terrainGeometry = useMemo(() => createTerrainGeometry(), [])
  const regionShape = useMemo(() => createRegionShape(), [])

  useFrame(({ clock }) => {
    if (mapRef.current) {
      mapRef.current.position.y =
        Math.sin(clock.elapsedTime * 0.65) * 0.02 - 0.12
    }

    if (markerRef.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 2.4) * 0.12
      const infrastructureTransition = smoothRange(
        scroll.offset,
        SCROLL_TIMELINE.infrastructureStart,
        SCROLL_TIMELINE.infrastructureEnd,
      )

      markerRef.current.visible = infrastructureTransition < 0.999
      markerRef.current.scale.setScalar(
        Math.max(0.001, pulse * (1 - infrastructureTransition)),
      )
    }
  })

  return (
    <group ref={mapRef}>
      <mesh
        castShadow
        receiveShadow
        geometry={terrainGeometry}
        position-y={0.02}
      >
        <meshStandardMaterial
          vertexColors
          flatShading
          metalness={0.08}
          roughness={0.76}
        />
      </mesh>

      <mesh position-y={-0.43} rotation-x={-Math.PI / 2} receiveShadow>
        <extrudeGeometry
          args={[
            regionShape,
            {
              depth: 0.42,
              bevelEnabled: true,
              bevelSegments: 2,
              bevelSize: 0.045,
              bevelThickness: 0.04,
            },
          ]}
        />
        <meshStandardMaterial
          color="#083344"
          emissive="#042f2e"
          emissiveIntensity={0.3}
          metalness={0.28}
          roughness={0.75}
        />
      </mesh>

      <DistrictBoundaries />
      <CityInfrastructure />
      <ProjectMockup />
      <ProtectionShield />
      <AnalyticsColumns />

      <group
        ref={markerRef}
        position={[projectedCity.x, cityHeight + 0.16, projectedCity.z]}
      >
        <mesh castShadow>
          <cylinderGeometry args={[0.085, 0.14, 0.3, 24]} />
          <meshStandardMaterial
            color="#ecfeff"
            emissive="#22d3ee"
            emissiveIntensity={3}
          />
        </mesh>
        <mesh position-y={0.18} rotation-x={-Math.PI / 2}>
          <torusGeometry args={[0.24, 0.025, 12, 48]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.8} />
        </mesh>
        <pointLight color="#22d3ee" intensity={2.4} distance={3.5} />
      </group>
    </group>
  )
}

function CameraRig() {
  const scroll = useScroll()

  useFrame(({ camera, size }, delta) => {
    const offset = scroll.offset
    const isMobileLayout = size.width < 640

    if (offset < SCROLL_TIMELINE.topViewEnd) {
      cameraDestination.copy(TOP_DOWN_POSITION)
      cameraTargetDestination.copy(MAP_CENTER)
    } else if (offset < SCROLL_TIMELINE.deepZoomStart) {
      const progress = smoothRange(
        offset,
        SCROLL_TIMELINE.topViewEnd,
        SCROLL_TIMELINE.deepZoomStart,
      )
      cameraDestination.lerpVectors(
        TOP_DOWN_POSITION,
        CITY_APPROACH_POSITION,
        progress,
      )
      cameraTargetDestination.lerpVectors(MAP_CENTER, CITY_TARGET, progress)
    } else if (offset < SCROLL_TIMELINE.deepZoomEnd) {
      const progress = smoothRange(
        offset,
        SCROLL_TIMELINE.deepZoomStart,
        SCROLL_TIMELINE.deepZoomEnd,
      )

      cameraDestination.lerpVectors(
        CITY_APPROACH_POSITION,
        CITY_DRONE_POSITION,
        progress,
      )
      cameraTargetDestination.lerpVectors(
        CITY_TARGET,
        CITY_DRONE_TARGET,
        progress,
      )
    } else if (offset < SCROLL_TIMELINE.factorySceneEnd) {
      const orbitProgress = smoothRange(
        offset,
        SCROLL_TIMELINE.factoryRevealStart,
        SCROLL_TIMELINE.factorySceneEnd,
      )
      const angle = ORBIT_START_ANGLE + ORBIT_ARC * orbitProgress
      const radius = MathUtils.lerp(
        ORBIT_RADIUS,
        FACTORY_ORBIT_RADIUS,
        orbitProgress,
      )
      const height = MathUtils.lerp(
        CITY_DRONE_POSITION.y,
        FACTORY_ORBIT_HEIGHT,
        orbitProgress,
      )

      cameraDestination.set(
        FACTORY_TARGET.x + Math.cos(angle) * radius,
        height + Math.sin(orbitProgress * Math.PI) * 0.12,
        FACTORY_TARGET.z + Math.sin(angle) * radius,
      )
      cameraTargetDestination.lerpVectors(
        CITY_DRONE_TARGET,
        FACTORY_TARGET,
        smoothRange(
          offset,
          SCROLL_TIMELINE.factoryRevealStart,
          SCROLL_TIMELINE.factoryRevealEnd,
        ),
      )
    } else if (offset < SCROLL_TIMELINE.protectionSceneEnd) {
      const progress = smoothRange(
        offset,
        SCROLL_TIMELINE.factorySceneEnd,
        SCROLL_TIMELINE.protectionPanEnd,
      )
      cameraDestination.lerpVectors(
        ORBIT_END_POSITION,
        PAN_POSITION,
        progress,
      )
      cameraTargetDestination.lerpVectors(
        FACTORY_TARGET,
        PROTECTION_VIEW_TARGET,
        progress,
      )
    } else {
      const progress = smoothRange(
        offset,
        SCROLL_TIMELINE.protectionSceneEnd,
        1,
      )
      const fastZoomProgress = 1 - Math.pow(1 - progress, 3)

      cameraDestination.lerpVectors(
        PAN_POSITION,
        ANALYTICS_POSITION,
        fastZoomProgress,
      )
      cameraTargetDestination.lerpVectors(
        PROTECTION_VIEW_TARGET,
        MAP_CENTER,
        progress,
      )
    }

    const damping = 1 - Math.exp(-delta * 4)

    if (isMobileLayout) {
      cameraTargetDestination.y -= 0.42
    }

    if (camera instanceof PerspectiveCamera) {
      const targetFov = isMobileLayout ? 58 : size.width < 1024 ? 50 : 45
      const nextFov = MathUtils.lerp(camera.fov, targetFov, damping)

      if (Math.abs(nextFov - camera.fov) > 0.01) {
        camera.fov = nextFov
        camera.updateProjectionMatrix()
      }
    }

    camera.position.lerp(cameraDestination, damping)
    currentCameraTarget.lerp(cameraTargetDestination, damping)
    camera.lookAt(currentCameraTarget)
  })

  return null
}

function HtmlOverlay() {
  const scroll = useScroll()
  const projectCardRef = useRef<HTMLDivElement>(null)

  useFrame(() => {
    const revealProgress = smoothRange(
      scroll.offset,
      SCROLL_TIMELINE.factoryRevealStart,
      SCROLL_TIMELINE.factoryRevealEnd,
    )

    if (projectCardRef.current) {
      projectCardRef.current.style.opacity = String(
        MathUtils.lerp(0, 1, revealProgress),
      )
      projectCardRef.current.style.transform = `translate3d(${MathUtils.lerp(
        -36,
        0,
        revealProgress,
      )}px, 0, 0)`
    }
  })

  return (
    <Scroll html style={{ width: '100%' }}>
      <main className="story w-full text-white">
        <section className="story-section story-section--hero">
          <div className="story-hero">
            <p className="story-hero__eyebrow">Реальные геоданные региона</p>
            <h1 className="story-hero__title">IN-MAP</h1>
            <p className="story-hero__lead">
              Единая цифровая экосистема инвестиций Туркестанской области.
            </p>
            <p className="story-hero__copy">
              От подбора идеального участка до запуска производства — всё в
              одном управляемом контуре.
            </p>
            <a href="/login" className="story-hero__cta">
              Войти в систему
            </a>
          </div>
        </section>

        <section className="story-section story-section--content">
          <div className="story-panel">
            <p className="story-panel__eyebrow">Точный подбор локации</p>
            <h2 className="story-panel__title">
              Умный AI-навигатор{' '}
              <span>(г. Туркестан)</span>
            </h2>
            <p className="story-panel__copy">
              Система автоматически сопоставляет спутниковые данные (NDVI),
              инфраструктуру, доступность воды и электричества, чтобы предложить
              идеальную зону для инвестиций.
            </p>
          </div>
        </section>

        <section className="story-section story-section--content">
          <div
            ref={projectCardRef}
            className="story-panel opacity-0 will-change-[opacity,transform]"
          >
            <p className="story-panel__eyebrow">Единый контур управления</p>
            <h2 className="story-panel__title">Цифровой паспорт проекта</h2>
            <p className="story-panel__copy">
              Вся жизнь проекта — в одной карточке. Интерактивные дорожные карты,
              контроль сроков и мониторинг строительства прямо на цифровом
              двойнике города.
            </p>
          </div>
        </section>

        <section className="story-section story-section--content">
          <div className="story-panel story-panel--accent-emerald">
            <p className="story-panel__eyebrow">Проблема → решение</p>
            <h2 className="story-panel__title">
              Защита инвестора в реальном времени
            </h2>
            <p className="story-panel__copy">
              Прямой прокурорский надзор для оперативного устранения барьеров.
              Жесткий контроль поручений и 100% подтверждение исполнения через
              фото-доказательства.
            </p>
          </div>
        </section>

        <section className="story-section story-section--analytics">
          <div className="story-panel story-panel--center">
            <p className="story-panel__eyebrow">Объективная картина региона</p>
            <h2 className="story-panel__title">Аналитика как на ладони</h2>
            <p className="story-panel__copy">
              Руководство области видит объективную картину без искажений.
              Сводные дашборды, расчет KPI и генерация презентаций в один клик.
            </p>
            <a href="/login" className="story-panel__cta">
              Перейти к платформе
            </a>
          </div>
        </section>
      </main>
    </Scroll>
  )
}

type InfoPage = 'contacts'

type NavigationItem =
  | { page: InfoPage; label: string }
  | { href: string; label: string; external?: boolean }

const PROJECT_ANALYSIS_URL =
  'https://alpha-turkistan-investor-2026-0722.chatgpt-edu-7368.chatgpt.site/'

const navigationItems: NavigationItem[] = [
  { href: '/dashboard', label: 'Районы области' },
  {
    href: PROJECT_ANALYSIS_URL,
    label: 'Анализ проекта',
    external: true,
  },
  { page: 'contacts', label: 'Контакты' },
]

function getDistrictDisplayName(name: string) {
  const displayNames: Record<string, string> = {
    'Арысь городская администрация': 'г. Арысь',
    'городская администрация Кентау': 'г. Кентау',
    'район Байдибека': 'Байдибекский район',
    'Туркестан Г.А.': 'г. Туркестан',
  }

  return displayNames[name] ?? name
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

const districtMapColors = [
  '#0e7490',
  '#0f766e',
  '#0891b2',
  '#0d9488',
  '#155e75',
  '#115e59',
]

const districtMapModels = districtData.features.map((district, index) => {
  const rings = district.geometry.coordinates.map(simplifyDistrictRing)
  const projectedPoints = rings.flatMap((ring) =>
    ring.map((coordinate) => projectCoordinate(coordinate)),
  )
  const minimumX = Math.min(...projectedPoints.map((point) => point.x))
  const maximumX = Math.max(...projectedPoints.map((point) => point.x))
  const minimumZ = Math.min(...projectedPoints.map((point) => point.z))
  const maximumZ = Math.max(...projectedPoints.map((point) => point.z))

  return {
    id: district.properties.osmId,
    name: getDistrictDisplayName(district.properties.name),
    color: districtMapColors[index % districtMapColors.length],
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
})

type IndicatorKey =
  | 'investment'
  | 'agriculture'
  | 'population'
  | 'employment'
  | 'roads'

interface IndicatorDefinition {
  key: IndicatorKey
  label: string
  shortLabel: string
  unit: string
  decimals: number
  color: string
}

const analyticsYears = [2021, 2022, 2023, 2024, 2025]
const indicatorDefinitions: IndicatorDefinition[] = [
  {
    key: 'investment',
    label: 'Инвестиции в основной капитал',
    shortLabel: 'Инвестиции',
    unit: 'млрд ₸',
    decimals: 1,
    color: '#22d3ee',
  },
  {
    key: 'agriculture',
    label: 'Выпуск сельского хозяйства',
    shortLabel: 'Сельское хозяйство',
    unit: 'млрд ₸',
    decimals: 1,
    color: '#2dd4bf',
  },
  {
    key: 'population',
    label: 'Численность населения',
    shortLabel: 'Население',
    unit: 'тыс. чел.',
    decimals: 0,
    color: '#a5f3fc',
  },
  {
    key: 'employment',
    label: 'Уровень занятости',
    shortLabel: 'Занятость',
    unit: '%',
    decimals: 1,
    color: '#5eead4',
  },
  {
    key: 'roads',
    label: 'Дороги в хорошем состоянии',
    shortLabel: 'Инфраструктура',
    unit: '%',
    decimals: 0,
    color: '#67e8f9',
  },
]

const regionAnalytics: Record<IndicatorKey, number[]> = {
  investment: [612, 721, 846, 1018, 1164],
  agriculture: [748, 862, 978, 1136, 1279],
  population: [2074, 2142, 2211, 2284, 2356],
  employment: [92.4, 93.1, 93.9, 94.6, 95.2],
  roads: [68, 72, 76, 80, 83],
}

function roundAnalyticsValue(value: number, decimals: number) {
  const multiplier = 10 ** decimals
  return Math.round(value * multiplier) / multiplier
}

function getAnalyticsSeries(districtIndex: number | null) {
  if (districtIndex === null) return regionAnalytics

  const share = 0.045 + (districtIndex % 7) * 0.0075
  const developmentOffset = ((districtIndex * 5) % 9) - 4

  return indicatorDefinitions.reduce(
    (series, indicator) => {
      const regionValues = regionAnalytics[indicator.key]

      if (indicator.key === 'employment') {
        series[indicator.key] = regionValues.map((value, yearIndex) =>
          roundAnalyticsValue(
            MathUtils.clamp(
              value + developmentOffset * 0.32 + yearIndex * 0.04,
              87,
              98,
            ),
            indicator.decimals,
          ),
        )
      } else if (indicator.key === 'roads') {
        series[indicator.key] = regionValues.map((value, yearIndex) =>
          roundAnalyticsValue(
            MathUtils.clamp(
              value + developmentOffset * 1.35 + yearIndex * 0.3,
              52,
              96,
            ),
            indicator.decimals,
          ),
        )
      } else {
        series[indicator.key] = regionValues.map((value, yearIndex) => {
          const localMomentum =
            1 + Math.sin(districtIndex * 1.7 + yearIndex * 0.9) * 0.035
          return roundAnalyticsValue(
            value * share * localMomentum,
            indicator.decimals,
          )
        })
      }

      return series
    },
    {} as Record<IndicatorKey, number[]>,
  )
}

function formatAnalyticsValue(
  value: number,
  indicator: IndicatorDefinition,
) {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: indicator.decimals,
    maximumFractionDigits: indicator.decimals,
  }).format(value)
}

function DistrictMapCamera({
  selectedDistrictId,
}: {
  selectedDistrictId: string | null
}) {
  const { camera, size } = useThree()
  const currentTargetRef = useRef(new Vector3())
  const targetDestinationRef = useRef(new Vector3())
  const positionDestinationRef = useRef(new Vector3())
  const selectedDistrict = districtMapModels.find(
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
  district: (typeof districtMapModels)[number]
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
}: {
  selectedDistrictId: string | null
  onSelectDistrict: (districtId: string | null) => void
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

      {districtMapModels.map((district) => (
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
}: {
  indicator: IndicatorDefinition
  values: number[]
}) {
  const maximum = Math.max(...values) * 1.12

  return (
    <div className="analytics-chart" aria-label={indicator.label}>
      {values.map((value, index) => (
        <div className="analytics-chart__column" key={analyticsYears[index]}>
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
          <strong>{analyticsYears[index]}</strong>
        </div>
      ))}
    </div>
  )
}

function DistrictExplorer() {
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(
    null,
  )
  const [activeIndicatorKey, setActiveIndicatorKey] =
    useState<IndicatorKey>('investment')
  const selectedDistrictIndex = districtMapModels.findIndex(
    (district) => district.id === selectedDistrictId,
  )
  const selectedDistrict =
    selectedDistrictIndex >= 0 ? districtMapModels[selectedDistrictIndex] : null
  const analytics = getAnalyticsSeries(
    selectedDistrictIndex >= 0 ? selectedDistrictIndex : null,
  )
  const activeIndicator =
    indicatorDefinitions.find(
      (indicator) => indicator.key === activeIndicatorKey,
    ) ?? indicatorDefinitions[0]
  const activeValues = analytics[activeIndicator.key]
  const growth =
    ((activeValues[activeValues.length - 1] - activeValues[0]) /
      activeValues[0]) *
    100

  return (
    <div className="district-explorer">
      <div className="district-page-intro">
        <div>
          <p className="info-page__eyebrow">Туркестанская область</p>
          <h1>Районы области</h1>
        </div>
        <p>
          Выберите район на 3D-карте. Территория поднимется над картой, а справа
          появится её динамика за последние пять лет.
        </p>
      </div>

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
              shadows
              camera={{ fov: 42, near: 0.1, far: 80 }}
              dpr={[1, 1.5]}
              gl={{
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance',
              }}
            >
              <DistrictMapCamera selectedDistrictId={selectedDistrictId} />
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
              />
            </Canvas>
          </div>

          <div className="district-map-panel__footer">
            <span>
              {selectedDistrict
                ? selectedDistrict.name
                : 'Туркестанская область'}
            </span>
            <p>
              {selectedDistrict
                ? 'Район выделен · нажмите на пустое место для сброса'
                : 'Нажмите на район, чтобы посмотреть показатели'}
            </p>
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
            {indicatorDefinitions.slice(0, 4).map((indicator) => {
              const values = analytics[indicator.key]
              const latestValue = values[values.length - 1]
              const indicatorGrowth =
                ((latestValue - values[0]) / values[0]) * 100

              return (
                <article key={indicator.key}>
                  <span>{indicator.shortLabel}</span>
                  <strong>
                    {formatAnalyticsValue(latestValue, indicator)}
                    <small>{indicator.unit}</small>
                  </strong>
                  <p>+{indicatorGrowth.toFixed(1)}% за 5 лет</p>
                </article>
              )
            })}
          </div>

          <div className="analytics-detail">
            <div className="analytics-detail__header">
              <div>
                <span>Динамика 2021–2025</span>
                <h3>{activeIndicator.label}</h3>
              </div>
              <strong>+{growth.toFixed(1)}%</strong>
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
              values={activeValues}
            />
            <p className="analytics-disclaimer">
              Демонстрационные данные для прототипа · значения не являются
              официальной статистикой
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function ContactPage() {
  return (
    <div className="contact-page">
      <section className="contact-hero">
        <div className="contact-hero__copy">
          <p className="info-page__eyebrow">Открыты к диалогу</p>
          <h1>
            Начнём
            <br />с разговора<span>.</span>
          </h1>
          <p>
            Расскажите о вашей идее, проекте или задаче. Мы свяжем геоданные,
            аналитику и возможности региона в одном решении.
          </p>
        </div>

        <div className="contact-orbit" aria-hidden="true">
          <div className="contact-orbit__ring contact-orbit__ring--outer" />
          <div className="contact-orbit__ring contact-orbit__ring--inner" />
          <div className="contact-orbit__axis contact-orbit__axis--horizontal" />
          <div className="contact-orbit__axis contact-orbit__axis--vertical" />
          <div className="contact-orbit__core">
            <span>IN</span>
            <strong>MAP</strong>
          </div>
          <i className="contact-orbit__satellite" />
          <p>Туркестан · Казахстан</p>
        </div>
      </section>

      <section className="contact-channels" aria-label="Способы связи">
        <a href="tel:+77003100004" className="contact-channel">
          <span className="contact-channel__index">01</span>
          <div>
            <p>Позвонить</p>
            <strong>+7 700 310 00 04</strong>
          </div>
          <span className="contact-channel__arrow" aria-hidden="true">
            ↗
          </span>
        </a>

        <a
          href="mailto:abylaikhan.tastanbekov@ayu.edu.kz"
          className="contact-channel"
        >
          <span className="contact-channel__index">02</span>
          <div>
            <p>Написать</p>
            <strong>abylaikhan.tastanbekov@ayu.edu.kz</strong>
          </div>
          <span className="contact-channel__arrow" aria-hidden="true">
            ↗
          </span>
        </a>
      </section>

      <section className="contact-location">
        <div className="contact-location__heading">
          <p className="info-page__eyebrow">Где нас найти</p>
          <h2>Работаем из сердца Туркестана</h2>
        </div>

        <div className="contact-location__details">
          <article>
            <span>Организация</span>
            <h3>
              Международный казахско-турецкий университет имени Ходжи Ахмеда
              Ясави
            </h3>
          </article>
          <article>
            <span>Адрес</span>
            <h3>
              Республика Казахстан, г. Туркестан,
              <br />
              проспект Бекзата Саттарханова, 29
            </h3>
          </article>
          <a
            href="https://www.google.com/maps/search/?api=1&query=%D0%9C%D0%B5%D0%B6%D0%B4%D1%83%D0%BD%D0%B0%D1%80%D0%BE%D0%B4%D0%BD%D1%8B%D0%B9+%D0%BA%D0%B0%D0%B7%D0%B0%D1%85%D1%81%D0%BA%D0%BE-%D1%82%D1%83%D1%80%D0%B5%D1%86%D0%BA%D0%B8%D0%B9+%D1%83%D0%BD%D0%B8%D0%B2%D0%B5%D1%80%D1%81%D0%B8%D1%82%D0%B5%D1%82+%D0%B8%D0%BC%D0%B5%D0%BD%D0%B8+%D0%A5%D0%BE%D0%B4%D0%B6%D0%B8+%D0%90%D1%85%D0%BC%D0%B5%D0%B4%D0%B0+%D0%AF%D1%81%D0%B0%D0%B2%D0%B8"
            target="_blank"
            rel="noreferrer"
            className="contact-location__map-link"
          >
            <span>Открыть в картах</span>
            <strong aria-hidden="true">↗</strong>
          </a>
        </div>
      </section>

      <div className="contact-closing">
        <span>Есть задача?</span>
        <p>Напишите нам — обсудим, чем IN-MAP может быть полезен.</p>
        <a href="mailto:abylaikhan.tastanbekov@ayu.edu.kz">
          Обсудить проект
          <strong aria-hidden="true">→</strong>
        </a>
      </div>
    </div>
  )
}

function getPageFromHash(): InfoPage | null {
  const page = window.location.hash.replace(/^#\/?/, '')

  return navigationItems.some(
    (item) => 'page' in item && item.page === page,
  )
    ? (page as InfoPage)
    : null
}

function PageContent({ page }: { page: InfoPage }) {
  if (page === 'contacts') {
    return <ContactPage />
  }

  return null
}

function SiteNavigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activePage, setActivePage] = useState<InfoPage | null>(() =>
    getPageFromHash(),
  )

  useEffect(() => {
    const handleHashChange = () => setActivePage(getPageFromHash())
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return

      if (isMenuOpen) {
        setIsMenuOpen(false)
      } else if (activePage) {
        window.location.hash = ''
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activePage, isMenuOpen])

  const openPage = (page: InfoPage) => {
    setIsMenuOpen(false)
    window.history.pushState(null, '', `#/${page}`)
    setActivePage(page)
  }

  const closePage = () => {
    setIsMenuOpen(false)
    window.history.pushState(
      null,
      '',
      `${window.location.pathname}${window.location.search}`,
    )
    setActivePage(null)
  }

  return (
    <>
      {activePage && (
        <section className="info-page" aria-label="Информационная страница">
          <div className="info-page__glow" aria-hidden="true" />
          <header className="info-page__header">
            <button type="button" onClick={closePage} className="brand-button">
              <span>IN</span>
              <strong>MAP</strong>
            </button>
            <button
              type="button"
              onClick={closePage}
              className="page-close"
              aria-label="Вернуться на главную"
            >
              <span aria-hidden="true">←</span>
              На главную
            </button>
          </header>
          <div className="info-page__content">
            <PageContent page={activePage} />
          </div>
        </section>
      )}

      {isMenuOpen && (
        <button
          type="button"
          className="menu-backdrop"
          onClick={() => setIsMenuOpen(false)}
          aria-label="Закрыть меню"
        />
      )}

      <nav className="site-navigation" aria-label="Основная навигация">
        <button
          type="button"
          className={`menu-toggle${isMenuOpen ? ' menu-toggle--open' : ''}`}
          onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
          aria-label={isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={isMenuOpen}
          aria-controls="site-menu"
        >
          <span />
          <span />
          <span />
        </button>

        <div
          id="site-menu"
          className={`site-menu${isMenuOpen ? ' site-menu--open' : ''}`}
          aria-hidden={!isMenuOpen}
        >
          <p>Навигация</p>
          {navigationItems.map((item, index) => {
            const itemContent = (
              <>
                <span className="site-menu__index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="site-menu__label">{item.label}</span>
                <strong className="site-menu__arrow" aria-hidden="true">
                  ↗
                </strong>
              </>
            )

            if ('page' in item) {
              return (
                <button
                  key={item.page}
                  type="button"
                  className="site-menu__item"
                  onClick={() => openPage(item.page)}
                  tabIndex={isMenuOpen ? 0 : -1}
                >
                  {itemContent}
                </button>
              )
            }

            return (
              <a
                key={item.label}
                href={item.href}
                className="site-menu__item"
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noreferrer' : undefined}
                aria-disabled={item.href === '#'}
                tabIndex={isMenuOpen ? 0 : -1}
                onClick={(event) => {
                  setIsMenuOpen(false)

                  if (item.href === '#') {
                    event.preventDefault()
                  }
                }}
              >
                {itemContent}
              </a>
            )
          })}

          <a
            href="/login"
            className="site-menu__login"
            tabIndex={isMenuOpen ? 0 : -1}
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="site-menu__login-label">Войти в систему</span>
            <span className="site-menu__login-arrow" aria-hidden="true">
              →
            </span>
          </a>
        </div>
      </nav>
    </>
  )
}

function App() {
  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows="percentage"
        camera={{ fov: 45, near: 0.1, far: 100, position: [0, 20, 0.01] }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#0f172a']} />
        <fog attach="fog" args={['#0f172a', 15, 36]} />

        <ambientLight intensity={0.5} />
        <hemisphereLight args={['#a5f3fc', '#020617', 1.2]} />
        <directionalLight
          castShadow
          color="#cffafe"
          intensity={3.2}
          position={[8, 14, 7]}
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight
          color="#0f766e"
          intensity={1.4}
          position={[-8, 5, -6]}
        />

        <mesh position-y={-0.62} rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[42, 42]} />
          <meshStandardMaterial color="#07111f" roughness={1} />
        </mesh>

        <ScrollControls damping={0.2} pages={5}>
          <MapGeometry />
          <CameraRig />
          <HtmlOverlay />
        </ScrollControls>
      </Canvas>

      <SiteNavigation />

      <p className="data-attribution pointer-events-none fixed bottom-3 right-4 z-50 text-[10px] tracking-wide text-slate-400/70">
        Границы районов © OpenStreetMap contributors · Высоты: AWS Terrain
        Tiles
      </p>
    </div>
  )
}

export default App
