import { io, Socket } from "socket.io-client";
import { Task } from "./task-service";

class WebSocketService {
  private socket: Socket | null = null;
  private taskUpdateCallbacks: ((task: Task) => void)[] = [];
  private taskDeleteCallbacks: ((taskId: number) => void)[] = [];
  private connectionAttempts = 0;
  private maxRetries = 3;

  connect(token: string) {
    if (this.socket?.connected) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      this.socket = io(baseUrl, {
        path: "/api/v1/ws",
        auth: {
          token,
        },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: this.maxRetries,
        reconnectionDelay: 1000,
      });

      this.socket.on("connect", () => {
        console.log("WebSocket connected");
        this.connectionAttempts = 0;
      });

      this.socket.on("connect_error", (error) => {
        console.error("WebSocket connection error:", error);
        this.connectionAttempts++;

        if (this.connectionAttempts >= this.maxRetries) {
          console.error(
            "Max connection attempts reached, stopping reconnection"
          );
          this.socket?.disconnect();
        }
      });

      this.socket.on("task_created", (task: Task) => {
        this.taskUpdateCallbacks.forEach((cb) => cb(task));
      });

      this.socket.on("task_updated", (task: Task) => {
        this.taskUpdateCallbacks.forEach((cb) => cb(task));
      });

      this.socket.on("task_deleted", (taskId: number) => {
        this.taskDeleteCallbacks.forEach((cb) => cb(taskId));
      });

      this.socket.on("disconnect", () => {
        console.log("WebSocket disconnected");
      });

      this.socket.on("error", (error: Error) => {
        console.error("WebSocket error:", error);
      });
    } catch (error) {
      console.error("Failed to initialize WebSocket:", error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionAttempts = 0;
    }
  }

  onTaskUpdate(callback: (task: Task) => void) {
    this.taskUpdateCallbacks.push(callback);
    return () => {
      this.taskUpdateCallbacks = this.taskUpdateCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  onTaskDelete(callback: (taskId: number) => void) {
    this.taskDeleteCallbacks.push(callback);
    return () => {
      this.taskDeleteCallbacks = this.taskDeleteCallbacks.filter(
        (cb) => cb !== callback
      );
    };
  }

  // Add method to check connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const wsService = new WebSocketService();
