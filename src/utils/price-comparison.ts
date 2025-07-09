import { Product, Store, Price } from '../types';

export const findCheapestPrice = (prices: Price[], stores: Store[]) => {
  const availablePrices = prices.filter(price => price.isAvailable);
  if (availablePrices.length === 0) return null;

  const cheapestPrice = availablePrices.reduce((min, current) => 
    current.price < min.price ? current : min
  );

  const store = stores.find(s => s.id === cheapestPrice.storeId);
  return { price: cheapestPrice, store };
};

export const calculateTotalSavings = (
  originalPrices: Price[],
  optimizedPrices: Price[]
): number => {
  const originalTotal = originalPrices.reduce((sum, price) => sum + price.price, 0);
  const optimizedTotal = optimizedPrices.reduce((sum, price) => sum + price.price, 0);
  return originalTotal - optimizedTotal;
};

export const getNearbyStores = (
  stores: Store[],
  userLocation: [number, number],
  maxDistance: number = 50
): Store[] => {
  return stores.filter(store => {
    if (store.type === 'online') return true;
    if (!store.location) return false;
    
    const distance = calculateDistance(
      userLocation,
      store.location.coordinates
    );
    
    return distance <= maxDistance;
  });
};

const calculateDistance = (
  point1: [number, number],
  point2: [number, number]
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (point2[0] - point1[0]) * Math.PI / 180;
  const dLon = (point2[1] - point1[1]) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1[0] * Math.PI / 180) * Math.cos(point2[0] * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};