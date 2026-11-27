// Shared JavaScript for the LifeSync website.
// Feature-specific code should be placed in the matching JS file.

var AUTH_SESSION_KEY = "lifesyncDemoSession";
var authPage = window.location.pathname.toLowerCase().split("/").pop() || "index.html";
var isPublicAuthPage = authPage === "login.html" || authPage === "signup.html";

function getAuthSession() {
    try {
        return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || "null");
    } catch (error) {
        console.error("Could not read the LifeSync demo session:", error);
        return null;
    }
}

function guardProtectedPage() {
    if (isPublicAuthPage || getAuthSession()) return;

    var isFeaturePage = window.location.pathname.toLowerCase().indexOf("/pages/") !== -1;
    window.location.replace(isFeaturePage ? "login.html" : "pages/login.html");
}

guardProtectedPage();

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
    guardProtectedPage();

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

    const session = getAuthSession();
    const navigation = document.querySelector(".navbar-nav");

    if (!isPublicAuthPage && session && navigation &&
            !navigation.querySelector("[data-auth-logout]")) {
        const logoutItem = document.createElement("li");
        logoutItem.className = "nav-item";
        const logoutButton = document.createElement("button");
        logoutButton.className = "nav-link auth-logout-link";
        logoutButton.type = "button";
        logoutButton.dataset.authLogout = "";
        logoutButton.textContent = "Log out";
        logoutItem.appendChild(logoutButton);
        navigation.appendChild(logoutItem);
    }

    document.querySelectorAll("[data-auth-logout]").forEach(function (button) {
        button.addEventListener("click", function () {
            try {
                localStorage.removeItem(AUTH_SESSION_KEY);
                var isFeaturePage = window.location.pathname.toLowerCase().indexOf("/pages/") !== -1;
                window.location.replace(isFeaturePage ? "login.html" : "pages/login.html");
            } catch (error) {
                console.error("Could not clear the LifeSync demo session:", error);
                window.alert("LifeSync could not log you out because browser storage is unavailable.");
            }
        });
    });
});

window.addEventListener("pageshow", guardProtectedPage);
