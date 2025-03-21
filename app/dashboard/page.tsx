"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { taskService } from "@/services/task-service";
import { CreateTaskForm } from "@/components/tasks/CreateTaskForm";
import { TaskList } from "@/components/tasks/TaskList";

export default function DashboardPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { token } = useAuthStore();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => taskService.listTasks(token!),
    enabled: !!token,
  });

  const handleCreateTask = async () => {
    setShowCreateForm(true);
  };

  const handleTaskCreated = () => {
    setShowCreateForm(false);
    toast.success("Task created successfully!");
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Your Tasks</h2>
        <button
          onClick={handleCreateTask}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
        >
          Create New Task
        </button>
      </div>

      {showCreateForm && (
        <CreateTaskForm
          onSuccess={handleTaskCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {isLoading ? <div>Loading tasks...</div> : <TaskList />}
    </div>
  );
}
