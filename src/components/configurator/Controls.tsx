import React from 'react'

type Props = {
  width: number
  depth: number
  height: number
  setWidth: (n: number) => void
  setDepth: (n: number) => void
  setHeight: (n: number) => void
}

export default function Controls({ width, depth, height, setWidth, setDepth, setHeight }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm">Largeur (mm)</label>
        <input type="range" min={500} max={6000} value={width} onChange={e => setWidth(Number(e.target.value))} />
        <div>{width} mm</div>
      </div>
      <div>
        <label className="block text-sm">Profondeur (mm)</label>
        <input type="range" min={200} max={800} value={depth} onChange={e => setDepth(Number(e.target.value))} />
        <div>{depth} mm</div>
      </div>
      <div>
        <label className="block text-sm">Hauteur (mm)</label>
        <input type="range" min={400} max={4000} value={height} onChange={e => setHeight(Number(e.target.value))} />
        <div>{height} mm</div>
      </div>
    </div>
  )
}
