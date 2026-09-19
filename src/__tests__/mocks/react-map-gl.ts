// Mock for react-map-gl and react-map-gl/mapbox
import React from 'react';

type MapProps = {
  children?: React.ReactNode;
  onClick?: (event: { lngLat: { lng: number; lat: number } }) => void;
  onLoad?: () => void;
  onMove?: (event: { viewState: unknown }) => void;
  onMoveEnd?: () => void;
  onError?: (event: unknown) => void;
};

export const Map = React.forwardRef(function MockMap(
  { children, onClick, onLoad }: MapProps,
  _ref
) {
  void _ref;
  const didLoadRef = React.useRef(false);
  React.useEffect(() => {
    if (didLoadRef.current) return;
    didLoadRef.current = true;
    onLoad?.();
  }, [onLoad]);

  return React.createElement(
    'div',
    {
      'data-testid': 'mock-map',
      onClick: () =>
        onClick?.({
          lngLat: { lng: 2.3522, lat: 48.8566 },
        }),
    },
    children
  );
});

export const Marker = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', { 'data-testid': 'mock-marker' }, children);

export const Popup = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', { 'data-testid': 'mock-popup' }, children);

export const Source = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', { 'data-testid': 'mock-source' }, children);

export const Layer = () => null;

export const GeolocateControl = () => null;

export const NavigationControl = () => null;

export const FullscreenControl = () => null;

export default Map;
