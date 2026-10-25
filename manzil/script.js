const welcomeScreen = document.getElementById("welcomeScreen");
const getStartedButton = document.getElementById("getStartedButton");
const welcomeSignInButton = document.getElementById("welcomeSignInButton");
const quickPicks = document.querySelectorAll(".quick-card");
const moodCards = document.querySelectorAll(".vibe-card");
const searchInput = document.getElementById("searchInput");
const aiSearchBtn = document.getElementById("aiSearchBtn");
const searchResult = document.getElementById("searchResult");
const cafeGrid = document.querySelector(".cafe-grid");
const mapButton = document.querySelector(".map-btn");
const mobileNavToggle = document.querySelector(".mobile-nav-toggle");
const navigation = document.querySelector("nav");
const loginButton = document.querySelector(".login-btn");
const authModal = document.querySelector(".auth-modal");
const authCloseButton = document.querySelector(".auth-close");
const authTabs = document.querySelectorAll(".auth-tab");
const authForm = document.querySelector(".auth-form");
const authMessage = document.querySelector(".auth-message");
const authTitle = document.getElementById("authTitle");
const authSubmit = document.querySelector(".auth-submit");
const signupFields = document.querySelectorAll(".signup-only");
const authStorageKey = "manzil-auth";
const apiBaseUrl = window.MANZIL_API_BASE_URL || "http://127.0.0.1:8001";
let authMode = "login";
let savedCafeIds = new Set();

