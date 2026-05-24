import { useEffect, useRef, useMemo } from 'react'
import type { Vec3 } from '../lib/gpx'
import { computeRouteDistancesKm } from '../lib/gpx'

interface Props {
  points: Vec3[]
  currentKm: number
  onSeek: (km: number) => void
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

function lerpColor(a: string, b: string, t: number): string {
  const [r0, g0, b0] = hexToRgb(a), [r1, g1, b1] = hexToRgb(b)
  return `rgb(${Math.round(r0 + (r1 - r0) * t)},${Math.round(g0 + (g1 - g0) * t)},${Math.round(b0 + (b1 - b0) * t)})`
}

function gradeColor(grade: number): string {
  if (grade <= 0) return lerpColor('#4ade80', '#60a5fa', Math.min(1, -grade / 8))
  if (grade < 4) return lerpColor('#4ade80', '#facc15', grade / 4)
  if (grade < 8) return lerpColor('#facc15', '#f97316', (grade - 4) / 4)
  return lerpColor('#f97316', '#ef4444', Math.min(1, (grade - 8) / 6))
}

export function ElevationProfile({ points, currentKm, onSeek }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const distances = useMemo(() => computeRouteDistancesKm(points), [points])
  const drawRef = useRef<() => void>(() => {})

  useEffect(() => {
    drawRef.current = () => {
      const canvas = canvasRef.current
      if (!canvas || points.length < 2) return

      const dpr = window.devicePixelRatio || 1
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      if (W === 0 || H === 0) return

      canvas.width = W * dpr
      canvas.height = H * dpr
      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)

      const totalKm = distances[distances.length - 1]
      let minEle = Infinity, maxEle = -Infinity
      for (const p of points) {
        if (p.y < minEle) minEle = p.y
        if (p.y > maxEle) maxEle = p.y
      }
      const eleRange = maxEle - minEle || 1

      const PAD_T = 6, PAD_B = 18
      const toX = (km: number) => (km / totalKm) * W
      const toY = (ele: number) => PAD_T + (1 - (ele - minEle) / eleRange) * (H - PAD_T - PAD_B)

      // Pre-compute smoothed grades so sections color as coherent chunks
      const rawGrades = new Array<number>(points.length - 1)
      for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1], p1 = points[i]
        const horiz = Math.sqrt((p1.x - p0.x) ** 2 + (p1.z - p0.z) ** 2)
        rawGrades[i - 1] = horiz > 0 ? ((p1.y - p0.y) / horiz) * 100 : 0
      }
      const hw = Math.min(40, Math.max(10, Math.floor(rawGrades.length * 0.015)))
      const smoothedGrades = rawGrades.map((_, i) => {
        const lo = Math.max(0, i - hw), hi = Math.min(rawGrades.length - 1, i + hw)
        let sum = 0
        for (let j = lo; j <= hi; j++) sum += rawGrades[j]
        return sum / (hi - lo + 1)
      })

      // Group segments into grade blocks — merge consecutive segments whose smoothed
      // grade stays within THRESHOLD of the running block average.
      const GRADE_THRESHOLD = 2.0
      interface Block { startPt: number; endPt: number; grade: number }
      const blocks: Block[] = []
      let bStart = 0, bSum = smoothedGrades[0], bCount = 1

      for (let i = 1; i < smoothedGrades.length; i++) {
        if (Math.abs(smoothedGrades[i] - bSum / bCount) > GRADE_THRESHOLD) {
          blocks.push({ startPt: bStart, endPt: i, grade: bSum / bCount })
          bStart = i; bSum = smoothedGrades[i]; bCount = 1
        } else {
          bSum += smoothedGrades[i]; bCount++
        }
      }
      blocks.push({ startPt: bStart, endPt: points.length - 1, grade: bSum / bCount })

      // Draw each block as a single filled polygon following actual elevation contour
      for (const { startPt, endPt, grade } of blocks) {
        const color = gradeColor(grade)

        ctx.beginPath()
        ctx.moveTo(toX(distances[startPt]), H - PAD_B)
        ctx.lineTo(toX(distances[startPt]), toY(points[startPt].y))
        for (let i = startPt + 1; i <= endPt; i++) {
          ctx.lineTo(toX(distances[i]), toY(points[i].y))
        }
        ctx.lineTo(toX(distances[endPt]), H - PAD_B)
        ctx.closePath()
        ctx.globalAlpha = 0.35
        ctx.fillStyle = color
        ctx.fill()
        ctx.globalAlpha = 1

        ctx.beginPath()
        ctx.moveTo(toX(distances[startPt]), toY(points[startPt].y))
        for (let i = startPt + 1; i <= endPt; i++) {
          ctx.lineTo(toX(distances[i]), toY(points[i].y))
        }
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // Elevation labels
      ctx.font = '9px system-ui'
      ctx.textBaseline = 'top'
      ctx.textAlign = 'left'
      ctx.fillStyle = 'rgba(255,255,255,0.32)'
      ctx.fillText(`${Math.round(maxEle)}m`, 3, PAD_T)
      ctx.textBaseline = 'bottom'
      ctx.fillText(`${Math.round(minEle)}m`, 3, H - PAD_B - 1)

      // Distance labels
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.textBaseline = 'bottom'
      ctx.textAlign = 'left'
      ctx.fillText('0', 3, H)
      ctx.textAlign = 'right'
      ctx.fillText(`${totalKm.toFixed(1)} km`, W - 3, H)

      // Position marker (dashed vertical)
      const markerX = toX(currentKm)
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(markerX, PAD_T)
      ctx.lineTo(markerX, H - PAD_B)
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.setLineDash([])

      // Dot at current elevation
      let lo = 0, hi = distances.length - 1
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1
        if (distances[mid] <= currentKm) lo = mid
        else hi = mid
      }
      const segLen = distances[hi] - distances[lo]
      const t = segLen > 0 ? (currentKm - distances[lo]) / segLen : 0
      const interpEle = points[lo].y + (points[hi].y - points[lo].y) * t

      ctx.beginPath()
      ctx.arc(markerX, toY(interpEle), 4, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    drawRef.current()
  }, [points, distances, currentKm])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => drawRef.current())
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  const seek = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const totalKm = distances[distances.length - 1] ?? 0
    onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * totalKm)
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%', cursor: 'ew-resize' }}
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); seek(e) }}
      onPointerMove={e => { if (e.buttons > 0) seek(e) }}
    />
  )
}
