# ☕ Manzil — The CafeFinder

> **Find a café that feels like you.**

Manzil is a café discovery platform designed to help users find cafés based not only on location, but also on **what they want to do and how they want to feel**.

For example:

> “Find me a quiet café for studying with Wi-Fi, charging points, and a budget under ₹500.”

The project is currently in the **frontend development stage**. The interface is being built first, followed by JavaScript, backend APIs, database integration, AI/NLP, recommendations, and maps.

---

## ✨ Current Features

- 🏠 Modern landing page
- 🔎 AI-search interface concept
- 🎯 Quick Picks: Study, Work, Date, Friends
- 🌿 Explore by Mood: Cozy, Quiet, Productive, Outdoor
- ☕ Café recommendation cards
- ⭐ Ratings and match percentages
- 🏷️ Café amenities and price ranges
- 🗺️ Map preview
- 📱 Responsive design
- 🎨 Warm, premium café-inspired UI

> **Note:** AI search, real recommendations, database functionality, and live maps are planned features and are not fully implemented yet.

---



## 🛠️ Tech Stack

### Current
- HTML5
- CSS3
- Google Fonts
- Responsive Web Design

### Planned
- JavaScript
- Python
- FastAPI
- REST API
- MySQL
- AI/NLP
- Recommendation Engine
- Maps / Location API

---

## 🧠 Planned AI Workflow

The core idea is to convert a natural-language request into structured preferences.

```text
User Request
     ↓
AI / NLP
     ↓
Extract Preferences
     ↓
Location • Budget • Purpose
Noise • Wi-Fi • Charging
Duration • Other requirements
     ↓
Search Café Database
     ↓
Recommendation Engine
     ↓
Rank Matching Cafés
     ↓
Explain Recommendations
```

Example:

```text
“I need a peaceful café for studying for 3 hours,
with Wi-Fi and charging, under ₹500.”
```

The planned system would identify the relevant requirements and use them to rank cafés.

---

## 🏗️ Planned Architecture

```text
                 MANZIL
                    │
                    ▼
             Frontend Interface
                    │
                    ▼
               User Search
                    │
                    ▼
                 REST API
              ┌─────┴─────┐
              ▼           ▼
          AI / NLP    Café Database
              │           │
              └─────┬─────┘
                    ▼
          Recommendation Engine
                    │
                    ▼
             Ranked Cafés
                    │
                    ▼
              User Interface
```

---

## 📂 Current Project Structure

```text
manzil/
│
├── index.html
├── style.css
│
├── images/
│   ├── cozy.jpg
│   ├── quiet.jpg
│   ├── work.jpg
│   └── outdoor.jpeg
│
└── README.md
```

The structure will expand as JavaScript, backend, database, and AI components are added.

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/manzil.git
```

### 2. Open the project

```bash
cd manzil
```

### 3. Run the frontend

Open `index.html` in a browser, or use **VS Code + Live Server** for development.

---

## 🗺️ Roadmap

### Phase 1 — Frontend
- [x] Landing page
- [x] Navigation
- [x] Hero section
- [x] AI search UI
- [x] Quick Picks
- [x] Explore by Mood
- [x] Café cards
- [x] Map preview
- [x] Footer
- [x] Responsive styling
- [x] Visual redesign

### Phase 2 — JavaScript
- [ ] Search interactions
- [ ] Café filtering
- [ ] Save/favorite functionality
- [ ] Dynamic café cards

### Phase 3 — Backend
- [ ] FastAPI setup
- [ ] REST API
- [ ] Café endpoints
- [ ] Search endpoint
- [ ] Database connection

### Phase 4 — Database
- [ ] MySQL
- [ ] Café data
- [ ] Amenities
- [ ] Ratings
- [ ] Pricing
- [ ] Location data
- [ ] User data

### Phase 5 — AI
- [ ] Natural-language search
- [ ] Requirement extraction
- [ ] Preference matching
- [ ] Recommendation logic
- [ ] Explainable recommendations

### Phase 6 — Maps & Location
- [ ] User location
- [ ] Nearby cafés
- [ ] Distance calculation
- [ ] Interactive map
- [ ] Map markers

### Phase 7 — Product
- [ ] Authentication
- [ ] User profiles
- [ ] Favorites
- [ ] Search history
- [ ] Personalization
- [ ] Deployment

---

## 💡 What Makes Manzil Different?

Traditional café discovery can follow:

```text
Location → Filters → Results
```

Manzil aims to make the experience:

```text
What do you need?
        ↓
Manzil understands your request
        ↓
Find relevant cafés
        ↓
Explain why they match
```

A future recommendation could consider:

- Noise level
- Wi-Fi
- Charging points
- Seating
- Price
- Opening hours
- Distance
- Crowd level
- Work/study suitability

---

## 🔐 Future Security & Privacy

Planned considerations include:

- Secure authentication
- Password hashing
- API security
- Input validation
- Secure database access
- Careful handling of location data

---

## 📸 Screenshots

Screenshots will be added as the project develops.

Planned screenshots:

- Home Page
- Search Results
- Café Details
- Map View
- AI Search
- Mobile View

---

## 📚 Learning Goals

This project is also a practical learning project for:

- HTML & CSS
- JavaScript
- Responsive design
- REST APIs
- FastAPI
- SQL / MySQL
- Backend development
- AI/NLP concepts
- Recommendation systems
- Git & GitHub
- Project architecture

---

## 🔮 Future Vision

Manzil aims to become an intelligent café discovery platform where users can describe the **experience they want**, rather than manually searching through many filters.

```text
User
 ↓
Natural Language
 ↓
AI Understanding
 ↓
Personal Preferences
 ↓
Location + Café Data
 ↓
Recommendation Engine
 ↓
Explainable Recommendations
```

> **Manzil — Find a café that feels like you. ☕**

---

## 👩‍💻 Project Status

**Status: 🚧 In Development**

The current version focuses on the frontend and UI/UX foundation. AI, backend, database, recommendation logic, and real map integration are planned for later stages.

---

## 📄 License

This project is currently being developed as a personal learning and portfolio project.
