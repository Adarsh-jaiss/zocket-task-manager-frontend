"use client";

import { useEffect } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
// import { wsService } from "@/services/websocket-service";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: false,
    },
  },
});

function UserInfo() {
  const { user } = useAuthStore();
  
  const { data: userData } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await fetch(`https://zocket-task-manager-backend.onrender.com/api/v1/user/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().token}`
        }
      });
      return response.json();
    },
    enabled: !!user?.id
  });

  return (
    <h1 className="text-3xl font-semibold text-gray-900">
      Welcome {userData?.first_name} {userData?.last_name || "User"}!
    </h1>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token } = useAuthStore();

  useEffect(() => {
    // if (token) {
    //   wsService.connect(token);
    //   const unsubscribeUpdate = wsService.onTaskUpdate(() => {
    //     queryClient.invalidateQueries({ queryKey: ["tasks"] });
    //   });

    //   const unsubscribeDelete = wsService.onTaskDelete(() => {
    //     queryClient.invalidateQueries({ queryKey: ["tasks"] });
    //   });

    //   return () => {
    //     unsubscribeUpdate();
    //     unsubscribeDelete();
    //     wsService.disconnect();
    //   };
    // }
  }, [token]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <UserInfo />
            <button
              onClick={() => {
              useAuthStore.getState().clearAuth();
              window.location.href = '/auth/signin';
              }}
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