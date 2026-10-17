# Manzil - The CafeFinder

Manzil helps people discover cafes based on intent and atmosphere, not only
distance. A natural-language search such as "a quiet cafe in Malad for
studying with Wi-Fi under Rs 500" is parsed into preferences, matched against
the MySQL cafe data, and returned as ranked recommendations.

## Features

- Responsive warm, cafe-inspired frontend
- Natural-language search for purpose, location, budget, and amenities
- Explainable recommendation scores
- Signup/login with PBKDF2 password hashing and JWT bearer tokens
- Authenticated saved-cafe, search-history, and preference endpoints
- MySQL-backed cafe and user data
- Keyboard-accessible quick picks, mood cards, and authentication dialog

## Technology and architecture

- Frontend: HTML, CSS, and browser JavaScript in `manzil/`
- Backend: FastAPI, Uvicorn, PyJWT, and `mysql-connector-python`
- Database: MySQL

The browser calls the FastAPI service on port 8001. The API reads cafes from
MySQL, parses search preferences, ranks matching records, and scopes private
records to the authenticated user from the validated JWT subject.

## Project structure

```text
.
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env                 # local only; never commit
├── manzil/
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   └── images/
├── .gitignore
└── README.md
```

## Local setup

1. Create a MySQL database named `manzil` and ensure the existing `cafes`
   table is populated. Do not run destructive schema commands.
2. Create `backend/.env` with local values (the file is ignored by Git):

   ```env
   DB_HOST=127.0.0.1
   DB_PORT=3307
   DB_USER=your_mysql_user
   DB_PASSWORD=your_mysql_password
   DB_NAME=manzil
   JWT_SECRET=use-a-long-random-production-secret
   ```

3. Install backend dependencies:

   ```powershell
   .\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
   ```

4. Start the backend from the repository root:

   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8001
   ```

   Interactive API documentation is available at
   `http://127.0.0.1:8001/docs`.

5. Serve the frontend from the repository root (for example with VS Code Live
   Server) on port 8000, then open `http://localhost:8000`.

For a deployed backend, define `window.MANZIL_API_BASE_URL` before
`script.js` in `index.html` instead of changing application logic, for
example `https://api.example.com`.

## API overview

- `GET /health` and `GET /db-test`
- `GET /cafes`
- `POST /nlp/parse`
- `POST /search/recommendations`
- `POST /auth/signup` and `POST /auth/login`
- `GET/POST/DELETE /saved-cafes`
- `GET/POST/DELETE /saved/{cafe_id}` compatibility routes
- `GET /history`
- `GET/PUT /preferences`

Protected requests must send `Authorization: Bearer <access_token>`.

## Testing and verification

Run syntax and editor diagnostics before starting the services:

```powershell
.\.venv\Scripts\python.exe -m py_compile backend\main.py
node --check manzil\script.js
```

Then verify `/health`, `/db-test`, `/cafes`, authentication, recommendations,
and saved-cafe flows through `/docs` or the browser. Database-backed scenarios
require a running MySQL instance and valid local configuration.

## Google Maps and deployment

The current map area is a visual preview only. Real markers, directions, and
location-aware results require a provider, valid cafe coordinates, and a
provider key. Coordinates must be added through an approved, backward-
compatible database migration; the application must not invent coordinates.

For production, serve the frontend over HTTPS, use a strong secret supplied
through the deployment environment, restrict CORS to the deployed frontend
origin, use a least-privilege MySQL account, and keep `.env` out of source
control. Configure the frontend API base URL for the deployed backend and run
the backend with a production process manager rather than `--reload`.

Known limitations include the preview-only map, no distance calculation, and
the current browser bearer-token storage trade-off: localStorage keeps the
existing API contract but is exposed to JavaScript running on the page. An
HttpOnly cookie-based session can be introduced when the deployment
architecture supports the corresponding CSRF protections.
