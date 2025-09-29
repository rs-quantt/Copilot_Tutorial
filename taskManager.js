/**
 * Task class representing a single task with description and completion status
 */
class Task {
  /**
   * Creates a new Task instance
   * @param {string} description - The task description
   * @param {boolean} [done=false] - Whether the task is completed
   */
  constructor(description, done = false) {
    this.description = description;
    this.done = done;
    this.id = Task.generateId();
  }

  /**
   * Generates a unique ID for the task
   * @returns {string} Unique identifier
   * @static
   */
  static generateId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gets a string representation of the task
   * @returns {string} String representation of the task
   */
  toString() {
    const status = this.done ? "✓" : "○";
    return `${status} ${this.description}`;
  }
}

/**
 * TaskManager class for managing a collection of tasks
 */
class TaskManager {
  /**
   * Creates a new TaskManager instance
   */
  constructor() {
    this.tasks = [];
  }

  /**
   * Adds a new task to the task list
   * @param {string} description - The task description
   * @returns {Task} The newly created task
   */
  addTask(description) {
    if (
      !description ||
      typeof description !== "string" ||
      description.trim().length === 0
    ) {
      throw new Error("Task description must be a non-empty string");
    }

    const task = new Task(description.trim());
    this.tasks.push(task);
    return task;
  }

  /**
   * Returns the list of all tasks
   * @returns {Task[]} Array of all tasks
   */
  listTasks() {
    return [...this.tasks]; // Return a copy to prevent external modification
  }

  /**
   * Marks a task as done by task ID
   * @param {string} taskId - The ID of the task to mark as done
   * @returns {boolean} True if task was found and marked as done, false otherwise
   */
  markTaskAsDone(taskId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.done = true;
      return true;
    }
    return false;
  }

  /**
   * Marks a task as undone (undo mark done) by task ID
   * @param {string} taskId - The ID of the task to mark as undone
   * @returns {boolean} True if task was found and marked as undone, false otherwise
   */
  undoMarkDone(taskId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.done = false;
      return true;
    }
    return false;
  }

  /**
   * Deletes a task by task ID
   * @param {string} taskId - The ID of the task to delete
   * @returns {boolean} True if task was found and deleted, false otherwise
   */
  deleteTask(taskId) {
    const taskIndex = this.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex !== -1) {
      this.tasks.splice(taskIndex, 1);
      return true;
    }
    return false;
  }

  /**
   * Finds a task by its ID
   * @param {string} taskId - The ID of the task to find
   * @returns {Task|null} The task if found, null otherwise
   */
  findTaskById(taskId) {
    return this.tasks.find((t) => t.id === taskId) || null;
  }

  /**
   * Gets all completed tasks
   * @returns {Task[]} Array of completed tasks
   */
  getCompletedTasks() {
    return this.tasks.filter((task) => task.done);
  }

  /**
   * Gets all pending (incomplete) tasks
   * @returns {Task[]} Array of pending tasks
   */
  getPendingTasks() {
    return this.tasks.filter((task) => !task.done);
  }

  /**
   * Gets the total number of tasks
   * @returns {number} Total number of tasks
   */
  getTaskCount() {
    return this.tasks.length;
  }

  /**
   * Gets a summary of task statistics
   * @returns {Object} Object containing task statistics
   */
  getTaskSummary() {
    const total = this.tasks.length;
    const completed = this.getCompletedTasks().length;
    const pending = this.getPendingTasks().length;

    return {
      total,
      completed,
      pending,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  /**
   * Displays all tasks in a formatted way
   * @returns {string} Formatted string of all tasks
   */
  displayTasks() {
    if (this.tasks.length === 0) {
      return "No tasks available.";
    }

    return this.tasks
      .map((task, index) => `${index + 1}. ${task.toString()}`)
      .join("\n");
  }
}

// Export classes (for Node.js environments)
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Task, TaskManager };
}

// Make classes available globally (for browser environments)
if (typeof window !== "undefined") {
  window.Task = Task;
  window.TaskManager = TaskManager;
}
