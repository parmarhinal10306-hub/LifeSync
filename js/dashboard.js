document.addEventListener("DOMContentLoaded", function () {
    const tasks = window.LifeSync.getTasks();
    const total = tasks.length;
    const completed = tasks.filter(function (task) {
        return task.completed;
    }).length;
    const pending = total - completed;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
    const today = window.LifeSync.getTodayString();

    document.getElementById("totalTaskCount").textContent = total;
    document.getElementById("completedTaskCount").textContent = completed;
    document.getElementById("pendingTaskCount").textContent = pending;
    document.getElementById("todayDate").textContent = window.LifeSync.formatDate(today);

    const progressPercent = document.getElementById("progressPercent");
    const completionBar = document.getElementById("completionBar");
    progressPercent.textContent = percent + "%";
    completionBar.style.width = percent + "%";
    completionBar.parentElement.setAttribute("aria-valuenow", percent);
    document.getElementById("progressMessage").textContent =
        total === 0 ? "No tasks yet." : completed + " of " + total + " tasks completed.";

    const todayTasks = tasks.filter(function (task) {
        return task.dueDate === today;
    });
    const todayTasksContainer = document.getElementById("todayTasks");

    if (todayTasks.length === 0) {
        todayTasksContainer.innerHTML =
            '<p class="empty-state">No tasks are due today.</p>';
        return;
    }

    todayTasksContainer.innerHTML = todayTasks.map(function (task) {
        const taskStatus = task.completed ? "Completed" : "Pending";
        const completedClass = task.completed ? " is-completed" : "";

        return '<div class="today-task' + completedClass + '">' +
            '<span class="today-task-status"></span>' +
            '<div><strong>' + escapeHtml(task.title) + '</strong>' +
            '<small>' + taskStatus + ' · ' + escapeHtml(task.priority) + ' priority</small></div>' +
            '</div>';
    }).join("");
});

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = value == null ? "" : value;
    return element.innerHTML;
}