function enterCafeFinder() {
    document.body.classList.add("app-started");
    if (welcomeScreen) {
        welcomeScreen.setAttribute("aria-hidden", "true");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
}

if (getStartedButton) {
    getStartedButton.addEventListener("click", enterCafeFinder);
}

if (welcomeSignInButton) {
    welcomeSignInButton.addEventListener("click", function() {
        openAuthModal("login");
    });
}

const quickQueries = {
    study: "Find a quiet cafe for studying with Wi-Fi",
    work: "Find a productive cafe for work with charging",
    date: "Find a cozy cafe for a date",
    friends: "Find a cafe for meeting friends"
};

const moodQueries = {
    cozy: "Find a cozy cafe",
    quiet: "Find a quiet peaceful cafe",
    productive: "Find a productive cafe for work with Wi-Fi and charging",
    outdoor: "Find an outdoor cafe"
};

let cafes = [];

function enrichCafe(cafe) {
    return {
        ...cafe,
        type: cafe.type || (cafe.purpose === "study"
            ? "Reading cafe"
            : cafe.purpose === "work"
            ? "Work cafe"
            : "Neighborhood cafe"),
        distance: cafe.distance || "Distance unavailable",
        petFriendly: Boolean(cafe.petFriendly ?? cafe.pet_friendly),
        image: cafe.image || (cafe.purpose === "study"
            ? "images/quiet.jpg"
            : cafe.purpose === "friends"
            ? "images/cozy.jpg"
            : "images/work.jpg"),
        description: cafe.description || (cafe.purpose === "study"
            ? "A calm space for studying and reading."
            : cafe.purpose === "work"
            ? "A productive space for focused work."
            : "A comfortable place to meet and relax.")
    };
}

async function loadCafes() {
    try {
        const response = await fetch(apiBaseUrl + "/cafes");

        if (!response.ok) {
            throw new Error("Failed to load cafes");
        }

        const dbCafes = await response.json();

        cafes = dbCafes.map(enrichCafe);

        displayCafes(cafes.map(function(cafe) {
            return { ...cafe, matchScore: 50, matchedFeatures: [] };
        }));
    } catch (error) {
        searchResult.textContent = "☕ We couldn't connect to Manzil right now. Please try again.";
    }
}

loadCafes();

function getAuth() {
    try {
        return JSON.parse(localStorage.getItem(authStorageKey) || "null");
    } catch (error) {
        return null;
    }
}

function authHeaders() {
    const auth = getAuth();
    return auth && auth.token
        ? { Authorization: "Bearer " + auth.token }
        : {};
}

async function readApiResponse(response) {
    const result = await response.json().catch(function() {
        return {};
    });
    if (!response.ok) {
        throw new Error(result.detail || "Something went wrong. Please try again.");
    }
    return result;
}

async function loadSavedCafes() {
    if (!getAuth()) {
        savedCafeIds = new Set();
        return;
    }
    try {
        const response = await fetch(apiBaseUrl + "/saved-cafes", {
            headers: authHeaders()
        });
        const result = await readApiResponse(response);
        savedCafeIds = new Set(result.saved_cafes.map(function(cafe) {
            return cafe.id;
        }));
    } catch (error) {
        if (error.message.includes("token") || error.message.includes("bearer")) {
            localStorage.removeItem(authStorageKey);
            updateLoginButton();
        }
    }
}

function setAuthMode(mode) {
    authMode = mode;
    const isSignup = mode === "signup";
    authTitle.textContent = isSignup ? "Create your account" : "Welcome back";
    authSubmit.textContent = isSignup ? "Create account" : "Login";
    signupFields.forEach(function(field) {
        field.hidden = !isSignup;
        field.querySelector("input").required = isSignup;
    });
    authTabs.forEach(function(tab) {
        tab.classList.toggle("is-active", tab.dataset.authMode === mode);
    });
    authMessage.textContent = "";
}

function openAuthModal(mode) {
    setAuthMode(mode || "login");
    authModal.classList.add("is-open");
    authModal.setAttribute("aria-hidden", "false");
    authForm.querySelector("input[name='email']").focus();
}

function closeAuthModal() {
    authModal.classList.remove("is-open");
    authModal.setAttribute("aria-hidden", "true");
    authForm.reset();
    setAuthMode("login");
}

function updateLoginButton() {
    const auth = getAuth();
    loginButton.textContent = auth ? "Log out" : "Login";
}

if (loginButton) {
    loginButton.addEventListener("click", function() {
        if (localStorage.getItem(authStorageKey)) {
            localStorage.removeItem(authStorageKey);
            savedCafeIds = new Set();
            updateLoginButton();
            displayCafes(cafes.map(function(cafe) {
                return { ...cafe, matchScore: 50, matchedFeatures: [] };
            }));
            return;
        }
        openAuthModal("login");
    });
}

authTabs.forEach(function(tab) {
    tab.addEventListener("click", function() {
        setAuthMode(tab.dataset.authMode);
    });
});

authCloseButton.addEventListener("click", closeAuthModal);
authModal.addEventListener("click", function(event) {
    if (event.target === authModal) {
        closeAuthModal();
    }
});

authForm.addEventListener("submit", async function(event) {
    event.preventDefault();
    const formData = new FormData(authForm);
    const payload = {
        email: formData.get("email"),
        password: formData.get("password")
    };

    if (authMode === "signup") {
        payload.name = formData.get("name");
    }

    authSubmit.disabled = true;
    authMessage.textContent = "Please wait...";

    try {
        const response = await fetch(apiBaseUrl + "/auth/" + authMode, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await readApiResponse(response);

        localStorage.setItem(authStorageKey, JSON.stringify({
            token: result.access_token,
            user: result.user
        }));
        updateLoginButton();
        await loadSavedCafes();
        closeAuthModal();
    } catch (error) {
        authMessage.textContent = error.message;
    } finally {
        authSubmit.disabled = false;
    }
});

updateLoginButton();

quickPicks.forEach(function(button) {
    button.addEventListener("click", function() {
        searchInput.value = quickQueries[button.dataset.purpose] || "";
        searchInput.focus();
    });
});

moodCards.forEach(function(card) {
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");

    function searchMood() {
        const mood = card.querySelector("h3").textContent.toLowerCase();
        searchInput.value = moodQueries[mood] || "Find a cafe";
        handleSearch();
    }

    card.addEventListener("click", searchMood);
    card.addEventListener("keydown", function(event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            searchMood();
        }
    });
});

aiSearchBtn.addEventListener("click", handleSearch);
searchInput.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        handleSearch();
    }
});

