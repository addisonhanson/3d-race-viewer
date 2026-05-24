import { useEffect, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

type CameraControllerProps = {
  position: [number, number, number]
  target: [number, number, number]
  far: number
  resetKey: number
}

export function CameraController({ position, target, far, resetKey }: CameraControllerProps) {
  const { camera } = useThree()
  const controls = useRef<OrbitControlsImpl>(null)

  useEffect(() => {
    camera.position.set(...position)
    camera.far = far
    camera.updateProjectionMatrix()
    if (controls.current) {
      controls.current.target.set(...target)
      controls.current.update()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  return <OrbitControls ref={controls} />
}
