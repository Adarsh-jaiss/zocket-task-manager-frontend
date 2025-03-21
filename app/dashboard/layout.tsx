"use client";

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { wsService } from "@/services/websocket-service";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, user } = useAuthStore();

  useEffect(() => {
    if (token) {
      // Connect WebSocket
      wsService.connect(token);

      // Set up WebSocket event handlers using the correct methods
      const unsubscribeUpdate = wsService.onTaskUpdate(() => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      });

      const unsubscribeDelete = wsService.onTaskDelete(() => {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      });

      return () => {
        unsubscribeUpdate();
        unsubscribeDelete();
        wsService.disconnect();
      };
    }
  }, [token]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-semibold text-gray-900">
              Welcome {user?.first_name || "User"}!
            </h1>
            <button
              onClick={() => useAuthStore.getState().clearAuth()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sign Out
            </button>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </QueryClientProvider>
  );
}
