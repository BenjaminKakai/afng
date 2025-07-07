// Shared Auth Store
import { create } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";

interface AuthState {
  user: any;
  token: string | null;
  login: (userData: any, token: string) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        token: null,
        login: (userData, token) => set({ user: userData, token }),
        logout: () => set({ user: null, token: null }),
      }),
      {
        name: "auth-storage",
        storage: createJSONStorage(() => localStorage),
      }
    )
  )
);

export default useAuthStore;
