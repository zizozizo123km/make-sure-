
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Coordinates } from '../types';
import { BIR_EL_ATER_CENTER } from '../utils/helpers';

interface MapVisualizerProps {
  userLocation?: Coordinates;
  storeLocation?: Coordinates;
  customerLocation?: Coordinates;
  driverLocation?: Coordinates;
  height?: string;
  zoom?: number;
}

const createCustomIcon = (iconHtml: string, colorClass: string, size = 32) => {
  return L.divIcon({
    html: `<div class="relative flex items-center justify-center p-1 rounded-full ${colorClass} shadow-md border-2 border-white/80"><div class="text-white w-4 h-4">${iconHtml}</div></div>`,
    className: 'bg-transparent flex items-center justify-center',
    iconSize: [size, size],
    iconAnchor: [size/2, size],
    popupAnchor: [0, -size]
  });
};

const userIcon = createCustomIcon('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>', 'bg-blue-600', 32);
const storeIcon = createCustomIcon('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.41 2h9.18a2 2 0 0 1 1.4.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M12 12v8"/></svg>', 'bg-orange-600', 36);
const customerIcon = createCustomIcon('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>', 'bg-brand-500', 34);
const driverIcon = createCustomIcon('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="2.5"/><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="15" cy="5" r="1"/><path d="M12 9H5.5L3 13.35c-.4.7-.1 1.65.65 2.05L7 17.5"/><path d="M17 17.5l-1.5-3l1.5-4.5L15 5h-2.5"/></svg>', 'bg-slate-900', 38);

const RecenterMap = ({ coords }: { coords: Coordinates }) => {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.lat && coords.lng) {
      map.setView([coords.lat, coords.lng], map.getZoom());
    }
  }, [coords, map]);
  return null;
};

export const MapVisualizer: React.FC<MapVisualizerProps> = ({ 
  userLocation, 
  storeLocation, 
  customerLocation, 
  driverLocation,
  height = 'h-64',
  zoom = 14
}) => {
  const defaultCenter = driverLocation || userLocation || storeLocation || customerLocation || BIR_EL_ATER_CENTER;

  return (
    <div className={`relative w-full ${height} overflow-hidden z-0`}>
      <MapContainer 
        center={[defaultCenter.lat, defaultCenter.lng]} 
        zoom={zoom} 
        scrollWheelZoom={false} 
        className="h-full w-full"
        attributionControl={false}
      >
        <RecenterMap coords={defaultCenter} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {userLocation && userLocation.lat && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>موقعك الحالي</Popup>
          </Marker>
        )}

        {storeLocation && storeLocation.lat && (
          <Marker position={[storeLocation.lat, storeLocation.lng]} icon={storeIcon}>
            <Popup>موقع المتجر</Popup>
          </Marker>
        )}

        {customerLocation && customerLocation.lat && (
          <Marker position={[customerLocation.lat, customerLocation.lng]} icon={customerIcon}>
            <Popup>موقع التوصيل</Popup>
          </Marker>
        )}

        {driverLocation && driverLocation.lat && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
            <Popup>موقع السائق الآن</Popup>
          </Marker>
        )}
      </MapContainer>
      
      <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-md text-white p-1 px-3 rounded-full text-[8px] font-bold z-[400] pointer-events-none">
        خريطة كيمو الحية
      </div>
    </div>
  );
};
