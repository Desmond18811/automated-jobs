import { useEffect, useRef, type FC } from 'react';
import { Map, Marker, Popup, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

// Vite worker setup for OpenFreeMap
setWorkerUrl(workerUrl);

export interface MapMarkerItem {
  id: string;
  name: string;
  category: string;
  location: {
    lat: number;
    lng: number;
  };
  address?: string;
  rating?: number;
  opportunity?: string;
}

interface OpenFreeMapProps {
  center: [number, number]; // [lng, lat]
  zoom?: number;
  markers?: MapMarkerItem[];
  selectedMarkerId?: string;
  onSelectMarker?: (id: string) => void;
  height?: number | string;
}

export const OpenFreeMap: FC<OpenFreeMapProps> = ({
  center,
  zoom = 12.5,
  markers = [],
  selectedMarkerId,
  onSelectMarker,
  height = 360,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new Map({
      container: mapContainerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center,
      zoom,
      attributionControl: false,
    });

    map.addControl(new NavigationControl({ showCompass: true, showZoom: true }), 'top-right');

    mapRef.current = map;

    // Resize observer to ensure smooth rendering on container layout shifts
    const ro = new ResizeObserver(() => {
      map.resize();
    });
    if (mapContainerRef.current) ro.observe(mapContainerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Center & User Pin
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({ center, zoom, essential: true });

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    // User center marker
    const el = document.createElement('div');
    el.style.width = '18px';
    el.style.height = '18px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#2563eb';
    el.style.border = '3px solid #fff';
    el.style.boxShadow = '0 0 0 6px rgba(37, 99, 235, 0.25), 0 2px 8px rgba(0,0,0,0.2)';
    el.style.cursor = 'pointer';
    el.title = 'You are here (Search Center)';

    const userMarker = new Marker({ element: el })
      .setLngLat(center)
      .setPopup(new Popup({ offset: 12 }).setHTML('<div style="font-size:12px;font-weight:700;color:#2563eb;padding:2px">Your Location (Search Center)</div>'))
      .addTo(mapRef.current);

    userMarkerRef.current = userMarker;
  }, [center[0], center[1], zoom]);

  // Update Markers for Discovered Businesses
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    markers.forEach((item) => {
      if (!item.location?.lat || !item.location?.lng) return;

      const isSelected = selectedMarkerId === item.id;

      // Custom marker pin
      const el = document.createElement('div');
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.width = isSelected ? '34px' : '28px';
      el.style.height = isSelected ? '34px' : '28px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = isSelected ? '#10b981' : '#0b0b0c';
      el.style.color = '#fff';
      el.style.fontWeight = '700';
      el.style.fontSize = isSelected ? '13px' : '11px';
      el.style.border = isSelected ? '3px solid #fff' : '2px solid #fff';
      el.style.boxShadow = isSelected
        ? '0 0 0 5px rgba(16, 185, 129, 0.35), 0 4px 12px rgba(0,0,0,0.25)'
        : '0 2px 6px rgba(0,0,0,0.2)';
      el.style.cursor = 'pointer';
      el.style.transition = 'all 0.15s ease';
      el.innerText = item.name.charAt(0).toUpperCase();

      const popupHtml = `
        <div style="font-family: Montserrat, sans-serif; padding: 4px; min-width: 160px;">
          <div style="font-weight: 700; font-size: 13px; color: #111;">${item.name}</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">${item.category}</div>
          ${item.address ? `<div style="font-size: 10.5px; color: #9ca3af; margin-top: 2px;">${item.address}</div>` : ''}
          ${item.rating ? `<div style="font-size: 11px; color: #f59e0b; font-weight: 600; margin-top: 4px;">Rating: ${item.rating} / 5.0</div>` : ''}
          ${item.opportunity ? `<div style="font-size: 10.5px; color: #059669; font-weight: 600; margin-top: 4px; background: #ecfdf5; padding: 2px 6px; border-radius: 4px;">Opportunity Identified</div>` : ''}
        </div>
      `;

      const popup = new Popup({ offset: 16 }).setHTML(popupHtml);

      const marker = new Marker({ element: el })
        .setLngLat([item.location.lng, item.location.lat])
        .setPopup(popup)
        .addTo(mapRef.current!);

      el.addEventListener('click', () => {
        if (onSelectMarker) {
          onSelectMarker(item.id);
        }
      });

      markersRef.current.push(marker);
    });
  }, [markers, selectedMarkerId, onSelectMarker]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,.03)',
      }}
    >
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* OpenFreeMap Liberty Badge */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 10,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(4px)',
          borderRadius: 6,
          padding: '2px 8px',
          fontSize: 10,
          fontWeight: 600,
          color: '#475569',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span>OpenFreeMap · Liberty</span>
      </div>
    </div>
  );
};
