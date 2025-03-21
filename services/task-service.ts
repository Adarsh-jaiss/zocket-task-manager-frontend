import axios from "axios";

export interface Task {
  id: number;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
  status: "ToDo" | "InProgress" | "Done";
  assigned_to: number;
  assigned_to_name: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  priority: Task["priority"];
  status: Task["status"];
  assigned_to: number;
  assigned_to_name: string;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {}

export interface TaskAnalysis {
  task_id: number;
  analysis: string;
  suggestions: {
    id: number;
    task_id: number;
    user_id: number;
    suggestion_text: string;
    sub_tasks: {
      title: string;
      description: string;
      priority: Task["priority"];
    }[];
    accepted: boolean;
    created_at: string;
  }[];
}

class TaskService {
  private baseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

  async listTasks(token: string): Promise<Task[]> {
    const response = await axios.get(`${this.baseUrl}/v1/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }

  async getTasks(token: string): Promise<Task[]> {
    return this.listTasks(token);
  }

  async getUsers(token: string): Promise<User[]> {
    const response = await axios.get(`${this.baseUrl}/v1/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }

  async createTask(token: string, data: CreateTaskInput): Promise<Task> {
    const response = await axios.post(`${this.baseUrl}/v1/tasks`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }

  async updateTask(
    token: string,
    taskId: number,
    data: UpdateTaskInput
  ): Promise<Task> {
    try {
      console.log(
        "Sending update request for task:",
        taskId,
        "with data:",
        data
      );
      const response = await axios.put(
        `${this.baseUrl}/v1/tasks/${taskId}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Update response:", response.data);
      return response.data;
    } catch (error) {
      console.error("Error in updateTask:", error);
      if (axios.isAxiosError(error)) {
        console.error("API error details:", {
          status: error.response?.status,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            data: error.config?.data,
          },
        });
        throw error;
      }
      throw new Error("Failed to update task");
    }
  }

  async deleteTask(token: string, taskId: number): Promise<void> {
    await axios.delete(`${this.baseUrl}/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async analyzeTask(
    token: string,
    taskId: number,
    context?: { description?: string; context?: string }
  ): Promise<any> {
    const response = await axios.post(
      `${this.baseUrl}/v1/tasks/${taskId}/analyze`,
      context,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  }
}

export const taskService = new TaskService();
