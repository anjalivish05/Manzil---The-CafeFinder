console.log("Welcome to Manzil!");
// Get all Quick Pick buttons
const quickPicks = document.querySelectorAll(".quick-card");

// Get the search input
const searchInput = document.getElementById("searchInput");

quickPicks.forEach(function(button) {

    button.addEventListener("click", function() {

        const purpose = button.dataset.purpose;

        if (purpose === "study") {
            searchInput.value =
                "Find a quiet cafe for studying with Wi-Fi";
        }

        else if (purpose === "work") {
            searchInput.value =
                "Find a productive cafe for work with charging";
        }

        else if (purpose === "date") {
            searchInput.value =
                "Find a cozy cafe for a date";
        }

        else if (purpose === "friends") {
            searchInput.value =
                "Find a cafe for meeting friends";
        }

    });

});
// Get the AI search button
const aiSearchBtn = document.getElementById("aiSearchBtn");

// Get the search result area
const searchResult = document.getElementById("searchResult");

// When the user clicks the AI search button
aiSearchBtn.addEventListener("click", function() {

   const userQuery = searchInput.value.trim();

if (userQuery === "") {
    searchResult.textContent =
        "Please tell Manzil what you're looking for.";
    return;
}

const preferences =
    understandQuery(userQuery);

console.log("Manzil understood:", preferences);

const matches = findMatchingCafes(preferences);

console.log("Matching cafes:", matches);
displayCafes(matches);
searchResult.textContent =
    "☕ Found " + matches.length + " matching cafés.";

    if (userQuery === "") {
        searchResult.textContent =
            "Please tell Manzil what you're looking for.";
        return;
    }

    searchResult.textContent =
        "🔎 You searched for: " + userQuery;

    console.log("User searched:", userQuery);

});
function understandQuery(query) {

    query = query.toLowerCase();

    let preferences = {
        purpose: null,
        quiet: false,
        wifi: false,
        budget: null
    };

    // Detect purpose
    if (query.includes("study") || query.includes("studying")) {
        preferences.purpose = "study";
    }

    else if (query.includes("work")) {
        preferences.purpose = "work";
    }

    else if (query.includes("date")) {
        preferences.purpose = "date";
    }

    else if (query.includes("friends")) {
        preferences.purpose = "friends";
    }

    // Detect quiet preference
    if (query.includes("quiet") || query.includes("peaceful")) {
        preferences.quiet = true;
    }

    // Detect Wi-Fi
    if (query.includes("wifi") || query.includes("wi-fi")) {
        preferences.wifi = true;
    }

    // Detect budget
    const budgetMatch = query.match(/₹\s?(\d+)/);

    if (budgetMatch) {
        preferences.budget = Number(budgetMatch[1]);
    }

    return preferences;
}
// Café data
const cafes = [
    {
        name: "Brew & Pages",
        price: 400,
        quiet: true,
        wifi: true,
        purpose: "study"
    },

    {
        name: "The Cozy Bean",
        price: 600,
        quiet: false,
        wifi: true,
        purpose: "friends"
    },

    {
        name: "The Reading Corner",
        price: 450,
        quiet: true,
        wifi: true,
        purpose: "study"
    },

    {
        name: "Urban Coffee",
        price: 350,
        quiet: false,
        wifi: true,
        purpose: "work"
    }
];
// Find cafés matching the user's preferences
function findMatchingCafes(preferences) {

    const matches = cafes.filter(function(cafe) {

        // Check purpose
        if (
            preferences.purpose &&
            cafe.purpose !== preferences.purpose
        ) {
            return false;
        }

        // Check quiet preference
        if (
            preferences.quiet &&
            !cafe.quiet
        ) {
            return false;
        }

        // Check Wi-Fi preference
        if (
            preferences.wifi &&
            !cafe.wifi
        ) {
            return false;
        }

        // Check budget
        if (
            preferences.budget &&
            cafe.price > preferences.budget
        ) {
            return false;
        }

        return true;
    });

    return matches;
}