import { Coordinates } from '../types';

// Coordinates for Bir el-Ater center (approximate)
export const BIR_EL_ATER_CENTER: Coordinates = {
  lat: 34.7495,
  lng: 8.0617
};

// Default User Location (can be used as driver location too)
export const USER_LOCATION: Coordinates = {
  lat: 34.7520,
  lng: 8.0550
};

// Haversine formula to calculate distance in km
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  // Safety check: if any coordinate is missing, return 0 or a default high distance
  if (!coord1 || !coord2 || typeof coord1.lat !== 'number' || typeof coord2.lat !== 'number') {
    return 0;
  }

  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(coord2.lat - coord1.lat);
  const dLon = deg2rad(coord2.lng - coord1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(coord1.lat)) * Math.cos(deg2rad(coord2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Number(d.toFixed(1));
};

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export const calculateDeliveryFee = (distance: number, orderTotal: number): number => {
  const BASE_FEE = 150; // Starting fee in DA
  const PER_KM_FEE = 30; // 30 DA per KM

  let fee = BASE_FEE + (distance * PER_KM_FEE);

  // Discount for high value orders
  if (orderTotal > 5000) {
    fee = fee * 0.8; // 20% discount on delivery
  }

  // Round to nearest 10
  return Math.ceil(fee / 10) * 10;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ar-DZ', { style: 'currency', currency: 'DZD' }).format(amount).replace('DZD', 'د.ج');
};