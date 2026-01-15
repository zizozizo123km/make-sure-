import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { BIR_EL_ATER_CENTER, USER_LOCATION } from '../utils/helpers'; // Import USER_LOCATION
// import { MOCK_STORES } from '../constants'; // MOCK_STORES is empty now, so we won't use it directly here.

interface MapVisualizerProps {
  userType: 'CUSTOMER' | 'DRIVER' | 'STORE';
  height?: string;
  // Potentially pass stores/drivers/customer location dynamically if needed later
}

// Custom Icons Configuration
const createCustomIcon = (iconHtml: string, colorClass: string, size = 32) => {
  return L.divIcon({
    html: `<div class="relative flex items-center justify-center p-1 rounded-full ${colorClass} shadow-md border-2 border-white/80"><div class="text-white w-4 h-4">${iconHtml}</div></div>`,
    className: 'bg-transparent flex items-center justify-center', // Ensure background is transparent
    iconSize: [size, size],
    iconAnchor: [size/2, size], // Anchor at bottom center of icon for better placement
    popupAnchor: [0, -size]
  });
};

const userIcon = createCustomIcon('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>', 'bg-blue-600', 36);
const storeIcon = createCustomIcon('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-store"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.41 2h9.18a2 2 0 0 1 1.4.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M12 12v8"/></svg>', 'bg-emerald-600', 40);
const driverIcon = createCustomIcon('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bike"><path d="M1 14V6h4L10 9l-4 7h6"/><circle cx="10" cy="20" r="4"/><path d="m21 17-3-3 4-9H2V6h5l4 3 2 7 5 5 3-3Z"/></svg>', 'bg-orange-600', 38);


// Component to handle map center updates if needed
const RecenterMap = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  // Add useEffect to React import statement
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], map.getZoom());
    }
  }, [lat, lng, map]);
  return null;
};

export const MapVisualizer: React.FC<MapVisualizerProps> = ({ userType, height = 'h-64' }) => {
  // Default center (Bir el-Ater)
  const center = [BIR_EL_ATER_CENTER.lat, BIR_EL_ATER_CENTER.lng] as L.LatLngExpression;
  
  // For demo, always center on the USER_LOCATION for consistency
  const actualCenter = [USER_LOCATION.lat, USER_LOCATION.lng] as L.LatLngExpression;

  return (
    <div className={`relative w-full ${height} rounded-3xl overflow-hidden border-2 border-primary-200 shadow-inner isolation-isolate z-0`}>
      <MapContainer 
        center={actualCenter} 
        zoom={14} 
        scrollWheelZoom={false} 
        className="h-full w-full"
        style={{ background: '#e2e8f0' }} // Match primary-200
        attributionControl={false} // Hide default attribution
      >
        <RecenterMap lat={USER_LOCATION.lat} lng={USER_LOCATION.lng} /> {/* Keep map centered */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User Location Marker (always visible for context) */}
        <Marker position={actualCenter} icon={userIcon}>
          <Popup>موقعك الحالي</Popup>
        </Marker>

        {/* Dynamic Markers based on userType (Mock Data for now) */}
        {userType === 'CUSTOMER' && (
          <>
            {/* Example Mock Stores for Customer view */}
            <Marker position={[BIR_EL_ATER_CENTER.lat + 0.005, BIR_EL_ATER_CENTER.lng + 0.005]} icon={storeIcon}>
              <Popup>متجر الأطعمة السريعة</Popup>
            </Marker>
            <Marker position={[BIR_EL_ATER_CENTER.lat - 0.008, BIR_EL_ATER_CENTER.lng - 0.003]} icon={storeIcon}>
              <Popup>محل الملابس العصرية</Popup>
            </Marker>
             {/* Example Mock Drivers for Customer view */}
             <Marker position={[USER_LOCATION.lat + 0.002, USER_LOCATION.lng - 0.001]} icon={driverIcon}>
              <Popup>سائق متاح</Popup>
            </Marker>
          </>
        )}

        {userType === 'DRIVER' && (
          <>
            {/* Example for a driver picking up from store A and delivering to customer B */}
            <Marker position={[BIR_EL_ATER_CENTER.lat + 0.005, BIR_EL_ATER_CENTER.lng + 0.005]} icon={storeIcon}>
              <Popup>نقطة الاستلام (المتجر)</Popup>
            </Marker>
            <Marker position={[USER_LOCATION.lat + 0.002, USER_LOCATION.lng + 0.003]} icon={userIcon}> {/* Simulate Customer location */}
              <Popup>نقطة التسليم (الزبون)</Popup>
            </Marker>
          </>
        )}

      </MapContainer>
      
      {/* Custom Attribution */}
      <div className="absolute bottom-2 left-2 bg-primary-900/80 glass-dark text-white p-1 px-2 rounded-xl text-[10px] text-primary-300 shadow z-[400] pointer-events-none border-white/10">
        &copy; OpenStreetMap | خريطة كيمو
      </div>
    </div>
  );
};