import { create } from 'zustand';

const useRideStore = create((set) => ({
  activeRide: null,       // current ride object
  rideStatus: null,       // 'idle' | 'searching' | 'accepted' | 'in_progress' | 'completed'
  
  setActiveRide: (ride) => set({ activeRide: ride, rideStatus: ride?.status || null }),
  clearRide: () => set({ activeRide: null, rideStatus: 'idle' }),
}));

export default useRideStore;
