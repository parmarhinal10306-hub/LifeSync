// Expense Manager feature for LifeSync (Person 2).
// Stores expense records in LocalStorage.

document.addEventListener("DOMContentLoaded", function () {
    var EXPENSE_KEY = "lifesyncExpenses";

    var expenseForm = document.getElementById("expenseForm");
    var expenseModalElement = document.getElementById("expenseModal");
    var expenseModal = bootstrap.Modal.getOrCreateInstance(expenseModalElement);
    var expenseTitle = document.getElementById("expenseTitle");
    var expenseAmount = document.getElementById("expenseAmount");
    var expenseCategory = document.getElementById("expenseCategory");
    var expenseDate = document.getElementById("expenseDate");

    // Set default date to today
    expenseDate.value = getTodayString();

    // Event listeners
    expenseForm.addEventListener("submit", function (event) {
        event.preventDefault();
        addExpense();
    });

    expenseModalElement.addEventListener("hidden.bs.modal", function () {
        expenseForm.reset();
        expenseDate.value = getTodayString();
    });

    // Initial render
    renderExpenses();

    // ---- Core functions ----

    function getExpenses() {
        try {
            var data = JSON.parse(localStorage.getItem(EXPENSE_KEY) || "[]");
            return Array.isArray(data) ? data : [];
        } catch (e) {
            return [];
        }
    }

    function saveExpenses(expenses) {
        localStorage.setItem(EXPENSE_KEY, JSON.stringify(expenses));
    }

    function addExpense() {
        var title = expenseTitle.value.trim();
        var amount = parseFloat(expenseAmount.value);
        var category = expenseCategory.value;
        var date = expenseDate.value;

        if (!title || isNaN(amount) || amount <= 0 || !category || !date) return;

        var expenses = getExpenses();
        expenses.push({
            id: "exp-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
            title: title,
            amount: amount,
            category: category,
            date: date,
            createdAt: new Date().toISOString()
        });
        saveExpenses(expenses);
        expenseModal.hide();
        renderExpenses();
    }

    function deleteExpense(expenseId) {
        if (!window.confirm("Delete this expense?")) return;

        var expenses = getExpenses();
        expenses = expenses.filter(function (e) { return e.id !== expenseId; });
        saveExpenses(expenses);
        renderExpenses();
    }

    // ---- Rendering ----

    function renderExpenses() {
        var expenses = getExpenses();

        // Sort by date descending (newest first)
        expenses.sort(function (a, b) {
            return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
        });

        // Calculate totals
        var totalAmount = 0;
        var categoryTotals = {};

        expenses.forEach(function (exp) {
            totalAmount += exp.amount;
            if (!categoryTotals[exp.category]) {
                categoryTotals[exp.category] = 0;
            }
            categoryTotals[exp.category] += exp.amount;
        });

        var categoryKeys = Object.keys(categoryTotals);

        // Update summary cards
        setTextById("totalExpenseAmount", "\u20B9" + totalAmount.toFixed(2));
        setTextById("totalExpenseCount", expenses.length);
        setTextById("categoriesUsedCount", categoryKeys.length);
        setTextById("expenseCountBadge", expenses.length);

        // Render category breakdown
        var categoryContainer = document.getElementById("categoryBreakdown");
        if (categoryContainer) {
            if (categoryKeys.length === 0) {
                categoryContainer.innerHTML = '<p class="empty-state">No expenses recorded yet.</p>';
            } else {
                // Sort categories by amount descending
                categoryKeys.sort(function (a, b) {
                    return categoryTotals[b] - categoryTotals[a];
                });

                var categoryHtml = "";
                categoryKeys.forEach(function (cat) {
                    var catAmount = categoryTotals[cat];
                    var percent = totalAmount > 0 ? Math.round((catAmount / totalAmount) * 100) : 0;
                    categoryHtml += '<div class="category-row">' +
                        '<div class="category-row-top">' +
                            '<span class="category-label">' +
                                '<span class="category-icon">' + getCategoryIcon(cat) + '</span>' +
                                escapeHtml(cat) +
                            '</span>' +
                            '<span class="category-amount">\u20B9' + catAmount.toFixed(2) + '</span>' +
                        '</div>' +
                        '<div class="progress lifesync-progress category-progress">' +
                            '<div class="progress-bar" style="width: ' + percent + '%"></div>' +
                        '</div>' +
                        '<small class="small-muted">' + percent + '% of total</small>' +
                    '</div>';
                });
                categoryContainer.innerHTML = categoryHtml;
            }
        }

        // Render expense list
        var listContainer = document.getElementById("expenseList");
        if (listContainer) {
            if (expenses.length === 0) {
                listContainer.innerHTML = '<p class="empty-state">No expenses recorded yet. Add one to get started!</p>';
            } else {
                listContainer.innerHTML = expenses.map(expenseCard).join("");
            }
        }

        // Attach event listeners
        attachExpenseListeners();
    }

    function expenseCard(expense) {
        return '<article class="task-card expense-card">' +
            '<div class="task-card-top">' +
                '<span class="category-badge">' +
                    '<span class="category-icon">' + getCategoryIcon(expense.category) + '</span>' +
                    escapeHtml(expense.category) +
                '</span>' +
                '<strong class="expense-amount">\u20B9' + expense.amount.toFixed(2) + '</strong>' +
            '</div>' +
            '<h3>' + escapeHtml(expense.title) + '</h3>' +
            '<p class="task-due-date">' + formatDateNice(expense.date) + '</p>' +
            '<div class="task-actions">' +
                '<button type="button" class="task-action-btn delete" data-expense-action="delete" data-expense-id="' + escapeHtml(expense.id) + '">Delete</button>' +
            '</div>' +
        '</article>';
    }

    function attachExpenseListeners() {
        document.querySelectorAll("[data-expense-action]").forEach(function (el) {
            if (el.getAttribute("data-expense-action") === "delete") {
                el.addEventListener("click", function () {
                    deleteExpense(el.getAttribute("data-expense-id"));
                });
            }
        });
    }

    // ---- Category icons (first letter) ----

    function getCategoryIcon(category) {
        var icons = {
            "Food": "F",
            "Transport": "T",
            "Shopping": "S",
            "Bills": "B",
            "Entertainment": "E",
            "Health": "H",
            "Education": "Ed",
            "Other": "O"
        };
        return icons[category] || category.charAt(0).toUpperCase();
    }

    // ---- Utility helpers ----

    function getTodayString() {
        var today = new Date();
        var year = today.getFullYear();
        var month = String(today.getMonth() + 1).padStart(2, "0");
        var day = String(today.getDate()).padStart(2, "0");
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