if (mapButton) {
    mapButton.addEventListener("click", function() {
        document.querySelector(".cafes-section").scrollIntoView({ behavior: "smooth" });
        searchResult.textContent = "☕ Here are Manzil's nearby café suggestions.";
    });
}

if (mobileNavToggle) {
    mobileNavToggle.addEventListener("click", function() {
        const isOpen = navigation.classList.toggle("is-open");
        mobileNavToggle.setAttribute("aria-expanded", String(isOpen));
        mobileNavToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    });
}

function understandQuery(query) {
    const normalizedQuery = query.toLowerCase().replace(/[–—]/g, "-");
    const preferences = {
        purpose: null,
        quiet: /quiet|peaceful|calm/.test(normalizedQuery),
        wifi: /wifi|wi-fi|wi fi/.test(normalizedQuery),
        charging: /charg|power outlet|socket/.test(normalizedQuery),
        outdoor: /outdoor|outside|garden|patio/.test(normalizedQuery),
        petFriendly: /pet friendly|pet-friendly|pets|dog friendly/.test(normalizedQuery),
        ac: /\bac\b|air conditioning|air-conditioned/.test(normalizedQuery),
        cozy: /cozy|cosy|warm|comfortable/.test(normalizedQuery),
        budget: null
    };

    if (/study|studying|reading|book/.test(normalizedQuery)) {
        preferences.purpose = "study";
    } else if (/work|working|laptop|productive/.test(normalizedQuery)) {
        preferences.purpose = "work";
    } else if (/date|romantic|couple/.test(normalizedQuery)) {
        preferences.purpose = "date";
    } else if (/friend|friends|meetup|meeting/.test(normalizedQuery)) {
        preferences.purpose = "friends";
    }

    const budgetMatch = normalizedQuery.match(/(?:under|below|budget(?:\s+of)?|up to|upto)?\s*₹?\s*(\d+)/);
    if (budgetMatch) {
        preferences.budget = Number(budgetMatch[1]);
    }

    return preferences;
}

function calculateMatchScore(cafe, preferences) {
    let score = 0;
    let possibleScore = 0;
    const matchedFeatures = [];

    if (preferences.purpose) {
        possibleScore += 30;
        if (cafe.purpose === preferences.purpose) {
            score += 30;
            matchedFeatures.push(preferences.purpose);
        }
    }

    const featureWeights = [
        ["quiet", 20, "quiet"],
        ["wifi", 15, "Wi-Fi"],
        ["charging", 10, "charging"],
        ["outdoor", 10, "outdoor seating"],
        ["petFriendly", 10, "pet friendly"],
        ["ac", 5, "AC"]
    ];

    featureWeights.forEach(function([key, weight, label]) {
        if (preferences[key]) {
            possibleScore += weight;
            if (cafe[key]) {
                score += weight;
                matchedFeatures.push(label);
            }
        }
    });

    if (preferences.cozy) {
        possibleScore += 10;
        if (cafe.purpose === "date" || cafe.outdoor || cafe.quiet) {
            score += 10;
            matchedFeatures.push("cozy atmosphere");
        }
    }

    if (preferences.budget !== null) {
        possibleScore += 20;
        if (cafe.price <= preferences.budget) {
            score += 20;
            matchedFeatures.push("within budget");
        }
    }

    if (possibleScore === 0) {
        return { score: 50, matchedFeatures: [] };
    }

    return {
        score: Math.round((score / possibleScore) * 100),
        matchedFeatures: matchedFeatures
    };
}

function findMatchingCafes(preferences) {
    return cafes
        .filter(function(cafe) {

            // Check purpose
            if (
                preferences.purpose &&
                cafe.purpose !== preferences.purpose
            ) {
                return false;
            }

            // Check requested features
            const featureKeys = [
                "quiet",
                "wifi",
                "charging",
                "outdoor",
                "petFriendly",
                "ac"
            ];

            for (const key of featureKeys) {
                if (preferences[key] && !cafe[key]) {
                    return false;
                }
            }

            // Check cozy requirement
            if (
                preferences.cozy &&
                !(cafe.purpose === "date" || cafe.outdoor || cafe.quiet)
            ) {
                return false;
            }

            // Check budget
            if (
                preferences.budget !== null &&
                cafe.price > preferences.budget
            ) {
                return false;
            }

            return true;
        })
        .map(function(cafe) {
            const match = calculateMatchScore(cafe, preferences);

            return {
                ...cafe,
                matchScore: match.score,
                matchedFeatures: match.matchedFeatures
            };
        })
        .sort(function(firstCafe, secondCafe) {
            return (
                secondCafe.matchScore - firstCafe.matchScore ||
                firstCafe.distance.localeCompare(secondCafe.distance)
            );
        });
}

