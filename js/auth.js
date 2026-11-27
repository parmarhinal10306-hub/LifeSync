document.addEventListener("DOMContentLoaded", function () {
    var USERS_KEY = "lifesyncDemoUsers";
    var SESSION_KEY = "lifesyncDemoSession";
    var HASH_ITERATIONS = 120000;
    var encoder = new TextEncoder();
    var message = document.getElementById("authMessage");

    document.querySelectorAll("[data-password-toggle]").forEach(function (button) {
        button.addEventListener("click", function () {
            var input = document.getElementById(button.dataset.passwordToggle);
            var showing = input.type === "password";
            input.type = showing ? "text" : "password";
            button.textContent = showing ? "Hide" : "Show";
            button.setAttribute("aria-label", (showing ? "Hide " : "Show ") +
                (input.id === "signupConfirmPassword" ? "confirmation password" : "password"));
            button.setAttribute("aria-pressed", String(showing));
        });
    });

    var loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }

    var signupForm = document.getElementById("signupForm");
    if (signupForm) {
        signupForm.addEventListener("submit", handleSignup);
    }

    function showMessage(text, type) {
        message.textContent = text;
        message.className = "auth-message " + (type === "success" ? "is-success" : "is-error");
        message.hidden = false;
    }

    function readUsers() {
        var savedUsers;
        try {
            savedUsers = localStorage.getItem(USERS_KEY);
        } catch (error) {
            throw new Error("Browser storage is unavailable. Enable LocalStorage to use this demo.");
        }
        if (!savedUsers) return [];

        var users;
        try {
            users = JSON.parse(savedUsers);
        } catch (error) {
            throw new Error("Saved demo accounts could not be read. Existing browser data was left unchanged.");
        }
        if (!Array.isArray(users)) {
            throw new Error("Saved demo accounts have an unexpected format. Existing browser data was left unchanged.");
        }
        return users;
    }

    function writeStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            throw new Error("Browser storage is unavailable or full. Your changes could not be saved.");
        }
    }

    function handleSignup(event) {
        event.preventDefault();
        var form = event.currentTarget;
        var fullName = document.getElementById("signupName").value.trim();
        var emailInput = document.getElementById("signupEmail");
        var email = emailInput.value.trim().toLowerCase();
        var password = document.getElementById("signupPassword").value;
        var confirmPassword = document.getElementById("signupConfirmPassword").value;

        if (!fullName) {
            showMessage("Enter your full name.", "error");
            document.getElementById("signupName").focus();
            return;
        }
        if (!email) {
            showMessage("Enter your email address.", "error");
            emailInput.focus();
            return;
        }
        if (emailInput.validity.typeMismatch) {
            showMessage("Enter a valid email address.", "error");
            emailInput.focus();
            return;
        }
        if (password.length < 8 || password.trim().length < 8) {
            showMessage("Choose a password with at least 8 non-blank characters.", "error");
            return;
        }
        if (password !== confirmPassword) {
            showMessage("The passwords do not match. Please check both fields.", "error");
            document.getElementById("signupConfirmPassword").focus();
            return;
        }
        if (!form.reportValidity()) return;

        setBusy(form, true);
        registerUser(fullName, email, password).then(function () {
            form.reset();
            showMessage("Your demo account was created. You can now log in.", "success");
        }).catch(function (error) {
            console.error("LifeSync demo registration failed:", error);
            showMessage(error.message || "The demo account could not be created. Please try again.", "error");
        }).finally(function () {
            setBusy(form, false);
        });
    }

    async function registerUser(fullName, email, password) {
        var users = readUsers();
        if (users.some(function (user) {
            return user && typeof user.email === "string" && user.email.toLowerCase() === email;
        })) {
            throw new Error("An account with this email already exists. Try logging in instead.");
        }

        if (!window.crypto || !window.crypto.getRandomValues) {
            throw new Error("This browser does not support the password hashing required for this demo. Open the site in a modern browser.");
        }
        var salt = window.crypto.getRandomValues(new Uint8Array(16));
        var passwordHash = await hashPassword(password, salt, HASH_ITERATIONS);
        users.push({
            name: fullName,
            email: email,
            salt: bytesToBase64(salt),
            passwordHash: bytesToBase64(passwordHash),
            iterations: HASH_ITERATIONS
        });
        writeStorage(USERS_KEY, users);
    }

    function handleLogin(event) {
        event.preventDefault();
        var form = event.currentTarget;
        var emailInput = document.getElementById("loginEmail");
        var email = emailInput.value.trim().toLowerCase();
        var password = document.getElementById("loginPassword").value;
        if (!email) {
            showMessage("Enter your email address.", "error");
            emailInput.focus();
            return;
        }
        if (emailInput.validity.typeMismatch) {
            showMessage("Enter a valid email address.", "error");
            emailInput.focus();
            return;
        }
        if (!password) {
            showMessage("Enter your password.", "error");
            document.getElementById("loginPassword").focus();
            return;
        }
        if (!form.reportValidity()) return;

        setBusy(form, true);
        authenticateUser(email, password).then(function (user) {
            writeStorage(SESSION_KEY, { name: user.name, email: user.email });
            window.location.replace("../index.html");
        }).catch(function (error) {
            console.error("LifeSync demo login failed:", error);
            showMessage(error.message || "Login could not be completed. Please try again.", "error");
        }).finally(function () {
            setBusy(form, false);
        });
    }

    async function authenticateUser(email, password) {
        var users = readUsers();
        var user = users.find(function (item) {
            return item && typeof item.email === "string" && item.email.toLowerCase() === email;
        });
        if (!user || typeof user.salt !== "string" ||
                typeof user.passwordHash !== "string" ||
                !Number.isInteger(user.iterations) || user.iterations < 1) {
            throw new Error("Email or password is incorrect. Check your details or sign up first.");
        }

        var candidateHash = await hashPassword(password, base64ToBytes(user.salt), user.iterations);
        if (!constantTimeEqual(candidateHash, base64ToBytes(user.passwordHash))) {
            throw new Error("Email or password is incorrect. Check your details or sign up first.");
        }
        return user;
    }

    async function hashPassword(password, salt, iterations) {
        if (!window.crypto || !window.crypto.subtle || !window.crypto.getRandomValues) {
            throw new Error("This browser does not support the password hashing required for this demo. Open the site in a modern browser.");
        }
        var key = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            "PBKDF2",
            false,
            ["deriveBits"]
        );
        var bits = await window.crypto.subtle.deriveBits({
            name: "PBKDF2",
            salt: salt,
            iterations: iterations,
            hash: "SHA-256"
        }, key, 256);
        return new Uint8Array(bits);
    }

    function bytesToBase64(bytes) {
        var binary = "";
        bytes.forEach(function (byte) {
            binary += String.fromCharCode(byte);
        });
        return window.btoa(binary);
    }

    function base64ToBytes(value) {
        try {
            var binary = window.atob(value);
            var bytes = new Uint8Array(binary.length);
            for (var index = 0; index < binary.length; index++) {
                bytes[index] = binary.charCodeAt(index);
            }
            return bytes;
        } catch (error) {
            throw new Error("Saved demo account data is invalid. Existing browser data was left unchanged.");
        }
    }

    function constantTimeEqual(first, second) {
        if (first.length !== second.length) return false;
        var difference = 0;
        for (var index = 0; index < first.length; index++) {
            difference |= first[index] ^ second[index];
        }
        return difference === 0;
    }

    function setBusy(form, busy) {
        var button = form.querySelector('button[type="submit"]');
        button.disabled = busy;
        button.textContent = busy
            ? (form.id === "signupForm" ? "Creating account..." : "Checking...")
            : (form.id === "signupForm" ? "Create account" : "Log in");
    }
});
