import React, { useMemo } from 'react'

type Props = { base?: number; modules?: number; height?: number; depth?: number }

export default function Price({ base = 580, modules = 1, height = 600, depth = 400 }: Props) {
  const price = useMemo(() => {
    let p = base + modules * 150
    if (height > 600) p += (height - 600) / 10 * 2 // 2€ per cm beyond 60cm
    p += depth * 0.03 // 3€ per cm (approx)
    return Math.round(p * 100) / 100
  }, [base, modules, height, depth])

  return (
    <div className="p-4 border rounded">
      <div className="text-sm text-gray-600">Prix estimé</div>
      <div className="text-2xl font-bold">€{price}</div>
    </div>
  )
}