function generateRecommendationReason(cafe, preferences) {
    const features = cafe.matchedFeatures;
    const purposeText = preferences.purpose ? " for " + preferences.purpose : "";

    if (features.length === 0) {
        return cafe.description;
    }

    return "Great match" + purposeText + " — " + features.slice(0, 3).join(", ") + ".";
}

async function toggleSavedCafe(cafeId, button) {
    if (!getAuth()) {
        openAuthModal("login");
        return;
    }

    const isSaved = savedCafeIds.has(cafeId);
    button.disabled = true;
    try {
        const response = await fetch(
            isSaved
                ? apiBaseUrl + "/saved-cafes/" + cafeId
                : apiBaseUrl + "/saved-cafes?cafe_id=" + encodeURIComponent(cafeId),
            {
                method: isSaved ? "DELETE" : "POST",
                headers: authHeaders()
            }
        );
        await readApiResponse(response);
        if (isSaved) {
            savedCafeIds.delete(cafeId);
        } else {
            savedCafeIds.add(cafeId);
        }
        updateSaveButton(button, !isSaved);
    } catch (error) {
        if (error.message.includes("token") || error.message.includes("bearer")) {
            localStorage.removeItem(authStorageKey);
            savedCafeIds = new Set();
            updateLoginButton();
        }
        searchResult.textContent = "☕ " + error.message;
    } finally {
        button.disabled = false;
    }
}

function updateSaveButton(button, isSaved) {
    button.textContent = isSaved ? "♥" : "♡";
    button.classList.toggle("is-saved", isSaved);
    button.setAttribute("aria-label", isSaved ? "Remove café from saved" : "Save café");
    button.setAttribute("aria-pressed", String(isSaved));
}

function displayCafes(cafeMatches) {
    if (!cafeGrid) {
        return;
    }

    if (cafeMatches.length === 0) {
        cafeGrid.innerHTML = "<p class=\"no-results\">☕ We couldn't find an exact match. Try relaxing one of your preferences.</p>";
        return;
    }

    cafeGrid.innerHTML = cafeMatches.map(function(cafe) {
        const isSaved = savedCafeIds.has(cafe.id);
        const tags = [
            cafe.wifi ? "Wi-Fi" : "",
            cafe.quiet ? "Quiet" : "",
            cafe.charging ? "Charging" : "",
            cafe.outdoor ? "Outdoor" : "",
            cafe.petFriendly ? "Pet Friendly" : "",
            cafe.ac ? "AC" : ""
        ].filter(Boolean).slice(0, 4);

        return `
            <article class="cafe-card">
                <div class="cafe-image">
                    <img src="${cafe.image}" alt="${cafe.name}, ${cafe.type}">
                    <span class="match-badge">✦ ${cafe.matchScore}% Match</span>
                    <button class="save-btn ${isSaved ? "is-saved" : ""}" data-cafe-id="${cafe.id}" aria-label="${isSaved ? "Remove café from saved" : "Save café"}" aria-pressed="${isSaved}">${isSaved ? "♥" : "♡"}</button>
                </div>
                <div class="cafe-info">
                    <div class="cafe-title">
                        <div>
                            <h3>${cafe.name}</h3>
                            <p class="cafe-type">${cafe.type}</p>
                        </div>
                        <span>⭐ ${cafe.rating}</span>
                    </div>
                    <p class="cafe-location">📍 ${cafe.distance}</p>
                    <div class="cafe-tags">${tags.map(tag => `<span>${tag}</span>`).join("")}</div>
                    <div class="cafe-bottom">
                        <strong>₹${cafe.price} avg.</strong>
                        <p>${generateRecommendationReason(cafe, currentPreferences)}</p>
                    </div>
                </div>
            </article>`;
    }).join("");

    cafeGrid.querySelectorAll(".save-btn").forEach(function(button) {
        button.addEventListener("click", function() {
            toggleSavedCafe(Number(button.dataset.cafeId), button);
        });
    });
}

