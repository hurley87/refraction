'use client';

import { useState } from 'react';

interface FontPickerProps {
  value: string;
  onChange: (font: string) => void;
}

const POPULAR_GOOGLE_FONTS = [
  'Syne',
  'Hanken Grotesk',
  'Inter',
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Poppins',
  'Lato',
  'Raleway',
  'Playfair Display',
  'Oswald',
  'Nunito',
  'Merriweather',
  'Bebas Neue',
  'Space Grotesk',
  'DM Sans',
  'Plus Jakarta Sans',
  'Outfit',
  'Lexend',
  'Archivo',
  'Manrope',
  'Work Sans',
  'Rubik',
  'Barlow',
  'Fira Sans',
  'Karla',
  'IBM Plex Sans',
  'Source Sans 3',
  'Cabin',
  'Libre Baskerville',
];

export default function FontPicker({ value, onChange }: FontPickerProps) {
  const [customMode, setCustomMode] = useState(
    !!value && !POPULAR_GOOGLE_FONTS.includes(value)
  );

  return (
    <div className="space-y-2">
      {!customMode ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-2 border rounded-md text-sm"
        >
          <option value="">Default (system)</option>
          {POPULAR_GOOGLE_FONTS.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter Google Font name"
          className="w-full p-2 border rounded-md text-sm"
        />
      )}
      <button
        type="button"
        onClick={() => setCustomMode(!customMode)}
        className="text-xs text-blue-600 hover:underline"
      >
        {customMode ? 'Choose from list' : 'Enter custom font name'}
      </button>
    </div>
  );
}
