const { Task, TaskManager } = require("./taskManager.js");

describe("Task Class", () => {
  describe("Constructor", () => {
    test("should create a task with description and default done status", () => {
      const task = new Task("Test task");

      expect(task.description).toBe("Test task");
      expect(task.done).toBe(false);
      expect(task.id).toBeDefined();
      expect(typeof task.id).toBe("string");
    });

    test("should create a task with custom done status", () => {
      const task = new Task("Completed task", true);

      expect(task.description).toBe("Completed task");
      expect(task.done).toBe(true);
    });

    test("should generate unique IDs for different tasks", () => {
      const task1 = new Task("Task 1");
      const task2 = new Task("Task 2");

      expect(task1.id).not.toBe(task2.id);
    });
  });

  describe("generateId static method", () => {
    test("should generate a string ID", () => {
      const id = Task.generateId();

      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });

    test("should generate unique IDs", () => {
      const id1 = Task.generateId();
      const id2 = Task.generateId();

      expect(id1).not.toBe(id2);
    });

    test("should follow expected format", () => {
      const id = Task.generateId();

      expect(id).toMatch(/^task_\d+_[a-z0-9]+$/);
    });
  });

  describe("toString method", () => {
    test("should return correct format for pending task", () => {
      const task = new Task("Pending task", false);

      expect(task.toString()).toBe("○ Pending task");
    });

    test("should return correct format for completed task", () => {
      const task = new Task("Completed task", true);

      expect(task.toString()).toBe("✓ Completed task");
    });
  });
});

