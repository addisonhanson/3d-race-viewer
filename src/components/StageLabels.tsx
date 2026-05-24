import { Text } from '@react-three/drei'
import type { Vec3 } from '../lib/gpx'
import { STAGES } from '../lib/stages'

type StageLabelsProps = {
  allProjected: Vec3[][]
}

export function StageLabels({ allProjected }: StageLabelsProps) {
  return (
    <>
      {STAGES.map((stage, i) => {
        const pts = allProjected[i]
        if (!pts || pts.length === 0) return null
        const start = pts[0]
        return (
          <Text
            key={stage.number}
            position={[start.x, start.y * 8 + 12000, start.z]}
            fontSize={8000}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={800}
            outlineColor="#0f172a"
          >
            {stage.number}
          </Text>
        )
      })}
    </>
  )
}
