// Shared Call Store
// src/store/callStore.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface CallState {
  isInCall: boolean;
  callId: string | null;
  participants: string[];
  isMuted: boolean;
  isVideoEnabled: boolean;
  // Add more call state as needed
}

interface CallActions {
  startCall: (callId: string, participants: string[]) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
}

const useCallStore = create<CallState & CallActions>()(
  devtools((set) => ({
    isInCall: false,
    callId: null,
    participants: [],
    isMuted: false,
    isVideoEnabled: true,
    startCall: (callId, participants) =>
      set({ isInCall: true, callId, participants }),
    endCall: () =>
      set({ isInCall: false, callId: null, participants: [] }),
    toggleMute: () =>
      set((state) => ({ isMuted: !state.isMuted })),
    toggleVideo: () =>
      set((state) => ({ isVideoEnabled: !state.isVideoEnabled })),
  }))
);

export default useCallStore;
