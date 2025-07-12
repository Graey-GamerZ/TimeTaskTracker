import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Clock, Bell, BellOff, Plus, Calendar, CheckCircle, AlertTriangle, TriangleAlert, Edit, Trash2, Download, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { Task, insertTaskSchema } from "@shared/schema";
import { notificationService } from "@/lib/notifications";
import { useTheme } from "@/contexts/ThemeContext";

const taskFormSchema = insertTaskSchema.extend({
  scheduledDate: z.string().min(1, "Date is required"),
  scheduledTime: z.string().min(1, "Time is required"),
}).transform((data) => ({
  ...data,
  scheduledDate: new Date(`${data.scheduledDate}T${data.scheduledTime}`),
}));

type TaskFormData = z.infer<typeof taskFormSchema>;

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [hasNotificationPermission, setHasNotificationPermission] = useState(notificationService.hasPermission);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      scheduledDate: format(new Date(), "yyyy-MM-dd"),
      scheduledTime: format(new Date(), "HH:mm"),
      priority: "medium",
      category: "personal",
    },
  });

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const response = await apiRequest("POST", "/api/tasks", data);
      return response.json();
    },
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      notificationService.scheduleNotification(newTask);
      toast({
        title: "Task created",
        description: "Your task has been scheduled successfully.",
      });
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Task> }) => {
      const response = await apiRequest("PATCH", `/api/tasks/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task deleted",
        description: "Task has been removed successfully.",
      });
    },
  });

  const onSubmit = (data: TaskFormData) => {
    createTaskMutation.mutate(data);
  };

  const toggleTask = (task: Task) => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: { completed: !task.completed },
    });
    
    if (!task.completed) {
      notificationService.clearNotification(task.id);
    } else {
      notificationService.scheduleNotification(task);
    }
  };

  const deleteTask = (id: number) => {
    notificationService.clearNotification(id);
    deleteTaskMutation.mutate(id);
  };

  const requestNotificationPermission = async () => {
    if (isRequestingPermission) return;
    
    try {
      setIsRequestingPermission(true);
      console.log('Requesting notification permission...');
      
      // First, refresh the permission status
      const currentStatus = notificationService.refreshPermissionStatus();
      console.log('Current permission status after refresh:', currentStatus);
      
      if (currentStatus) {
        // Permission is already granted
        setHasNotificationPermission(true);
        toast({
          title: "Notifications already enabled!",
          description: "You'll receive desktop notifications for your tasks.",
        });
        
        // Schedule notifications for all pending tasks
        tasks.filter(task => !task.completed).forEach(task => {
          notificationService.scheduleNotification(task);
        });
        
        // Test desktop notification
        setTimeout(() => {
          notificationService.testDesktopNotification();
        }, 1000);
        return;
      }
      
      const granted = await notificationService.requestPermission();
      console.log('Permission granted:', granted);
      
      setHasNotificationPermission(granted);
      
      if (granted) {
        toast({
          title: "Notifications enabled!",
          description: "You'll receive desktop notifications for your tasks.",
        });
        
        // Schedule notifications for all pending tasks
        tasks.filter(task => !task.completed).forEach(task => {
          notificationService.scheduleNotification(task);
        });
        
        // Test desktop notification
        setTimeout(() => {
          notificationService.testDesktopNotification();
        }, 1000);
      } else {
        toast({
          title: "Notifications blocked",
          description: "Please refresh the page and try again, or check your browser settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: "Error",
        description: "Failed to request notification permission.",
        variant: "destructive",
      });
    } finally {
      setIsRequestingPermission(false);
    }
  };

  useEffect(() => {
    if (hasNotificationPermission) {
      tasks.filter(task => !task.completed).forEach(task => {
        notificationService.scheduleNotification(task);
      });
    }
  }, [tasks, hasNotificationPermission]);

  // Check permission status only once on page load
  useEffect(() => {
    const currentStatus = notificationService.refreshPermissionStatus();
    if (currentStatus !== hasNotificationPermission) {
      setHasNotificationPermission(currentStatus);
    }
  }, []);

  // PWA Install functionality
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast({
        title: "App installed!",
        description: "Task Manager is now available on your desktop.",
      });
    }
    
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === "completed") return task.completed;
    if (filter === "pending") return !task.completed;
    return true;
  });

  const getTaskStatus = (task: Task) => {
    const now = new Date();
    const taskTime = new Date(task.scheduledDate);
    const timeDiff = taskTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (task.completed) return "completed";
    if (timeDiff < 0) return "overdue";
    if (hoursDiff < 2) return "due-soon";
    return "scheduled";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 border-green-200 dark:bg-green-900/20 dark:border-green-700";
      case "overdue": return "bg-yellow-100 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700";
      case "due-soon": return "bg-red-100 border-red-200 dark:bg-red-900/20 dark:border-red-700";
      default: return "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-blue-500";
      case "low": return "bg-gray-400";
      default: return "bg-gray-400";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "work": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "personal": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "shopping": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "health": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = tasks.filter(t => !t.completed).length;
  const overdueTasks = tasks.filter(t => !t.completed && new Date(t.scheduledDate) < new Date()).length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-500 p-2 rounded-lg">
                <Clock className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-xl font-medium text-gray-900 dark:text-white">TaskTime</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Smart TODO with Notifications</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {showInstallButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInstallClick}
                  className="flex items-center space-x-2 px-3 h-10 bg-green-50 text-green-600 border-green-600 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-900 border-2 transition-all duration-200"
                  title="Install app on desktop"
                >
                  <Download className="w-4 h-4 stroke-2" />
                  <span className="text-sm">Install App</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                className="relative flex items-center space-x-2 px-3 h-10 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 transition-all duration-200 bg-white dark:bg-gray-800"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="h-4 w-4 text-yellow-500 stroke-2" />
                    <span className="text-sm text-gray-700 dark:text-gray-200">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 text-slate-600 dark:text-slate-300 stroke-2" />
                    <span className="text-sm text-gray-700 dark:text-gray-200">Dark</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={requestNotificationPermission}
                className="relative flex items-center space-x-2 px-3 h-10 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 transition-all duration-200 bg-white dark:bg-gray-800"
                title={hasNotificationPermission ? 'Notifications enabled' : 'Enable notifications'}
              >
                {hasNotificationPermission ? (
                  <>
                    <Bell className="h-4 w-4 text-green-600 stroke-2" />
                    <span className="text-sm text-gray-700 dark:text-gray-200">On</span>
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4 text-red-600 stroke-2" />
                    <span className="text-sm text-gray-700 dark:text-gray-200">Off</span>
                  </>
                )}
                {pendingTasks > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingTasks}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Notification Permission Banner */}
      {!hasNotificationPermission && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 m-4 rounded-r-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <TriangleAlert className="text-yellow-400 h-5 w-5" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Enable Notifications</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Get notifications 5 minutes before and exactly when your tasks are due.</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  If you've already allowed notifications, click "Test Now" to bypass the browser cache issue.
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={() => {
                  console.log('Test Now button clicked');
                  const success = notificationService.testDesktopNotification();
                  console.log('Test result:', success);
                  if (success) {
                    setHasNotificationPermission(true);
                    toast({
                      title: "Notifications working!",
                      description: "Desktop notifications are now enabled.",
                    });
                  } else {
                    toast({
                      title: "Test failed",
                      description: "Notifications may be blocked. Try refreshing the page.",
                      variant: "destructive",
                    });
                  }
                }}
                variant="outline"
                size="sm"
                className="text-green-600 border-green-600"
              >
                Test Now
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-600"
              >
                Refresh Page
              </Button>
              <Button 
                onClick={requestNotificationPermission} 
                disabled={isRequestingPermission}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isRequestingPermission ? "Requesting..." : "Enable"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Status Banner */}
      {hasNotificationPermission && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-4 m-4 rounded-r-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="text-blue-400 h-5 w-5" />
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Desktop Notifications Active</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {pendingTasks > 0 
                    ? `You'll receive desktop notifications with sound alerts 5 minutes before and exactly when your ${pendingTasks} pending task${pendingTasks > 1 ? 's are' : ' is'} due.`
                    : "Desktop notifications are enabled. Create a task to receive alerts."
                  }
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const success = notificationService.testDesktopNotification();
                  if (success) {
                    toast({
                      title: "Test notification sent!",
                      description: "Check your desktop for the notification.",
                    });
                  } else {
                    toast({
                      title: "Test failed",
                      description: "Check browser console for details.",
                      variant: "destructive",
                    });
                  }
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Test Notification
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const permission = Notification.permission;
                  const supported = "Notification" in window;
                  
                  alert(`Notification Debug Info:
- Browser Support: ${supported ? 'Yes' : 'No'}
- Permission Status: ${permission}
- Service Status: ${notificationService.hasPermission ? 'Enabled' : 'Disabled'}

If permission is "denied", click the lock icon in your browser's address bar and allow notifications.
If permission is "default", click "Test Notification" to request permission.`);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white"
              >
                Debug Info
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Task Creation Panel */}
          <div className="lg:col-span-1">
            <Card className="dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-lg font-medium dark:text-white">Create New Task</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Task Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter task description..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="scheduledDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="scheduledTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low Priority</SelectItem>
                              <SelectItem value="medium">Medium Priority</SelectItem>
                              <SelectItem value="high">High Priority</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="work">Work</SelectItem>
                              <SelectItem value="personal">Personal</SelectItem>
                              <SelectItem value="shopping">Shopping</SelectItem>
                              <SelectItem value="health">Health</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full bg-blue-500 hover:bg-blue-600"
                      disabled={createTaskMutation.isPending}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Task Stats */}
            <Card className="mt-6 dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-lg font-medium dark:text-white">Today's Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Total Tasks</span>
                  <span className="font-medium text-lg dark:text-white">{totalTasks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Completed</span>
                  <span className="font-medium text-lg text-green-600 dark:text-green-400">{completedTasks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Pending</span>
                  <span className="font-medium text-lg text-red-600 dark:text-red-400">{pendingTasks}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Overdue</span>
                  <span className="font-medium text-lg text-yellow-600 dark:text-yellow-400">{overdueTasks}</span>
                </div>
                <div className="mt-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{completionPercentage}% completed</p>
              </CardContent>
            </Card>
          </div>

          {/* Task List */}
          <div className="lg:col-span-2">
            <Card className="dark:bg-gray-800">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-medium dark:text-white">Your Tasks</CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      variant={filter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter("all")}
                      className={filter === "all" ? "bg-blue-500 hover:bg-blue-600" : ""}
                    >
                      All
                    </Button>
                    <Button
                      variant={filter === "pending" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter("pending")}
                      className={filter === "pending" ? "bg-blue-500 hover:bg-blue-600" : ""}
                    >
                      Pending
                    </Button>
                    <Button
                      variant={filter === "completed" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFilter("completed")}
                      className={filter === "completed" ? "bg-blue-500 hover:bg-blue-600" : ""}
                    >
                      Completed
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading tasks...</div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No tasks yet</h3>
                    <p className="text-gray-500 mb-4">Create your first task to get started with smart reminders</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredTasks.map((task) => {
                      const status = getTaskStatus(task);
                      return (
                        <div
                          key={task.id}
                          className={`flex items-center space-x-4 p-4 rounded-lg border hover:shadow-md transition-shadow duration-200 ${getStatusColor(status)}`}
                        >
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={() => toggleTask(task)}
                            className="h-5 w-5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <Badge className={`${getPriorityColor(task.priority)} text-white`}>
                                {task.priority}
                              </Badge>
                              <Badge variant="secondary" className={getCategoryColor(task.category)}>
                                {task.category}
                              </Badge>
                            </div>
                            <h3 className={`font-medium mt-1 ${task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                              {task.title}
                            </h3>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {format(new Date(task.scheduledDate), "MMM d")}
                              </span>
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {format(new Date(task.scheduledDate), "h:mm a")}
                              </span>
                              <span className={`flex items-center ${
                                status === "completed" ? "text-green-600 dark:text-green-400" :
                                status === "overdue" ? "text-yellow-600 dark:text-yellow-400" :
                                status === "due-soon" ? "text-red-600 dark:text-red-400" : "text-gray-400 dark:text-gray-500"
                              }`}>
                                {status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                                {status === "overdue" && <AlertTriangle className="h-3 w-3 mr-1" />}
                                {status === "due-soon" && <TriangleAlert className="h-3 w-3 mr-1" />}
                                {status === "scheduled" && <Clock className="h-3 w-3 mr-1" />}
                                {status === "completed" ? "Completed" :
                                 status === "overdue" ? "Overdue" :
                                 status === "due-soon" ? "Due soon" : "Scheduled"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTask(task.id)}
                              className="text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