let currentPreferences = {};

async function handleSearch() {
    const userQuery = searchInput.value.trim();

    if (userQuery === "") {
        searchResult.textContent = "☕ Tell Manzil what kind of café you're looking for.";
        displayCafes(cafes.map(function(cafe) {
            return { ...cafe, matchScore: 50, matchedFeatures: [] };
        }));
        return;
    }

    aiSearchBtn.disabled = true;
    searchResult.textContent = "☕ Finding your best café matches...";
    try {
        const response = await fetch(apiBaseUrl + "/search/recommendations", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ query: userQuery })
        });
        const result = await readApiResponse(response);
        currentPreferences = result.preferences;
        displayCafes(result.cafes.map(enrichCafe));
        searchResult.textContent = result.cafes.length
            ? "☕ Found " + result.cafes.length + " café suggestions for you."
            : "☕ We couldn't find an exact match. Try relaxing one of your preferences.";
    } catch (error) {
        searchResult.textContent = "☕ " + error.message;
    } finally {
        aiSearchBtn.disabled = false;
    }
}

loadSavedCafes();
// Show/Hide Password
const authPassword = document.getElementById("authPassword");
const togglePassword = document.getElementById("togglePassword");

if (authPassword && togglePassword) {
    togglePassword.addEventListener("click", () => {
        const showPassword = authPassword.type === "password";

        authPassword.type = showPassword ? "text" : "password";
        togglePassword.textContent = showPassword ? "🙈" : "👁️";

        togglePassword.setAttribute(
            "aria-label",
            showPassword ? "Hide password" : "Show password"
        );

        togglePassword.setAttribute("aria-pressed", String(showPassword));
    });
}// Forgot Password - Open Reset Screen
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");

if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener("click", () => {
        const authPanel = document.querySelector(".auth-panel");

        if (!authPanel) return;

        authPanel.innerHTML = `
            <button
                class="auth-close"
                type="button"
                aria-label="Close login dialog"
            >×</button>

            <p class="section-label">YOUR MANZIL</p>
            <h2>Forgot Password?</h2>

            <p class="auth-subtitle">
                Enter your registered email address to reset your password.
            </p>

            <form id="forgotPasswordForm" class="auth-form">
                <label>
                    Email
                    <input
                        name="email"
                        type="email"
                        autocomplete="email"
                        placeholder="you@example.com"
                        required
                    >
                </label>

                <button class="auth-submit" type="submit">
                    Send Reset Link
                </button>
            </form>

            <p class="auth-message" role="status" aria-live="polite"></p>

            <button id="backToLoginBtn" type="button">
                ← Back to Login
            </button>
        `;

        authPanel.querySelector(".auth-close").addEventListener("click", () => {
            document.querySelector(".auth-modal").classList.remove("is-open");
            document.querySelector(".auth-modal").setAttribute("aria-hidden", "true");
        });

        document.getElementById("backToLoginBtn").addEventListener("click", () => {
            window.location.reload();
        });

        document.getElementById("forgotPasswordForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const email = new FormData(form).get("email").trim();
    const message = authPanel.querySelector(".auth-message");
    const submitButton = form.querySelector('button[type="submit"]');

    submitButton.disabled = true;
    message.textContent = "Sending reset link...";

    try {
        const response = await fetch(apiBaseUrl + "/auth/forgot-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email })
        });

        const result = await readApiResponse(response);

        message.textContent = result.message ||
            "If your account exists, a password reset link will be sent to your email.";
    } catch (error) {
        message.textContent =
            error.message || "Unable to send the reset link. Please try again.";
    } finally {
        submitButton.disabled = false;
    }
});
    });
}