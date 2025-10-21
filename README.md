# String Analyser API

Simple RESTful API that analyzes strings and stores computed properties in a JSON-backed datastore.

Features

- Analyze strings to compute: length, is_palindrome (case-insensitive), unique_characters, word_count, sha256_hash, character_frequency_map
- Endpoints:
  - POST /strings
  - GET /strings/:value
  - GET /strings (with filters)
  - GET /strings/filter-by-natural-language
  - DELETE /strings/:value

Setup

1. Install Node.js (>=16) and npm.
2. From project root, install dependencies:

```bash
npm install
```

Run locally

```bash
npm start
```

The server listens on port 3000 by default. Set PORT to override.

Run tests

```bash
npm test
```

Storage

This implementation uses a simple JSON file at `data/strings.json` to persist analyzed strings. This avoids native build requirements and works cross-platform. For production you can replace it with a proper database.

Notes

- You can deploy to Heroku, Railway, or any VPS.
- No environment variables are required for local testing. Use PORT to change listening port.

API Documentation

- POST /strings

  - Request: { "value": "string to analyze" }
  - Responses:
    - 201 Created: analyzed object
    - 409 Conflict: string already exists
    - 400/422: invalid request

- GET /strings/:value

  - 200 OK: analyzed object
  - 404 Not Found

- GET /strings

  - Query params: is_palindrome (true/false), min_length, max_length, word_count, contains_character

- GET /strings/filter-by-natural-language?query=...

  - Simple heuristic parsing into filters

- DELETE /strings/:value
  - 204 No Content on success
