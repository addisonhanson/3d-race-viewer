declare module 'world-atlas/countries-110m.json' {
  import type { Topology, GeometryCollection } from 'topojson-specification'
  const data: Topology<{ land: GeometryCollection; countries: GeometryCollection }>
  export default data
}
