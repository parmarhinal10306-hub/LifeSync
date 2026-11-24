document.addEventListener("DOMContentLoaded", function () {
    const taskForm = document.getElementById("taskForm");
    const taskModalElement = document.getElementById("taskModal");
    const taskModal = bootstrap.Modal.getOrCreateInstance(taskModalElement);
    const taskTitle = document.getElementById("taskTitle");
    const taskDescription = document.getElementById("taskDescription");
    const taskDueDate = document.getElementById("taskDueDate");
    const taskPriority = document.getElementById("taskPriority");
    const taskId = document.getElementById("taskId");
    const modalTitle = document.getElementById("taskModalTitle");
    const saveButton = document.getElementById("saveTaskButton");

    document.querySelector('[data-bs-target="#taskModal"]').addEventListener("click", openNewTaskModal);
    taskForm.addEventListener("submit", saveTask);
    taskModalElement.addEventListener("hidden.bs.modal", openNewTaskModal);

    renderTasks();

    function openNewTaskModal() {
        taskForm.reset();
        taskId.value = "";
        taskPriority.value = "Medium";
        taskDueDate.value = window.LifeSync.getTodayString();
        modalTitle.textContent = "Add task";
        saveButton.textContent = "Save task";
    }

    function saveTask(event) {
        event.preventDefault();

        if (!taskForm.reportValidity()) {
            return;
        }

        const tasks = window.LifeSync.getTasks();
        const editingId = taskId.value;

        if (editingId) {
            const taskIndex = tasks.findIndex(function (task) {
                return task.id === editingId;
            });

            if (taskIndex !== -1) {
                tasks[taskIndex].title = taskTitle.value.trim();
                tasks[taskIndex].description = taskDescription.value.trim();
                tasks[taskIndex].dueDate = taskDueDate.value;
                tasks[taskIndex].priority = taskPriority.value;
            }
        } else {
            tasks.push({
                id: "task-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
                title: taskTitle.value.trim(),
                description: taskDescription.value.trim(),
                dueDate: taskDueDate.value,
                priority: taskPriority.value,
                completed: false,
                createdAt: new Date().toISOString()
            });
        }

        window.LifeSync.saveTasks(tasks);
        taskModal.hide();
        renderTasks();
    }

    function renderTasks() {
        const tasks = window.LifeSync.getTasks();
        const pendingTasks = tasks.filter(function (task) { return !task.completed; });
        const completedTasks = tasks.filter(function (task) { return task.completed; });

        document.getElementById("pendingCount").textContent = pendingTasks.length;
        document.getElementById("completedCount").textContent = completedTasks.length;
        document.getElementById("pendingTasks").innerHTML =
            pendingTasks.length ? pendingTasks.map(taskCard).join("") :
            '<p class="empty-state">No pending tasks.</p>';
        document.getElementById("completedTasks").innerHTML =
            completedTasks.length ? completedTasks.map(taskCard).join("") :
            '<p class="empty-state">No completed tasks.</p>';

        addTaskCardListeners();
    }

    function taskCard(task) {
        const description = task.description ?
            '<p class="task-description">' + escapeHtml(task.description) + '</p>' : "";

        return '<article class="task-card' + (task.completed ? " is-completed" : "") + '">' +
            '<div class="task-card-top">' +
                '<label class="task-check">' +
                    '<input type="checkbox" data-action="toggle" data-id="' + escapeHtml(task.id) + '"' +
                    (task.completed ? " checked" : "") + '>' +
                    '<span class="task-check-box" aria-hidden="true"></span>' +
                    '<span class="visually-hidden">Mark ' + escapeHtml(task.title) + ' as completed</span>' +
                '</label>' +
                '<span class="priority-badge priority-' + escapeHtml(task.priority.toLowerCase()) + '">' +
                    escapeHtml(task.priority) +
                '</span>' +
            '</div>' +
            '<h3>' + escapeHtml(task.title) + '</h3>' +
            description +
            '<p class="task-due-date">Due ' + window.LifeSync.formatDate(task.dueDate) + '</p>' +
            '<div class="task-actions">' +
                '<button type="button" class="task-action-btn" data-action="edit" data-id="' + escapeHtml(task.id) + '">Edit</button>' +
                '<button type="button" class="task-action-btn delete" data-action="delete" data-id="' + escapeHtml(task.id) + '">Delete</button>' +
            '</div>' +
        '</article>';
    }

    function addTaskCardListeners() {
        document.querySelectorAll("[data-action]").forEach(function (button) {
            if (button.type === "checkbox") {
                button.addEventListener("change", handleTaskAction);
            } else {
                button.addEventListener("click", handleTaskAction);
            }
        });
    }

    function handleTaskAction(event) {
        const control = event.currentTarget;
        const action = control.dataset.action;
        const id = control.dataset.id;
        let tasks = window.LifeSync.getTasks();
        const taskIndex = tasks.findIndex(function (task) { return task.id === id; });
        if (taskIndex === -1) return;

        if (action === "toggle") {
            tasks[taskIndex].completed = control.checked;
            window.LifeSync.saveTasks(tasks);
            renderTasks();
        } else if (action === "delete") {
            if (window.confirm("Delete this task?")) {
                tasks.splice(taskIndex, 1);
                window.LifeSync.saveTasks(tasks);
                renderTasks();
            }
        } else if (action === "edit") {
            const task = tasks[taskIndex];
            taskId.value = task.id;
            taskTitle.value = task.title;
            taskDescription.value = task.description || "";
            taskDueDate.value = task.dueDate;
            taskPriority.value = task.priority || "Medium";
            modalTitle.textContent = "Edit task";
            saveButton.textContent = "Update task";
            taskModal.show();
        }
    }
});

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = value == null ? "" : value;
    return element.innerHTML;
}
