// Habit Tracker feature for LifeSync (Person 2).
// Stores habits and daily completion status in LocalStorage.

document.addEventListener("DOMContentLoaded", function () {
    var HABIT_KEY = "lifesyncHabits";
    var COMPLETION_KEY = "lifesyncHabitCompletions";

    var habitForm = document.getElementById("habitForm");
    var habitModalElement = document.getElementById("habitModal");
    var habitModal = bootstrap.Modal.getOrCreateInstance(habitModalElement);
    var habitNameInput = document.getElementById("habitName");

    // Show today's date at the top
    var todayString = getTodayString();
    var dateDisplay = document.getElementById("habitDate");
    if (dateDisplay) {
        dateDisplay.textContent = "Showing habits for " + formatDateNice(todayString);
    }

    // Event listeners
    habitForm.addEventListener("submit", function (event) {
        event.preventDefault();
        addHabit();
    });

    habitModalElement.addEventListener("hidden.bs.modal", function () {
        habitForm.reset();
    });

    // Initial render
    renderHabits();

    // ---- Core functions ----

    function getHabits() {
        try {
            var data = JSON.parse(localStorage.getItem(HABIT_KEY) || "[]");
            return Array.isArray(data) ? data : [];
        } catch (e) {
            return [];
        }
    }

    function saveHabits(habits) {
        localStorage.setItem(HABIT_KEY, JSON.stringify(habits));
    }

    function getCompletions() {
        try {
            var data = JSON.parse(localStorage.getItem(COMPLETION_KEY) || "{}");
            return (data && typeof data === "object" && !Array.isArray(data)) ? data : {};
        } catch (e) {
            return {};
        }
    }

    function saveCompletions(completions) {
        localStorage.setItem(COMPLETION_KEY, JSON.stringify(completions));
    }

    function isCompletedToday(habitId) {
        var completions = getCompletions();
        var todayList = completions[todayString];
        if (!Array.isArray(todayList)) return false;
        return todayList.indexOf(habitId) !== -1;
    }

    function toggleCompletion(habitId) {
        var completions = getCompletions();
        if (!Array.isArray(completions[todayString])) {
            completions[todayString] = [];
        }
        var index = completions[todayString].indexOf(habitId);
        if (index === -1) {
            completions[todayString].push(habitId);
        } else {
            completions[todayString].splice(index, 1);
        }
        saveCompletions(completions);
    }

    function addHabit() {
        var name = habitNameInput.value.trim();
        if (!name) return;

        var habits = getHabits();
        habits.push({
            id: "habit-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
            name: name,
            createdAt: new Date().toISOString()
        });
        saveHabits(habits);
        habitModal.hide();
        renderHabits();
    }

    function deleteHabit(habitId) {
        if (!window.confirm("Delete this habit?")) return;

        var habits = getHabits();
        habits = habits.filter(function (h) { return h.id !== habitId; });
        saveHabits(habits);

        // Also clean up completions for this habit
        var completions = getCompletions();
        Object.keys(completions).forEach(function (date) {
            var idx = completions[date].indexOf(habitId);
            if (idx !== -1) {
                completions[date].splice(idx, 1);
            }
        });
        saveCompletions(completions);

        renderHabits();
    }

    // ---- Rendering ----

    function renderHabits() {
        var habits = getHabits();
        var completed = [];
        var pending = [];

        habits.forEach(function (habit) {
            if (isCompletedToday(habit.id)) {
                completed.push(habit);
            } else {
                pending.push(habit);
            }
        });

        // Update stat cards
        setTextById("totalHabitCount", habits.length);
        setTextById("completedHabitCount", completed.length);
        setTextById("pendingHabitCount", pending.length);

        // Update progress bar
        var percent = habits.length > 0 ? Math.round((completed.length / habits.length) * 100) : 0;
        setTextById("habitProgressPercent", percent + "%");

        var bar = document.getElementById("habitCompletionBar");
        if (bar) {
            bar.style.width = percent + "%";
            bar.parentElement.setAttribute("aria-valuenow", percent);
        }

        var message = document.getElementById("habitProgressMessage");
        if (message) {
            if (habits.length === 0) {
                message.textContent = "No habits yet. Add one to get started!";
            } else if (percent === 100) {
                message.textContent = "All habits completed for today! Great job!";
            } else {
                message.textContent = completed.length + " of " + habits.length + " habits completed today.";
            }
        }

        // Update column badges
        setTextById("pendingHabitBadge", pending.length);
        setTextById("completedHabitBadge", completed.length);

        // Render pending list
        var pendingContainer = document.getElementById("pendingHabitsList");
        if (pendingContainer) {
            pendingContainer.innerHTML = pending.length > 0
                ? pending.map(function (h) { return habitCard(h, false); }).join("")
                : '<p class="empty-state">All done for today!</p>';
        }

        // Render completed list
        var completedContainer = document.getElementById("completedHabitsList");
        if (completedContainer) {
            completedContainer.innerHTML = completed.length > 0
                ? completed.map(function (h) { return habitCard(h, true); }).join("")
                : '<p class="empty-state">No habits completed yet today.</p>';
        }

        // Attach event listeners
        attachHabitListeners();
    }

    function habitCard(habit, isCompleted) {
        var completedClass = isCompleted ? " is-completed" : "";
        return '<article class="task-card' + completedClass + '">' +
            '<div class="task-card-top">' +
                '<label class="task-check">' +
                    '<input type="checkbox" data-habit-action="toggle" data-habit-id="' + escapeHtml(habit.id) + '"' +
                    (isCompleted ? " checked" : "") + '>' +
                    '<span class="task-check-box" aria-hidden="true"></span>' +
                    '<span class="visually-hidden">Mark ' + escapeHtml(habit.name) + ' as ' + (isCompleted ? "incomplete" : "complete") + '</span>' +
                '</label>' +
                '<span class="habit-streak-badge">' +
                    getStreakText(habit.id) +
                '</span>' +
            '</div>' +
            '<h3>' + escapeHtml(habit.name) + '</h3>' +
            '<p class="task-due-date">Added ' + formatDateNice(habit.createdAt.split("T")[0]) + '</p>' +
            '<div class="task-actions">' +
                '<button type="button" class="task-action-btn delete" data-habit-action="delete" data-habit-id="' + escapeHtml(habit.id) + '">Delete</button>' +
            '</div>' +
        '</article>';
    }

    function attachHabitListeners() {
        document.querySelectorAll("[data-habit-action]").forEach(function (el) {
            var action = el.getAttribute("data-habit-action");
            if (action === "toggle") {
                el.addEventListener("change", function () {
                    toggleCompletion(el.getAttribute("data-habit-id"));
                    renderHabits();
                });
            } else if (action === "delete") {
                el.addEventListener("click", function () {
                    deleteHabit(el.getAttribute("data-habit-id"));
                });
            }
        });
    }

    // ---- Streak helper ----

    function getStreakText(habitId) {
        var completions = getCompletions();
        var streak = 0;
        var date = new Date();

        // If not completed today, start checking from yesterday
        if (!isCompletedToday(habitId)) {
            date.setDate(date.getDate() - 1);
        }

        for (var i = 0; i < 365; i++) {
            var dateStr = dateToString(date);
            var dayList = completions[dateStr];
            if (Array.isArray(dayList) && dayList.indexOf(habitId) !== -1) {
                streak++;
                date.setDate(date.getDate() - 1);
            } else {
                break;
            }
        }

        if (streak === 0) return "";
        return streak + " day" + (streak === 1 ? "" : "s") + " streak";
    }

    // ---- Utility helpers ----

    function getTodayString() {
        return dateToString(new Date());
    }

    function dateToString(d) {
        var year = d.getFullYear();
        var month = String(d.getMonth() + 1).padStart(2, "0");
        var day = String(d.getDate()).padStart(2, "0");
        return year + "-" + month + "-" + day;
    }

    function formatDateNice(dateString) {
        var date = new Date(dateString + "T00:00:00");
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    }

    function setTextById(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function escapeHtml(value) {
        var el = document.createElement("div");
        el.textContent = value == null ? "" : value;
        return el.innerHTML;
    }
});
