document.addEventListener("DOMContentLoaded", function () {
    const grid = document.getElementById("calendarGrid");
    const monthTitle = document.getElementById("calendarMonth");
    const selectedDateTitle = document.getElementById("selectedDateTitle");
    const selectedDateTasks = document.getElementById("selectedDateTasks");
    const today = new Date();
    let displayDate = new Date(today.getFullYear(), today.getMonth(), 1);
    let selectedDate = toDateString(today);

    document.getElementById("previousMonth").addEventListener("click", function () {
        displayDate = new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1);
        renderCalendar();
    });

    document.getElementById("nextMonth").addEventListener("click", function () {
        displayDate = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1);
        renderCalendar();
    });

    renderCalendar();
    renderSelectedDate();

    function renderCalendar() {
        const year = displayDate.getFullYear();
        const month = displayDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const previousTotal = new Date(year, month, 0).getDate();
        const tasks = window.LifeSync.getTasks();

        monthTitle.textContent = displayDate.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric"
        });

        const cells = [];
        for (let index = 0; index < 42; index++) {
            let dayNumber;
            let cellDate;
            let outside = false;

            if (index < firstDay) {
                dayNumber = previousTotal - firstDay + index + 1;
                cellDate = new Date(year, month - 1, dayNumber);
                outside = true;
            } else if (index >= firstDay + totalDays) {
                dayNumber = index - firstDay - totalDays + 1;
                cellDate = new Date(year, month + 1, dayNumber);
                outside = true;
            } else {
                dayNumber = index - firstDay + 1;
                cellDate = new Date(year, month, dayNumber);
            }

            const dateString = toDateString(cellDate);
            const dayTasks = tasks.filter(function (task) {
                return task.dueDate === dateString;
            });
            const isToday = dateString === toDateString(today);
            const isSelected = dateString === selectedDate;
            let classes = "calendar-day";

            if (outside) classes += " outside";
            if (isToday) classes += " today";
            if (isSelected) classes += " selected";

            let dots = "";
            if (dayTasks.length) {
                const taskDots = dayTasks.slice(0, 3).map(function (task) {
                    return '<span class="task-dot' + (task.completed ? " completed" : "") +
                        '" title="' + escapeHtml(task.title) + '"></span>';
                }).join("");
                dots = '<div class="calendar-task-dots">' + taskDots +
                    (dayTasks.length > 3 ? '<span class="task-more">+' + (dayTasks.length - 3) + '</span>' : "") +
                    '</div>';
            }

            cells.push(
                '<button type="button" class="' + classes + '" data-date="' + dateString + '" aria-label="' +
                window.LifeSync.formatDate(dateString) + ', ' + dayTasks.length + ' tasks">' +
                    '<span class="calendar-day-number">' + dayNumber + '</span>' + dots +
                '</button>'
            );
        }

        grid.innerHTML = cells.join("");

        grid.querySelectorAll(".calendar-day").forEach(function (day) {
            day.addEventListener("click", function () {
                selectedDate = day.dataset.date;
                renderCalendar();
                renderSelectedDate();
            });
        });
    }

    function renderSelectedDate() {
        const tasks = window.LifeSync.getTasks().filter(function (task) {
            return task.dueDate === selectedDate;
        });

        selectedDateTitle.textContent = window.LifeSync.formatDate(selectedDate);

        if (!tasks.length) {
            selectedDateTasks.innerHTML =
                '<p class="empty-state">No tasks for this date.</p>';
            return;
        }

        selectedDateTasks.innerHTML = tasks.map(function (task) {
            return '<article class="selected-task' + (task.completed ? " is-completed" : "") + '">' +
                '<span class="selected-task-status"></span>' +
                '<div>' +
                    '<h3>' + escapeHtml(task.title) + '</h3>' +
                    (task.description ? '<p>' + escapeHtml(task.description) + '</p>' : "") +
                    '<small>' + escapeHtml(task.priority) + ' priority · ' +
                    (task.completed ? "Completed" : "Pending") + '</small>' +
                '</div>' +
            '</article>';
        }).join("");
    }

    function toDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return year + "-" + month + "-" + day;
    }
});

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = value == null ? "" : value;
    return element.innerHTML;
}
