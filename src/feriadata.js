// Canton Fair 2026 — Fases y rubros
export const FASES_FERIA = [
  {
    id: 'Phase 1',
    label: 'Phase 1 — Apr 15-19',
    fechas: 'April 15-19',
    color: 'blue',
    rubros: [
      'Electronics & Appliance',
      'Manufacturing',
      'Vehicles & Two Wheels',
      'Light & Electrical',
      'Hardware',
    ],
  },
  {
    id: 'Phase 2',
    label: 'Phase 2 — Apr 23-27',
    fechas: 'April 23-27',
    color: 'orange',
    rubros: [
      'Housewares',
      'Gifts & Decorations',
      'Building & Furniture',
    ],
  },
  {
    id: 'Phase 3',
    label: 'Phase 3 — May 1-5',
    fechas: 'May 1-5',
    color: 'pink',
    rubros: [
      'Toys & Children Baby and Maternity',
      'Fashion',
      'Home Textiles',
      'Stationery',
      'Health & Recreation',
    ],
  },
]

export const ALL_RUBROS = FASES_FERIA.flatMap(f => f.rubros)

export const DIAS = ['Día 1', 'Día 2', 'Día 3', 'Día 4', 'Día 5']

// Derivar fase a partir de rubro
export function faseDeRubro(rubro) {
  if (!rubro) return null
  const found = FASES_FERIA.find(f =>
    f.rubros.some(r => r.toLowerCase() === rubro.toLowerCase())
  )
  return found?.id || null
}

// Colores de badge por fase
export const FASE_COLORS = {
  'Phase 1': 'bg-blue-100 text-blue-800',
  'Phase 2': 'bg-orange-100 text-orange-800',
  'Phase 3': 'bg-pink-100 text-pink-800',
}
