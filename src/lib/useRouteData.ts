import { useState, useMemo, useEffect } from 'react'
import {
  parseGpx, projectRoute, computeBounds, getSharedProjectionParams,
  computeStats, type RoutePoint, type StageStats, type ProjectionParams,
} from './gpx'
import { STAGES } from './stages'

export function useRouteData(stageIndex: number) {
  const [allRoutes, setAllRoutes] = useState<(RoutePoint[] | null)[]>(() => Array(STAGES.length).fill(null))
  const [sharedParams, setSharedParams] = useState<ProjectionParams | null>(null)
  const [loadedCount, setLoadedCount] = useState(0)
  const [stats, setStats] = useState<StageStats | null>(null)

  useEffect(() => {
    let cancelled = false
    let count = 0

    const fetches = STAGES.map(async (s, i) => {
      try {
        const res = await fetch(`/stages/${s.file}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const parsed = parseGpx(await res.text())
        if (!cancelled) {
          setAllRoutes(prev => { const next = [...prev]; next[i] = parsed; return next })
          count++
          setLoadedCount(count)
        }
        return parsed
      } catch (err) {
        console.error(`Failed to load ${s.file}:`, err)
        if (!cancelled) { count++; setLoadedCount(count) }
        return null
      }
    })

    Promise.all(fetches).then(routes => {
      if (cancelled) return
      const loaded = routes.filter((r): r is RoutePoint[] => r !== null)
      if (loaded.length > 0) setSharedParams(getSharedProjectionParams(loaded))
    })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const r = allRoutes[stageIndex]
    setStats(r ? computeStats(r) : null)
  }, [allRoutes, stageIndex])

  const allProjected = useMemo(
    () => sharedParams
      ? allRoutes.map(r => r ? projectRoute(r, sharedParams) : [])
      : allRoutes.map(() => []),
    [allRoutes, sharedParams],
  )

  const stageBounds = useMemo(() => {
    const pts = allProjected[stageIndex]
    return pts.length > 0 ? computeBounds(pts) : null
  }, [allProjected, stageIndex])

  const globalBounds = useMemo(() => {
    const all = allProjected.flat()
    return all.length > 0 ? computeBounds(all) : null
  }, [allProjected])

  return {
    allRoutes,
    sharedParams,
    loadedCount,
    loading: loadedCount < STAGES.length,
    stats,
    allProjected,
    stageBounds,
    globalBounds,
  }
}