describe("TaskManager Class", () => {
  let taskManager;

  beforeEach(() => {
    taskManager = new TaskManager();
  });

  describe("Constructor", () => {
    test("should initialize with empty tasks array", () => {
      expect(taskManager.tasks).toEqual([]);
      expect(taskManager.getTaskCount()).toBe(0);
    });
  });

  describe("addTask method", () => {
    test("should add a task with valid description", () => {
      const task = taskManager.addTask("New task");

      expect(task).toBeInstanceOf(Task);
      expect(task.description).toBe("New task");
      expect(task.done).toBe(false);
      expect(taskManager.getTaskCount()).toBe(1);
    });

    test("should trim whitespace from description", () => {
      const task = taskManager.addTask("  Spaced task  ");

      expect(task.description).toBe("Spaced task");
    });

    test("should throw error for empty description", () => {
      expect(() => taskManager.addTask("")).toThrow(
        "Task description must be a non-empty string"
      );
      expect(() => taskManager.addTask("   ")).toThrow(
        "Task description must be a non-empty string"
      );
    });

    test("should throw error for non-string description", () => {
      expect(() => taskManager.addTask(null)).toThrow(
        "Task description must be a non-empty string"
      );
      expect(() => taskManager.addTask(undefined)).toThrow(
        "Task description must be a non-empty string"
      );
      expect(() => taskManager.addTask(123)).toThrow(
        "Task description must be a non-empty string"
      );
    });

    test("should add multiple tasks", () => {
      taskManager.addTask("Task 1");
      taskManager.addTask("Task 2");
      taskManager.addTask("Task 3");

      expect(taskManager.getTaskCount()).toBe(3);
    });
  });

  describe("listTasks method", () => {
    test("should return empty array for no tasks", () => {
      const tasks = taskManager.listTasks();

      expect(tasks).toEqual([]);
    });

    test("should return copy of tasks array", () => {
      taskManager.addTask("Task 1");
      const tasks = taskManager.listTasks();

      expect(tasks).not.toBe(taskManager.tasks);
      expect(tasks).toEqual(taskManager.tasks);
    });

    test("should return all tasks", () => {
      const task1 = taskManager.addTask("Task 1");
      const task2 = taskManager.addTask("Task 2");
      const tasks = taskManager.listTasks();

      expect(tasks).toHaveLength(2);
      expect(tasks[0]).toBe(task1);
      expect(tasks[1]).toBe(task2);
    });
  });

  describe("markTaskAsDone method", () => {
    test("should mark existing task as done", () => {
      const task = taskManager.addTask("Test task");
      const result = taskManager.markTaskAsDone(task.id);

      expect(result).toBe(true);
      expect(task.done).toBe(true);
    });

    test("should return false for non-existent task", () => {
      const result = taskManager.markTaskAsDone("non-existent-id");

      expect(result).toBe(false);
    });

    test("should not affect other tasks", () => {
      const task1 = taskManager.addTask("Task 1");
      const task2 = taskManager.addTask("Task 2");

      taskManager.markTaskAsDone(task1.id);

      expect(task1.done).toBe(true);
      expect(task2.done).toBe(false);
    });
  });

  describe("undoMarkDone method", () => {
    test("should mark completed task as undone", () => {
      const task = taskManager.addTask("Test task");
      taskManager.markTaskAsDone(task.id);
      const result = taskManager.undoMarkDone(task.id);

      expect(result).toBe(true);
      expect(task.done).toBe(false);
    });

    test("should return false for non-existent task", () => {
      const result = taskManager.undoMarkDone("non-existent-id");

      expect(result).toBe(false);
    });

    test("should work on already pending task", () => {
      const task = taskManager.addTask("Test task");
      const result = taskManager.undoMarkDone(task.id);

      expect(result).toBe(true);
      expect(task.done).toBe(false);
    });
  });

  describe("deleteTask method", () => {
    test("should delete existing task", () => {
      const task = taskManager.addTask("Test task");
      const result = taskManager.deleteTask(task.id);

      expect(result).toBe(true);
      expect(taskManager.getTaskCount()).toBe(0);
      expect(taskManager.findTaskById(task.id)).toBe(null);
    });

    test("should return false for non-existent task", () => {
      const result = taskManager.deleteTask("non-existent-id");

      expect(result).toBe(false);
    });

    test("should not affect other tasks when deleting", () => {
      const task1 = taskManager.addTask("Task 1");
      const task2 = taskManager.addTask("Task 2");
      const task3 = taskManager.addTask("Task 3");

      taskManager.deleteTask(task2.id);

      expect(taskManager.getTaskCount()).toBe(2);
      expect(taskManager.findTaskById(task1.id)).toBe(task1);
      expect(taskManager.findTaskById(task2.id)).toBe(null);
      expect(taskManager.findTaskById(task3.id)).toBe(task3);
    });
  });

  describe("findTaskById method", () => {
    test("should find existing task", () => {
      const task = taskManager.addTask("Test task");
      const found = taskManager.findTaskById(task.id);

      expect(found).toBe(task);
    });

    test("should return null for non-existent task", () => {
      const found = taskManager.findTaskById("non-existent-id");

      expect(found).toBe(null);
    });
  });

  describe("getCompletedTasks method", () => {
    test("should return empty array when no completed tasks", () => {
      taskManager.addTask("Pending task");
      const completed = taskManager.getCompletedTasks();

      expect(completed).toEqual([]);
    });

    test("should return only completed tasks", () => {
      const task1 = taskManager.addTask("Task 1");
      const task2 = taskManager.addTask("Task 2");
      const task3 = taskManager.addTask("Task 3");

      taskManager.markTaskAsDone(task1.id);
      taskManager.markTaskAsDone(task3.id);

      const completed = taskManager.getCompletedTasks();

      expect(completed).toHaveLength(2);
      expect(completed).toContain(task1);
      expect(completed).toContain(task3);
      expect(completed).not.toContain(task2);
    });
  });

  describe("getPendingTasks method", () => {
    test("should return all tasks when none completed", () => {
      const task1 = taskManager.addTask("Task 1");
      const task2 = taskManager.addTask("Task 2");
      const pending = taskManager.getPendingTasks();

      expect(pending).toHaveLength(2);
      expect(pending).toContain(task1);
      expect(pending).toContain(task2);
    });

    test("should return only pending tasks", () => {
      const task1 = taskManager.addTask("Task 1");
      const task2 = taskManager.addTask("Task 2");
      const task3 = taskManager.addTask("Task 3");

      taskManager.markTaskAsDone(task2.id);

      const pending = taskManager.getPendingTasks();

      expect(pending).toHaveLength(2);
      expect(pending).toContain(task1);
      expect(pending).toContain(task3);
      expect(pending).not.toContain(task2);
    });
  });

  describe("getTaskSummary method", () => {
    test("should return correct summary for empty task list", () => {
      const summary = taskManager.getTaskSummary();

      expect(summary).toEqual({
        total: 0,
        completed: 0,
        pending: 0,
        completionRate: 0,
      });
    });

    test("should return correct summary with mixed tasks", () => {
      const task1 = taskManager.addTask("Task 1");
      const task2 = taskManager.addTask("Task 2");
      const task3 = taskManager.addTask("Task 3");
      const task4 = taskManager.addTask("Task 4");

      taskManager.markTaskAsDone(task1.id);
      taskManager.markTaskAsDone(task3.id);

      const summary = taskManager.getTaskSummary();

      expect(summary).toEqual({
        total: 4,
        completed: 2,
        pending: 2,
        completionRate: 50,
      });
    });

    test("should round completion rate correctly", () => {
      taskManager.addTask("Task 1");
      taskManager.addTask("Task 2");
      const task3 = taskManager.addTask("Task 3");

      taskManager.markTaskAsDone(task3.id);

      const summary = taskManager.getTaskSummary();

      expect(summary.completionRate).toBe(33); // 1/3 = 33.33, rounded to 33
    });
  });

  describe("displayTasks method", () => {
    test("should return message for empty task list", () => {
      const display = taskManager.displayTasks();

      expect(display).toBe("No tasks available.");
    });

    test("should format tasks correctly", () => {
      const task1 = taskManager.addTask("Pending task");
      const task2 = taskManager.addTask("Completed task");

      taskManager.markTaskAsDone(task2.id);

      const display = taskManager.displayTasks();

      expect(display).toBe("1. ○ Pending task\n2. ✓ Completed task");
    });
  });

  describe("Integration tests", () => {
    test("should handle complete task lifecycle", () => {
      // Add task
      const task = taskManager.addTask("Lifecycle task");
      expect(task.done).toBe(false);
      expect(taskManager.getTaskCount()).toBe(1);

      // Mark as done
      taskManager.markTaskAsDone(task.id);
      expect(task.done).toBe(true);
      expect(taskManager.getCompletedTasks()).toHaveLength(1);
      expect(taskManager.getPendingTasks()).toHaveLength(0);

      // Undo mark done
      taskManager.undoMarkDone(task.id);
      expect(task.done).toBe(false);
      expect(taskManager.getCompletedTasks()).toHaveLength(0);
      expect(taskManager.getPendingTasks()).toHaveLength(1);

      // Delete task
      taskManager.deleteTask(task.id);
      expect(taskManager.getTaskCount()).toBe(0);
      expect(taskManager.findTaskById(task.id)).toBe(null);
    });

    test("should maintain statistics accuracy through operations", () => {
      // Add multiple tasks
      const task1 = taskManager.addTask("Task 1");
      const task2 = taskManager.addTask("Task 2");
      const task3 = taskManager.addTask("Task 3");

      let summary = taskManager.getTaskSummary();
      expect(summary).toEqual({
        total: 3,
        completed: 0,
        pending: 3,
        completionRate: 0,
      });

      // Complete some tasks
      taskManager.markTaskAsDone(task1.id);
      taskManager.markTaskAsDone(task2.id);

      summary = taskManager.getTaskSummary();
      expect(summary).toEqual({
        total: 3,
        completed: 2,
        pending: 1,
        completionRate: 67,
      });

      // Delete a completed task
      taskManager.deleteTask(task1.id);

      summary = taskManager.getTaskSummary();
      expect(summary).toEqual({
        total: 2,
        completed: 1,
        pending: 1,
        completionRate: 50,
      });

      // Undo completion
      taskManager.undoMarkDone(task2.id);

      summary = taskManager.getTaskSummary();
      expect(summary).toEqual({
        total: 2,
        completed: 0,
        pending: 2,
        completionRate: 0,
      });
    });
  });
});
