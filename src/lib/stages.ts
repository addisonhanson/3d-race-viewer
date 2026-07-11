export type StageType = 'flat' | 'hilly' | 'mountain' | 'tt'

export interface StageInfo {
  number: number
  name: string
  type: StageType
  file: string
}

export const STAGES: StageInfo[] = [
  { number: 1,  name: 'Stage 1',  type: 'hilly',    file: 'giro-2026/stage-1-route.gpx' },
  { number: 2,  name: 'Stage 2',  type: 'tt',       file: 'giro-2026/stage-2-route.gpx' },
  { number: 3,  name: 'Stage 3',  type: 'hilly',    file: 'giro-2026/stage-3-route.gpx' },
  { number: 4,  name: 'Stage 4',  type: 'flat',     file: 'giro-2026/stage-4-route.gpx' },
  { number: 5,  name: 'Stage 5',  type: 'hilly',    file: 'giro-2026/stage-5-route.gpx' },
  { number: 6,  name: 'Stage 6',  type: 'hilly',    file: 'giro-2026/stage-6-route.gpx' },
  { number: 7,  name: 'Stage 7',  type: 'hilly',    file: 'giro-2026/stage-7-route.gpx' },
  { number: 8,  name: 'Stage 8',  type: 'mountain', file: 'giro-2026/stage-8-route.gpx' },
  { number: 9,  name: 'Stage 9',  type: 'mountain', file: 'giro-2026/stage-9-route.gpx' },
  { number: 10, name: 'Stage 10', type: 'flat',     file: 'giro-2026/stage-10-route.gpx' },
  { number: 11, name: 'Stage 11', type: 'mountain', file: 'giro-2026/stage-11-route.gpx' },
  { number: 12, name: 'Stage 12', type: 'hilly',    file: 'giro-2026/stage-12-route.gpx' },
  { number: 13, name: 'Stage 13', type: 'flat',     file: 'giro-2026/stage-13-route.gpx' },
  { number: 14, name: 'Stage 14', type: 'mountain', file: 'giro-2026/stage-14-route.gpx' },
  { number: 15, name: 'Stage 15', type: 'mountain', file: 'giro-2026/stage-15-route.gpx' },
  { number: 16, name: 'Stage 16', type: 'flat',     file: 'giro-2026/stage-16-route.gpx' },
  { number: 17, name: 'Stage 17', type: 'mountain', file: 'giro-2026/stage-17-route.gpx' },
  { number: 18, name: 'Stage 18', type: 'hilly',    file: 'giro-2026/stage-18-route.gpx' },
  { number: 19, name: 'Stage 19', type: 'mountain', file: 'giro-2026/stage-19-route.gpx' },
  { number: 20, name: 'Stage 20', type: 'tt',       file: 'giro-2026/stage-20-route.gpx' },
  { number: 21, name: 'Stage 21', type: 'flat',     file: 'giro-2026/stage-21-route.gpx' },
]

export const TYPE_BADGE: Record<StageType, { label: string; color: string }> = {
  flat:     { label: 'Flat',     color: '#22d3ee' },
  hilly:    { label: 'Hilly',   color: '#a78bfa' },
  mountain: { label: 'Mtn',     color: '#f97316' },
  tt:       { label: 'TT',      color: '#facc15' },
}
