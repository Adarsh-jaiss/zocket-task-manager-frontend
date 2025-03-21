"use client";

import { useEffect, useState } from "react";
import { Task, User, taskService, TaskAnalysis } from "@/services/task-service";
import { useAuthStore } from "@/store/auth-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Save, X, Trash, Sparkles, Plus, Loader2 } from "lucide-react";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { wsService } from "@/services/websocket-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function TaskList() {
  const { token, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [taskDetailsModalOpen, setTaskDetailsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<TaskAnalysis | null>(
    null
  );
  const [analyzingTaskIds, setAnalyzingTaskIds] = useState<Set<number>>(
    new Set()
  );
  const [editFormData, setEditFormData] = useState<{
    title: string;
    description: string;
    assigned_to: number;
    assigned_to_name: string;
  }>({
    title: "",
    description: "",
    assigned_to: 0,
    assigned_to_name: "",
  });

  // Fetch tasks using React Query and filter them
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => taskService.getTasks(token!),
    select: (tasks) => {
      if (!user?.id) return tasks;
      return tasks.filter(
        (task) => task.created_by === user.id || task.assigned_to === user.id
      );
    },
  });

  // Fetch users for assignee selection
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => taskService.getUsers(token!),
  });

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    if (token) {
      wsService.connect(token);

      const unsubscribeUpdate = wsService.onTaskUpdate((task) => {
        queryClient.setQueryData<Task[]>(["tasks"], (oldTasks = []) => {
          const index = oldTasks.findIndex((t) => t.id === task.id);
          if (index === -1) {
            return [...oldTasks, task];
          }
          const newTasks = [...oldTasks];
          newTasks[index] = task;
          return newTasks;
        });
      });

      const unsubscribeDelete = wsService.onTaskDelete((taskId) => {
        queryClient.setQueryData<Task[]>(["tasks"], (oldTasks = []) => {
          return oldTasks.filter((t) => t.id !== taskId);
        });
      });

      return () => {
        unsubscribeUpdate();
        unsubscribeDelete();
        wsService.disconnect();
      };
    }
  }, [token, queryClient]);

  const handleStatusChange = async (
    taskId: number,
    newStatus: Task["status"]
  ) => {
    try {
      // Optimistically update the status in cache
      queryClient.setQueryData<Task[]>(["tasks"], (oldTasks = []) => {
        return oldTasks.map((t) =>
          t.id === taskId ? { ...t, status: newStatus } : t
        );
      });

      await taskService.updateTask(token!, taskId, { status: newStatus });
      toast.success("Task status updated!");
    } catch (error) {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      if (axios.isAxiosError(error) && error.response) {
        toast.error(
          `Failed to update task status: ${
            error.response.data.message || "Unknown error"
          }`
        );
      } else {
        toast.error("Failed to update task status");
      }
    }
  };

  const handlePriorityChange = async (
    taskId: number,
    newPriority: Task["priority"]
  ) => {
    try {
      // Optimistically update the priority in cache
      queryClient.setQueryData<Task[]>(["tasks"], (oldTasks = []) => {
        return oldTasks.map((t) =>
          t.id === taskId ? { ...t, priority: newPriority } : t
        );
      });

      await taskService.updateTask(token!, taskId, { priority: newPriority });
      toast.success("Task priority updated!");
    } catch (error) {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      if (axios.isAxiosError(error) && error.response) {
        toast.error(
          `Failed to update task priority: ${
            error.response.data.message || "Unknown error"
          }`
        );
      } else {
        toast.error("Failed to update task priority");
      }
    }
  };

  const handleAssigneeChange = async (
    taskId: number,
    newAssigneeId: number
  ) => {
    try {
      console.log(
        "Updating task:",
        taskId,
        "with new assignee:",
        newAssigneeId
      );
      const assignee = users.find((u) => u.id === newAssigneeId);
      if (assignee) {
        const updateData = {
          assigned_to: newAssigneeId,
          assigned_to_name:
            `${assignee.first_name} ${assignee.last_name}`.trim(),
        };

        // Optimistically update the UI
        queryClient.setQueryData<Task[]>(["tasks"], (oldTasks = []) => {
          const updatedTasks = oldTasks.map((t) =>
            t.id === taskId ? { ...t, ...updateData } : t
          );
          console.log("Updated tasks:", updatedTasks);
          return updatedTasks;
        });

        // Make the API call
        const updatedTask = await taskService.updateTask(
          token!,
          taskId,
          updateData
        );
        console.log("API response:", updatedTask);
        toast.success("Assignee updated successfully!");
      }
    } catch (error) {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      console.error("Update error:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("API error response:", error.response.data);
        toast.error(
          `Failed to update assignee: ${
            error.response.data.message || "Unknown error"
          }`
        );
      } else {
        toast.error("Failed to update assignee");
      }
    }
  };

  const startEditingTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditFormData({
      title: task.title,
      description: task.description,
      assigned_to: task.assigned_to,
      assigned_to_name: task.assigned_to_name || "",
    });
  };

  const cancelEditingTask = () => {
    setEditingTaskId(null);
  };

  const handleEditFieldChange = (field: string, value: string | number) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveTaskChanges = async (taskId: number) => {
    try {
      // Optimistically update the task in cache
      queryClient.setQueryData<Task[]>(["tasks"], (oldTasks = []) => {
        return oldTasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                title: editFormData.title,
                description: editFormData.description,
                assigned_to: editFormData.assigned_to,
                assigned_to_name: editFormData.assigned_to_name,
              }
            : t
        );
      });

      await taskService.updateTask(token!, taskId, editFormData);
      toast.success("Task updated successfully!");
      setEditingTaskId(null);
    } catch (error) {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      if (axios.isAxiosError(error) && error.response) {
        toast.error(
          `Failed to update task: ${
            error.response.data.message || "Unknown error"
          }`
        );
      } else {
        toast.error("Failed to update task");
      }
    }
  };

  const deleteTask = async (taskId: number) => {
    if (confirm("Are you sure you want to delete this task?")) {
      try {
        // Optimistically remove the task from cache
        queryClient.setQueryData<Task[]>(["tasks"], (oldTasks = []) => {
          return oldTasks.filter((t) => t.id !== taskId);
        });

        await taskService.deleteTask(token!, taskId);
        toast.success("Task deleted successfully!");
      } catch (error) {
        // Revert optimistic update on error
        queryClient.invalidateQueries({ queryKey: ["tasks"] });

        if (axios.isAxiosError(error) && error.response) {
          if (
            error.response.data.error === "Not authorized to delete this task"
          ) {
            toast.error("You are not authorized to delete this task.");
          } else {
            toast.error(
              `Failed to delete task: ${
                error.response.data.message || "Unknown error"
              }`
            );
          }
        } else {
          toast.error("Failed to delete task");
        }
      }
    }
  };

  const handleAnalyzeTask = async (taskId: number) => {
    try {
      setAnalyzingTaskIds((prev) => new Set(prev).add(taskId));
      const task = tasks.find((t) => t.id === taskId);
      if (!task) {
        toast.error("Task not found");
        return;
      }

      const analysisRequest = {
        description: `Task Title: ${task.title}\n\nTask Description: ${task.description}`,
        context:
          "Please provide a detailed analysis of this task, including:\n" +
          "1. Task complexity assessment\n" +
          "2. Required skills and resources\n" +
          "3. Potential challenges and risks\n" +
          "4. A step-by-step breakdown of how to complete it efficiently\n" +
          "5. Suggestions for improvements or optimizations",
      };

      const analysis = await taskService.analyzeTask(
        token!,
        taskId,
        analysisRequest
      );
      setCurrentAnalysis(analysis);
      setAnalysisModalOpen(true);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        toast.error(
          `Failed to analyze task: ${
            error.response.data.message || "Unknown error"
          }`
        );
      } else {
        toast.error("Failed to analyze task");
      }
    } finally {
      setAnalyzingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const createTaskFromSubTask = async (subTask: {
    title: string;
    description: string;
    priority: Task["priority"];
  }) => {
    const tempId = Date.now();
    try {
      const newTask = {
        title: subTask.title,
        description: subTask.description,
        priority: subTask.priority,
        status: "ToDo" as const,
        assigned_to: user!.id,
        assigned_to_name: `${user!.first_name} ${user!.last_name}`.trim(),
        created_by: user!.id,
        id: tempId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies Partial<Task>;

      // Optimistically add the new task to cache
      queryClient.setQueryData<Task[]>(["tasks"], (oldTasks = []) => {
        return [...(oldTasks || []), newTask as Task];
      });

      // Make the API call
      const createdTask = await taskService.createTask(token!, {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        status: newTask.status,
        assigned_to: newTask.assigned_to,
        assigned_to_name: newTask.assigned_to_name,
      });

      // Update the cache with the real task from the server
      queryClient.setQueryData<Task[]>(["tasks"], (oldTasks = []) => {
        const filteredTasks = oldTasks.filter((t) => t.id !== tempId);
        return [...filteredTasks, createdTask];
      });

      toast.success("Task created successfully!");
      setAnalysisModalOpen(false); // Close the modal after successful creation
    } catch (error) {
      // Revert optimistic update on error
      queryClient.setQueryData<Task[]>(["tasks"], (oldTasks = []) => {
        return oldTasks.filter((t) => t.id !== tempId);
      });
      toast.error("Failed to create task from suggestion");
    }
  };

  const createAllSubTasks = async () => {
    if (!currentAnalysis) return;

    const allSubTasks = currentAnalysis.suggestions.flatMap((s) => s.sub_tasks);
    let createdCount = 0;
    const tempTasks: Task[] = [];

    try {
      // Create all tasks with temporary IDs first
      for (const [index, subTask] of allSubTasks.entries()) {
        const newTask = {
          title: subTask.title,
          description: subTask.description,
          priority: subTask.priority,
          status: "ToDo" as const,
          assigned_to: user!.id,
          assigned_to_name: `${user!.first_name} ${user!.last_name}`.trim(),
          created_by: user!.id,
          id: Date.now() + index,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } satisfies Partial<Task>;

        tempTasks.push(newTask as Task);

        // Update cache with temporary task
        queryClient.setQueryData<Task[]>(["tasks"], (oldTasks = []) => {
          return [...(oldTasks || []), newTask as Task];
        });
      }

      // Make API calls and update with real tasks
      for (const [index, subTask] of allSubTasks.entries()) {
        const tempTask = tempTasks[index];
        try {
          const createdTask = await taskService.createTask(token!, {
            title: subTask.title,
            description: subTask.description,
            priority: subTask.priority,
            status: "ToDo" as const,
            assigned_to: user!.id,
            assigned_to_name: `${user!.first_name} ${user!.last_name}`.trim(),
          });

          // Replace temp task with real task in cache
          queryClient.setQueryData<Task[]>(["tasks"], (oldTasks = []) => {
            const filteredTasks = oldTasks.filter((t) => t.id !== tempTask.id);
            return [...filteredTasks, createdTask];
          });

          createdCount++;
        } catch (error) {
          console.error("Failed to create subtask:", subTask.title);
          // Remove failed temp task from cache
          queryClient.setQueryData<Task[]>(["tasks"], (oldTasks = []) => {
            return oldTasks.filter((t) => t.id !== tempTask.id);
          });
        }
      }

      if (createdCount > 0) {
        toast.success(`Created ${createdCount} tasks successfully!`);
        setAnalysisModalOpen(false); // Close the modal after successful creation
      }
    } catch (error) {
      // Remove all temp tasks if something goes wrong
      for (const tempTask of tempTasks) {
        queryClient.setQueryData<Task[]>(["tasks"], (oldTasks = []) => {
          return oldTasks.filter((t) => t.id !== tempTask.id);
        });
      }
      toast.error("Failed to create tasks");
    }
  };

  // Generate profile image background color based on name
  const getProfileColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-indigo-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-red-500",
      "bg-orange-500",
      "bg-yellow-500",
      "bg-green-500",
      "bg-teal-500",
      "bg-cyan-500",
    ];

    // Simple hash function to get consistent color for same name
    const hash = name
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const showTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setTaskDetailsModalOpen(true);
  };

  return (
    <div className="rounded-lg border border-gray-200 shadow-sm bg-white">
      {isLoading ? (
        <div className="text-center py-8">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No tasks found. Create a new task to get started!
        </div>
      ) : (
        <div className="relative">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[80px]">
                      Task no.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[400px]">
                      Task name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[220px]">
                      Assignee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[220px]">
                      Created By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[140px]">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[140px]">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {tasks.map((task, index) => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        {editingTaskId === task.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editFormData.title}
                              onChange={(e) =>
                                handleEditFieldChange("title", e.target.value)
                              }
                              className="font-medium"
                              placeholder="Task title"
                            />
                            <Textarea
                              value={editFormData.description}
                              onChange={(e) =>
                                handleEditFieldChange(
                                  "description",
                                  e.target.value
                                )
                              }
                              className="text-sm"
                              rows={3}
                              placeholder="Task description"
                            />
                          </div>
                        ) : (
                          <div
                            className="min-w-[300px] max-w-[400px] cursor-pointer"
                            onClick={() => showTaskDetails(task)}
                          >
                            <div className="font-medium text-gray-900 mb-1">
                              {task.title}
                            </div>
                            <div className="text-sm text-gray-500 line-clamp-2">
                              {task.description}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex-shrink-0 h-8 w-8 rounded-full ${getProfileColor(
                              task.assigned_to_name
                            )} flex items-center justify-center text-white font-medium`}
                          >
                            {task.assigned_to_name?.charAt(0)}
                          </div>
                          <Select
                            value={String(task.assigned_to)}
                            onValueChange={(value) =>
                              handleAssigneeChange(task.id, parseInt(value))
                            }
                            disabled={task.created_by !== user?.id}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select assignee" />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map((user) => (
                                <SelectItem
                                  key={user.id}
                                  value={String(user.id)}
                                >
                                  {`${user.first_name} ${user.last_name}`.trim()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex-shrink-0 h-8 w-8 rounded-full ${getProfileColor(
                              users.find((u) => u.id === task.created_by)
                                ?.first_name || ""
                            )} flex items-center justify-center text-white font-medium`}
                          >
                            {users
                              .find((u) => u.id === task.created_by)
                              ?.first_name?.charAt(0)}
                          </div>
                          <span className="text-sm text-gray-900">
                            {users.find((u) => u.id === task.created_by)
                              ? `${
                                  users.find((u) => u.id === task.created_by)
                                    ?.first_name
                                } ${
                                  users.find((u) => u.id === task.created_by)
                                    ?.last_name
                                }`.trim()
                              : "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Select
                          value={task.status}
                          onValueChange={(value) =>
                            handleStatusChange(task.id, value as Task["status"])
                          }
                          disabled={
                            task.created_by !== user?.id &&
                            task.assigned_to !== user?.id
                          }
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ToDo">To Do</SelectItem>
                            <SelectItem value="InProgress">
                              In Progress
                            </SelectItem>
                            <SelectItem value="Done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Select
                          value={task.priority}
                          onValueChange={(value) =>
                            handlePriorityChange(
                              task.id,
                              value as Task["priority"]
                            )
                          }
                          disabled={task.created_by !== user?.id}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        {task.created_by === user?.id &&
                          (editingTaskId === task.id ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => saveTaskChanges(task.id)}
                              >
                                <Save className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={cancelEditingTask}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEditingTask(task)}
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteTask(task.id)}
                              >
                                <Trash className="h-4 w-4 mr-1" />
                              </Button>
                            </>
                          ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAnalyzeTask(task.id)}
                          disabled={analyzingTaskIds.has(task.id)}
                        >
                          {analyzingTaskIds.has(task.id) ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-1" />
                          )}
                          Analyze
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      <Dialog
        open={taskDetailsModalOpen}
        onOpenChange={setTaskDetailsModalOpen}
      >
        <DialogContent className="max-w-[600px]">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Task Details
            </DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Title
                </h3>
                <p className="text-gray-900">{selectedTask.title}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Description
                </h3>
                <p className="text-gray-600 whitespace-pre-wrap">
                  {selectedTask.description}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <p className="text-gray-900">{selectedTask.status}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Priority
                  </h3>
                  <p className="text-gray-900">{selectedTask.priority}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Assignee
                  </h3>
                  <p className="text-gray-900">
                    {selectedTask.assigned_to_name}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Analysis Modal */}
      <Dialog open={analysisModalOpen} onOpenChange={setAnalysisModalOpen}>
        <DialogContent className="!max-w-[60%] !w-[60%] !h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-6 border-b bg-white">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-3xl font-bold text-gray-900">
                Task Analysis Report
              </DialogTitle>
              {/* {currentAnalysis &&
                currentAnalysis.suggestions.some(
                  (s) => s.sub_tasks.length > 0
                ) && (
                  <Button
                    onClick={createAllSubTasks}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create All Tasks
                  </Button>
                )} */}
            </div>
          </DialogHeader>
          {currentAnalysis && (
            <div className="flex-1 overflow-y-auto px-6">
              <div className="space-y-8 py-8">
                <Card className="border-2 border-blue-100 shadow-sm">
                  <CardHeader className="bg-blue-50/50 pb-6">
                    <CardTitle className="text-2xl text-blue-700">
                      Analysis Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 px-6">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg">
                      {currentAnalysis.analysis}
                    </p>
                  </CardContent>
                </Card>

                {currentAnalysis.suggestions.length > 0 && (
                  <Card className="border-2 border-emerald-100 shadow-sm">
                    <CardHeader className="bg-emerald-50/50 pb-6">
                      <CardTitle className="text-2xl text-emerald-700">
                        Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8 pt-6 px-6">
                      {currentAnalysis.suggestions.map((suggestion) => (
                        <div key={suggestion.id} className="space-y-6">
                          <div className="text-gray-700 leading-relaxed bg-white p-6 rounded-lg border border-gray-100 text-lg">
                            {suggestion.suggestion_text}
                          </div>

                          {suggestion.sub_tasks.length > 0 && (
                            <div className="pl-8 space-y-6">
                              <h4 className="font-semibold text-2xl text-gray-900">
                                Implementation Steps:
                              </h4>
                              <div className="grid gap-6">
                                {suggestion.sub_tasks.map((subTask, index) => (
                                  <div
                                    key={index}
                                    className="bg-white p-6 rounded-lg border-l-4 border shadow-sm transition-all hover:shadow-md"
                                    style={{
                                      borderLeftColor:
                                        subTask.priority === "High"
                                          ? "rgb(239 68 68)"
                                          : subTask.priority === "Medium"
                                          ? "rgb(59 130 246)"
                                          : "rgb(107 114 128)",
                                    }}
                                  >
                                    <div className="flex items-center justify-between mb-4">
                                      <h5 className="font-medium text-xl text-gray-900">
                                        {index + 1}. {subTask.title}
                                      </h5>
                                      <div className="flex items-center gap-4">
                                        <Badge
                                          variant={
                                            subTask.priority === "High"
                                              ? "destructive"
                                              : subTask.priority === "Medium"
                                              ? "default"
                                              : "secondary"
                                          }
                                          className="h-7 text-sm px-3"
                                        >
                                          {subTask.priority}
                                        </Badge>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            createTaskFromSubTask(subTask)
                                          }
                                          className="h-8 px-4"
                                        >
                                          <Plus className="h-4 w-4 mr-2" />
                                          Create Task
                                        </Button>
                                      </div>
                                    </div>
                                    <p className="text-gray-600 text-base leading-relaxed">
                                      {subTask.description}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
