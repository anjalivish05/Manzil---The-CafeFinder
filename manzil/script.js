const quickPicks = document.querySelectorAll(".quick-card");
const moodCards = document.querySelectorAll(".vibe-card");
const searchInput = document.getElementById("searchInput");
const aiSearchBtn = document.getElementById("aiSearchBtn");
const searchResult = document.getElementById("searchResult");
const cafeGrid = document.querySelector(".cafe-grid");
const mapButton = document.querySelector(".map-btn");
const mobileNavToggle = document.querySelector(".mobile-nav-toggle");
const navigation = document.querySelector("nav");
const savedCafeKey = "manzil-saved-cafes";

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

// Local sample data keeps Part 1 independent from any backend or API.
let cafes = [];

async function loadCafes() {
    try {
        const response = await fetch("http://127.0.0.1:8001/cafes");

        if (!response.ok) {
            throw new Error("Failed to load cafes");
        }

        const dbCafes = await response.json();

        cafes = dbCafes.map(function(cafe) {
            return {
                ...cafe,

                type: cafe.purpose === "study"
                    ? "Reading cafe"
                    : cafe.purpose === "work"
                    ? "Work cafe"
                    : "Neighborhood cafe",

                distance: "1.4 km away",

                outdoor: false,
                petFriendly: false,
                ac: true,

                image:
                    cafe.purpose === "study"
                        ? "images/quiet.jpg"
                        : cafe.purpose === "friends"
                        ? "images/cozy.jpg"
                        : "images/work.jpg",

                description:
                    cafe.purpose === "study"
                        ? "A calm space for studying and reading."
                        : cafe.purpose === "work"
                        ? "A productive space for focused work."
                        : "A comfortable place to meet and relax."
            };
        });

        console.log("Cafes loaded from database:", cafes);

    } catch (error) {
        console.error("Error loading cafes:", error);
    }
}

loadCafes();

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

function getSavedCafes() {
    try {
        return JSON.parse(localStorage.getItem(savedCafeKey)) || [];
    } catch (error) {
        return [];
    }
}

function toggleSavedCafe(cafeName, button) {
    const savedCafes = getSavedCafes();
    const cafeIndex = savedCafes.indexOf(cafeName);

    if (cafeIndex === -1) {
        savedCafes.push(cafeName);
    } else {
        savedCafes.splice(cafeIndex, 1);
    }

    localStorage.setItem(savedCafeKey, JSON.stringify(savedCafes));
    updateSaveButton(button, savedCafes.includes(cafeName));
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

    const savedCafes = getSavedCafes();
    cafeGrid.innerHTML = cafeMatches.map(function(cafe) {
        const isSaved = savedCafes.includes(cafe.name);
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
                    <button class="save-btn ${isSaved ? "is-saved" : ""}" data-cafe-name="${cafe.name}" aria-label="${isSaved ? "Remove café from saved" : "Save café"}" aria-pressed="${isSaved}">${isSaved ? "♥" : "♡"}</button>
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
            toggleSavedCafe(button.dataset.cafeName, button);
        });
    });
}

let currentPreferences = {};

function handleSearch() {
    const userQuery = searchInput.value.trim();

    if (userQuery === "") {
        searchResult.textContent = "☕ Tell Manzil what kind of café you're looking for.";
        displayCafes(cafes.map(function(cafe) {
            return { ...cafe, matchScore: 50, matchedFeatures: [] };
        }));
        return;
    }

    currentPreferences = understandQuery(userQuery);
    const matches = findMatchingCafes(currentPreferences);
    displayCafes(matches);

    if (matches.length === 0) {
        searchResult.textContent = "☕ We couldn't find an exact match. Try relaxing one of your preferences.";
    } else {
        searchResult.textContent = "☕ Found " + matches.length + " café suggestions for you.";
    }
}

displayCafes(cafes.map(function(cafe) {
    return { ...cafe, matchScore: 50, matchedFeatures: [] };
}));