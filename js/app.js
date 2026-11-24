// Shared JavaScript for the LifeSync website.
// Feature-specific code should be placed in the matching JS file.

window.LifeSync = {
    taskKey: "lifesyncTasks",

    getTasks: function () {
        const savedTasks = localStorage.getItem(this.taskKey);

        if (savedTasks) {
            try {
                const tasks = JSON.parse(savedTasks);
                return Array.isArray(tasks) ? tasks : [];
            } catch (error) {
                return [];
            }
        }

        // Allow tasks saved by an earlier simple implementation to remain usable.
        try {
            const oldTasks = JSON.parse(localStorage.getItem("tasks") || "[]");
            return Array.isArray(oldTasks) ? oldTasks : [];
        } catch (error) {
            return [];
        }
    },

    saveTasks: function (tasks) {
        localStorage.setItem(this.taskKey, JSON.stringify(tasks));
    },

    formatDate: function (dateString) {
        const date = new Date(dateString + "T00:00:00");
        if (Number.isNaN(date.getTime())) {
            return dateString;
        }

        return date.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    },

    getTodayString: function () {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        return year + "-" + month + "-" + day;
    }
};

document.addEventListener("DOMContentLoaded", function () {
    const yearElement = document.getElementById("currentYear");

    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }

    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    const navigationLinks = document.querySelectorAll(".navbar-nav .nav-link");

    navigationLinks.forEach(function (link) {
        const linkPage = link.getAttribute("href").split("/").pop();

        if (linkPage === currentPage) {
            link.classList.add("active");
            link.setAttribute("aria-current", "page");
        }
    });
});
