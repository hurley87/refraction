'use client';

import { useState, useEffect } from 'react';

interface GradientStop {
  color: string;
  opacity: number;
  position: number;
}

interface GradientPickerProps {
  value: string;
  onChange: (gradient: string) => void;
}

const DEFAULT_STOPS: GradientStop[] = [
  { color: '#C199C4', opacity: 0, position: 0 },
  { color: '#C199C4', opacity: 1, position: 100 },
];

function parseGradient(gradient: string): { angle: number; stops: GradientStop[] } {
  const defaultResult = { angle: 180, stops: DEFAULT_STOPS };
  if (!gradient) return defaultResult;

  const match = gradient.match(/linear-gradient\((\d+)deg,\s*(.+)\)/);
  if (!match) return defaultResult;

  const angle = parseInt(match[1], 10);
  const stopsStr = match[2];

  const stopRegex = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)\s+(\d+)%/g;
  const stops: GradientStop[] = [];
  let m;
  while ((m = stopRegex.exec(stopsStr)) !== null) {
    const r = parseInt(m[1]);
    const g = parseInt(m[2]);
    const b = parseInt(m[3]);
    const opacity = m[4] !== undefined ? parseFloat(m[4]) : 1;
    const position = parseInt(m[5]);
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    stops.push({ color: hex, opacity, position });
  }

  return { angle, stops: stops.length >= 2 ? stops : DEFAULT_STOPS };
}

function buildGradient(angle: number, stops: GradientStop[]): string {
  const stopsStr = stops
    .map((s) => {
      const r = parseInt(s.color.slice(1, 3), 16);
      const g = parseInt(s.color.slice(3, 5), 16);
      const b = parseInt(s.color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${s.opacity}) ${s.position}%`;
    })
    .join(', ');
  return `linear-gradient(${angle}deg, ${stopsStr})`;
}

export default function GradientPicker({ value, onChange }: GradientPickerProps) {
  const parsed = parseGradient(value);
  const [angle, setAngle] = useState(parsed.angle);
  const [stops, setStops] = useState<GradientStop[]>(parsed.stops);

  useEffect(() => {
    const p = parseGradient(value);
    setAngle(p.angle);
    setStops(p.stops);
  }, [value]);

  const emitChange = (newAngle: number, newStops: GradientStop[]) => {
    onChange(buildGradient(newAngle, newStops));
  };

  const updateStop = (idx: number, field: keyof GradientStop, val: string | number) => {
    const updated = stops.map((s, i) =>
      i === idx ? { ...s, [field]: val } : s
    );
    setStops(updated);
    emitChange(angle, updated);
  };

  return (
    <div className="space-y-3">
      <div
        className="h-12 rounded-lg border"
        style={{ background: buildGradient(angle, stops) }}
      />

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium whitespace-nowrap">Angle</label>
        <input
          type="range"
          min={0}
          max={360}
          value={angle}
          onChange={(e) => {
            const a = parseInt(e.target.value);
            setAngle(a);
            emitChange(a, stops);
          }}
          className="flex-1"
        />
        <span className="text-xs w-10 text-right">{angle}°</span>
      </div>

      {stops.map((stop, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <label className="text-xs w-14">Stop {idx + 1}</label>
          <input
            type="color"
            value={stop.color}
            onChange={(e) => updateStop(idx, 'color', e.target.value)}
            className="w-8 h-8 border rounded cursor-pointer"
          />
          <div className="flex items-center gap-1 flex-1">
            <span className="text-xs">α</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={stop.opacity}
              onChange={(e) => updateStop(idx, 'opacity', parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs w-8 text-right">
              {Math.round(stop.opacity * 100)}%
            </span>
          </div>
        </div>
      ))}

      <p className="text-xs text-gray-400 break-all">{buildGradient(angle, stops)}</p>
    </div>
  );
}
