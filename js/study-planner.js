document.addEventListener("DOMContentLoaded", function () {
    var STORAGE_KEY = "lifesyncStudyPlanner";
    var priorities = ["High", "Medium", "Low"];
    var data;
    var message = document.getElementById("studyPlannerMessage");
    var subjectForm = document.getElementById("subjectForm");
    var topicForm = document.getElementById("topicForm");
    var subjectModalElement = document.getElementById("subjectModal");
    var topicModalElement = document.getElementById("topicModal");
    var subjectModal = bootstrap.Modal.getOrCreateInstance(subjectModalElement);
    var topicModal = bootstrap.Modal.getOrCreateInstance(topicModalElement);
    var subjectName = document.getElementById("subjectName");
    var subjectId = document.getElementById("subjectId");
    var topicSubject = document.getElementById("topicSubject");
    var topicName = document.getElementById("topicName");
    var topicDate = document.getElementById("topicDate");
    var topicTime = document.getElementById("topicTime");
    var topicDuration = document.getElementById("topicDuration");
    var topicPriority = document.getElementById("topicPriority");
    var topicId = document.getElementById("topicId");
    var today = window.LifeSync.getTodayString();

    data = loadData();
    document.getElementById("studyTodayDate").textContent = window.LifeSync.formatDate(today);
    document.getElementById("addTopicButton").addEventListener("click", openNewTopic);
    document.getElementById("topicForm").addEventListener("submit", saveTopic);
    document.getElementById("subjectForm").addEventListener("submit", saveSubject);
    subjectModalElement.addEventListener("hidden.bs.modal", resetSubjectForm);
    topicModalElement.addEventListener("hidden.bs.modal", resetTopicForm);
    document.getElementById("studySubjects").addEventListener("click", handleSubjectAction);
    document.getElementById("studySubjects").addEventListener("change", handleTopicToggle);
    document.getElementById("studySubjects").addEventListener("click", handleTopicAction);
    render();

    function loadData() {
        var stored;
        try {
            stored = localStorage.getItem(STORAGE_KEY);
        } catch (error) {
            showMessage("Study Planner cannot access LocalStorage in this browser.");
            return { subjects: [], topics: [] };
        }

        if (!stored) return { subjects: [], topics: [] };

        try {
            var parsed = JSON.parse(stored);
            if (!parsed || !Array.isArray(parsed.subjects) || !Array.isArray(parsed.topics)) {
                throw new Error("Stored study planner data has an unexpected format.");
            }
            return parsed;
        } catch (error) {
            console.error("Could not read Study Planner data:", error);
            showMessage("Saved Study Planner data could not be read. Your existing saved data has not been changed.");
            return { subjects: [], topics: [] };
        }
    }

    function saveData(nextData) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
            data = nextData;
            message.hidden = true;
            message.textContent = "";
            render();
            return true;
        } catch (error) {
            console.error("Could not save Study Planner data:", error);
            showMessage("Study Planner could not save your changes. Check that browser storage is available and try again.");
            return false;
        }
    }

    function showMessage(text) {
        message.textContent = text;
        message.hidden = false;
    }

    function saveSubject(event) {
        event.preventDefault();
        if (!subjectForm.reportValidity()) return;

        var name = subjectName.value.trim();
        if (!name) {
            subjectName.setCustomValidity("Enter a subject name.");
            subjectName.reportValidity();
            subjectName.setCustomValidity("");
            return;
        }

        var editingId = subjectId.value;
        var duplicate = data.subjects.some(function (subject) {
            return subject.id !== editingId && subject.name.trim().toLowerCase() === name.toLowerCase();
        });
        if (duplicate) {
            subjectName.setCustomValidity("A subject with this name already exists.");
            subjectName.reportValidity();
            subjectName.setCustomValidity("");
            return;
        }

        var nextData = {
            subjects: data.subjects.map(function (subject) {
                return subject.id === editingId ? { id: subject.id, name: name } : subject;
            }),
            topics: data.topics.slice()
        };
        if (!editingId) {
            nextData.subjects.push({
                id: createId("subject"),
                name: name
            });
        }

        if (saveData(nextData)) subjectModal.hide();
    }

    function saveTopic(event) {
        event.preventDefault();
        if (!topicForm.reportValidity()) return;

        var name = topicName.value.trim();
        var duration = Number(topicDuration.value);
        var subjectExists = data.subjects.some(function (subject) {
            return subject.id === topicSubject.value;
        });
        if (!name || !subjectExists || !isValidDate(topicDate.value) ||
                !topicTime.value || !Number.isInteger(duration) || duration < 1 ||
                duration > 1440 || priorities.indexOf(topicPriority.value) === -1) {
            showMessage("Enter a topic, choose an existing subject, and check the date, time, duration (1–1440 minutes) and priority.");
            return;
        }

        var editingId = topicId.value;
        var updatedTopic = {
            id: editingId || createId("topic"),
            subjectId: topicSubject.value,
            name: name,
            date: topicDate.value,
            time: topicTime.value,
            duration: duration,
            priority: topicPriority.value,
            completed: false
        };
        var existingTopic = data.topics.find(function (topic) {
            return topic.id === editingId;
        });
        if (existingTopic) updatedTopic.completed = existingTopic.completed;

        var nextData = {
            subjects: data.subjects.slice(),
            topics: editingId
                ? data.topics.map(function (topic) {
                    return topic.id === editingId ? updatedTopic : topic;
                })
                : data.topics.concat(updatedTopic)
        };
        if (saveData(nextData)) topicModal.hide();
    }

    function openNewTopic() {
        resetTopicForm();
        if (data.subjects.length) {
            topicSubject.value = data.subjects[0].id;
        }
    }

    function resetSubjectForm() {
        subjectForm.reset();
        subjectId.value = "";
        document.getElementById("subjectModalTitle").textContent = "Add subject";
        document.getElementById("saveSubjectButton").textContent = "Save subject";
    }

    function resetTopicForm() {
        topicForm.reset();
        topicId.value = "";
        topicDate.value = today;
        topicDuration.value = "60";
        topicPriority.value = "Medium";
        document.getElementById("topicModalTitle").textContent = "Plan a study session";
        document.getElementById("saveTopicButton").textContent = "Save topic";
        updateSubjectOptions();
    }

    function updateSubjectOptions() {
        topicSubject.innerHTML = data.subjects.map(function (subject) {
            return '<option value="' + escapeHtml(subject.id) + '">' + escapeHtml(subject.name) + '</option>';
        }).join("");
        document.getElementById("addTopicButton").disabled = data.subjects.length === 0;
    }

    function handleSubjectAction(event) {
        var button = event.target.closest("[data-subject-action]");
        if (!button) return;

        var id = button.dataset.subjectId;
        var subject = data.subjects.find(function (item) { return item.id === id; });
        if (!subject) return;

        if (button.dataset.subjectAction === "edit") {
            subjectId.value = subject.id;
            subjectName.value = subject.name;
            document.getElementById("subjectModalTitle").textContent = "Edit subject";
            document.getElementById("saveSubjectButton").textContent = "Update subject";
            subjectModal.show();
        } else if (button.dataset.subjectAction === "delete" &&
                window.confirm("Delete this subject and all of its topics?")) {
            saveData({
                subjects: data.subjects.filter(function (item) { return item.id !== id; }),
                topics: data.topics.filter(function (topic) { return topic.subjectId !== id; })
            });
        }
    }

    function handleTopicToggle(event) {
        var checkbox = event.target.closest("[data-topic-toggle]");
        if (!checkbox) return;
        updateTopic(checkbox.dataset.topicId, { completed: checkbox.checked });
    }

    function handleTopicAction(event) {
        var button = event.target.closest("[data-topic-action]");
        if (!button) return;

        var id = button.dataset.topicId;
        var topic = data.topics.find(function (item) { return item.id === id; });
        if (!topic) return;

        if (button.dataset.topicAction === "edit") {
            topicId.value = topic.id;
            topicSubject.value = topic.subjectId;
            topicName.value = topic.name;
            topicDate.value = topic.date;
            topicTime.value = topic.time;
            topicDuration.value = String(topic.duration);
            topicPriority.value = topic.priority;
            document.getElementById("topicModalTitle").textContent = "Edit study topic";
            document.getElementById("saveTopicButton").textContent = "Update topic";
            topicModal.show();
        } else if (button.dataset.topicAction === "delete" &&
                window.confirm("Delete this study topic?")) {
            saveData({
                subjects: data.subjects.slice(),
                topics: data.topics.filter(function (item) { return item.id !== id; })
            });
        }
    }

    function updateTopic(id, updates) {
        saveData({
            subjects: data.subjects.slice(),
            topics: data.topics.map(function (topic) {
                return topic.id === id ? Object.assign({}, topic, updates) : topic;
            })
        });
    }

    function render() {
        updateSubjectOptions();
        var subjects = data.subjects;
        var topics = data.topics.filter(function (topic) {
            return subjects.some(function (subject) { return subject.id === topic.subjectId; });
        });
        var completed = topics.filter(function (topic) { return topic.completed; }).length;
        var pending = topics.length - completed;
        var percent = topics.length ? Math.round((completed / topics.length) * 100) : 0;

        setText("totalSubjectCount", subjects.length);
        setText("totalTopicCount", topics.length);
        setText("completedTopicCount", completed);
        setText("pendingTopicCount", pending);
        setText("studyProgressPercent", percent + "%");
        setText("studyProgressMessage", topics.length
            ? completed + " of " + topics.length + " topics completed."
            : "No topics yet. Add a subject to get started.");
        var progressBar = document.getElementById("studyCompletionBar");
        progressBar.style.width = percent + "%";
        progressBar.parentElement.setAttribute("aria-valuenow", percent);

        renderSchedule("todayStudySchedule", topics.filter(function (topic) {
            return topic.date === today;
        }), "No study sessions planned for today.");
        renderSchedule("upcomingStudySchedule", topics.filter(function (topic) {
            return topic.date > today && !topic.completed;
        }), "No upcoming study sessions.");

        var subjectsContainer = document.getElementById("studySubjects");
        subjectsContainer.innerHTML = subjects.length
            ? subjects.map(subjectCard).join("")
            : '<p class="empty-state">No subjects yet. Add your first subject to start planning.</p>';
    }

    function subjectCard(subject) {
        var topics = data.topics.filter(function (topic) {
            return topic.subjectId === subject.id;
        }).sort(compareTopics);
        var topicMarkup = topics.length
            ? topics.map(topicCard).join("")
            : '<p class="empty-state study-empty-topics">No topics yet. Plan a session for this subject.</p>';

        return '<article class="study-subject-card">' +
            '<div class="study-subject-header">' +
                '<div><span class="study-subject-mark" aria-hidden="true">' + escapeHtml(subject.name.charAt(0).toUpperCase()) + '</span>' +
                '<h3>' + escapeHtml(subject.name) + '</h3></div>' +
                '<div class="task-actions">' +
                    '<button type="button" class="task-action-btn" data-subject-action="edit" data-subject-id="' + escapeHtml(subject.id) + '">Edit</button>' +
                    '<button type="button" class="task-action-btn delete" data-subject-action="delete" data-subject-id="' + escapeHtml(subject.id) + '">Delete</button>' +
                '</div>' +
            '</div>' +
            '<div class="study-topic-list">' + topicMarkup + '</div>' +
        '</article>';
    }

    function topicCard(topic) {
        var subject = data.subjects.find(function (item) { return item.id === topic.subjectId; });
        return '<article class="study-topic-row' + (topic.completed ? " is-completed" : "") + '">' +
            '<label class="task-check study-topic-check">' +
                '<input type="checkbox" data-topic-toggle data-topic-id="' + escapeHtml(topic.id) + '"' +
                    (topic.completed ? " checked" : "") + '>' +
                '<span class="task-check-box" aria-hidden="true"></span>' +
                '<span class="visually-hidden">Mark ' + escapeHtml(topic.name) + ' as ' + (topic.completed ? "pending" : "completed") + '</span>' +
            '</label>' +
            '<div class="study-topic-details">' +
                '<div class="study-topic-title-row"><h4>' + escapeHtml(topic.name) + '</h4>' +
                    '<span class="priority-badge priority-' + escapeHtml(topic.priority.toLowerCase()) + '">' + escapeHtml(topic.priority) + '</span></div>' +
                '<p>' + escapeHtml(subject ? subject.name : "") + ' · ' + formatSession(topic) + ' · ' +
                    escapeHtml(String(topic.duration)) + ' min</p>' +
                '<span class="study-topic-status">' + (topic.completed ? "Completed" : "Pending") + '</span>' +
            '</div>' +
            '<div class="task-actions study-topic-actions">' +
                '<button type="button" class="task-action-btn" data-topic-action="edit" data-topic-id="' + escapeHtml(topic.id) + '">Edit</button>' +
                '<button type="button" class="task-action-btn delete" data-topic-action="delete" data-topic-id="' + escapeHtml(topic.id) + '">Delete</button>' +
            '</div>' +
        '</article>';
    }

    function renderSchedule(elementId, sessions, emptyText) {
        var container = document.getElementById(elementId);
        sessions.sort(compareTopics);
        container.innerHTML = sessions.length
            ? sessions.map(function (topic) {
                var subject = data.subjects.find(function (item) { return item.id === topic.subjectId; });
                return '<article class="study-schedule-item' + (topic.completed ? " is-completed" : "") + '">' +
                    '<div class="study-schedule-time">' + escapeHtml(formatTime(topic.time)) +
                        '<small>' + escapeHtml(String(topic.duration)) + ' min</small></div>' +
                    '<div class="study-schedule-details"><strong>' + escapeHtml(topic.name) + '</strong>' +
                        '<small>' + escapeHtml(subject ? subject.name : "") + ' · ' +
                        escapeHtml(topic.date === today ? "Today" : window.LifeSync.formatDate(topic.date)) +
                        (topic.completed ? " · Completed" : "") + '</small></div>' +
                    '<span class="priority-badge priority-' + escapeHtml(topic.priority.toLowerCase()) + '">' +
                        escapeHtml(topic.priority) + '</span>' +
                '</article>';
            }).join("")
            : '<p class="empty-state">' + escapeHtml(emptyText) + '</p>';
    }

    function compareTopics(first, second) {
        return first.date.localeCompare(second.date) || first.time.localeCompare(second.time);
    }

    function formatSession(topic) {
        return window.LifeSync.formatDate(topic.date) + " at " + formatTime(topic.time);
    }

    function formatTime(timeString) {
        var parts = timeString.split(":");
        var date = new Date();
        date.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
        return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }

    function isValidDate(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        var parsed = new Date(value + "T00:00:00");
        return !Number.isNaN(parsed.getTime()) &&
            parsed.getFullYear() === Number(value.slice(0, 4)) &&
            parsed.getMonth() + 1 === Number(value.slice(5, 7)) &&
            parsed.getDate() === Number(value.slice(8, 10));
    }

    function createId(prefix) {
        return prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    }

    function setText(id, value) {
        document.getElementById(id).textContent = value;
    }

    function escapeHtml(value) {
        var element = document.createElement("div");
        element.textContent = value == null ? "" : value;
        return element.innerHTML;
    }
});
