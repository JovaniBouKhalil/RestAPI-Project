# Assignment 6: Notes REST API

A Node.js and Express API for saving study notes in MongoDB. It supports full
CRUD, input validation, search, sorting, and persistent storage. The application
uses the Express and Mongoose methods taught in chapters 16-18, with simple ES
modules as in chapter 12.

Repository: <https://github.com/JovaniBouKhalil/RestAPI-Project>

## Install and run

You need **Node.js 20.19 or later**, npm, and MongoDB. Node.js 24 is the tested
version. You can use the local database launcher below, an existing MongoDB
installation, or MongoDB Atlas.

1. Clone the repository and install the locked dependencies:

   ```sh
   git clone https://github.com/JovaniBouKhalil/RestAPI-Project.git
   cd RestAPI-Project
   npm ci
   ```

2. Copy the environment example. In **PowerShell**:

   ```powershell
   Copy-Item .env.example .env
   ```

   In **Git Bash, macOS, or Linux**:

   ```sh
   cp .env.example .env
   ```

3. In one terminal, start the local MongoDB database:

   ```sh
   npm run db
   ```

   Keep that terminal open. On its first run, this downloads MongoDB 8.2.6 for
   your platform, so an internet connection is needed and the download can take
   several minutes. The Windows archive is large. Later runs reuse the binary.
   MongoDB writes real database files to `data/mongodb/` using WiredTiger and
   keeps them between runs. Despite the development library's name,
   `mongodb-memory-server-core` launches a real `mongod` process with disk storage.

4. In a second terminal, from the same project folder, start the API:

   ```sh
   npm run dev
   ```

   Expected output:

   ```text
   Connected to MongoDB.
   Notes API listening on http://localhost:3000
   ```

   Open <http://localhost:3000/api/notes>. A new database returns `[]`.
   `npm run dev` restarts the API when a source file changes. `npm start` runs it
   without watching files. Use Ctrl+C to stop each terminal.

### Use an installed MongoDB server or Atlas instead

If MongoDB already runs locally on port 27017, skip `npm run db` and use the
default `MONGODB_URI`. The launcher uses port 27017 and reports a conflict if it
is already occupied.

For Atlas, create a cluster and database user, allow your IP under Network
Access, and put your connection string in `.env`:

```dotenv
PORT=3000
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_ENCODED_PASSWORD@YOUR_CLUSTER/assignment6_notes
CLIENT_ORIGIN=http://localhost:5173
```

Replace the placeholders and URL-encode special characters in the password.
Then run `npm run dev`; `npm run db` is not needed. The server connects to
MongoDB before listening for HTTP requests.

If you already have a compatible `mongod` executable, the optional launcher and
tests can use it without downloading anything. Add its absolute path to your
local `.env`, for example:

```dotenv
MONGOMS_SYSTEM_BINARY=C:/Program Files/MongoDB/Server/8.2/bin/mongod.exe
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | API port; defaults to `3000`; an integer from 1 to 65535 |
| `MONGODB_URI` | Required MongoDB connection string; the example selects the local `assignment6_notes` database |
| `CLIENT_ORIGIN` | Allowed browser origin for CORS; defaults to `http://localhost:5173` |
| `MONGOMS_SYSTEM_BINARY` | Optional existing MongoDB executable for the local launcher and tests |

`.env`, database files, and `node_modules/` are ignored by Git. Commit only
`.env.example`, which contains no credentials. This assignment exposes public
CRUD endpoints and does not require a login or a frontend.

## Note fields

| Field | Type | Rules |
| --- | --- | --- |
| `_id` | String | MongoDB creates a 24-character hexadecimal ObjectId; read-only |
| `title` | String | Required for POST and PUT; trimmed, non-empty, at most 120 characters |
| `body` | String | Optional; defaults to `""`; at most 5000 characters |
| `tags` | String array | Optional; defaults to `[]`; at most 10 tags, each trimmed and 1-30 characters |
| `createdAt` | ISO date string | Set by the server; read-only |
| `updatedAt` | ISO date string | Set by the server on writes; read-only |

Lengths use JavaScript string length. Extra fields, MongoDB update operators,
incorrect types, and client-supplied server fields are rejected. POST, PUT, and
PATCH require `Content-Type: application/json` and a JSON object. The request
body limit is 64 KB. Each write is acknowledged after MongoDB journals it.

## Available routes

Base URL: `http://localhost:3000`. Requests return JSON except a successful
DELETE and the CORS preflight response, which have no body.

| Method | Route | Success | Common errors |
| --- | --- | --- | --- |
| GET | `/` | 200 API information | 500 |
| GET | `/api/notes` | 200 array, including `[]` | 400, 500 |
| GET | `/api/notes/:id` | 200 note | 400, 404, 500 |
| POST | `/api/notes` | 201 created note and `Location` header | 400, 413, 415, 500 |
| PUT | `/api/notes/:id` | 200 replaced note | 400, 404, 413, 415, 500 |
| PATCH | `/api/notes/:id` | 200 updated note | 400, 404, 413, 415, 500 |
| DELETE | `/api/notes/:id` | 204, empty body | 400, 404, 500 |

Express also supports HEAD for GET routes and answers CORS OPTIONS preflights
with 204. Unknown routes return JSON 404. All database-backed routes can return
500 if the database becomes unavailable.

The curl examples below use **Git Bash, macOS, or Linux**. Replace `NOTE_ID`
with the `_id` returned by POST; the sample ID is illustrative. Windows users
can run the Postman collection or the PowerShell walkthrough in
[docs/demo.ps1](docs/demo.ps1).

### GET / — API information

```sh
curl -i http://localhost:3000/
```

Response: **200 OK**

```json
{"name":"Assignment 6 Notes API","notes":"/api/notes"}
```

### POST /api/notes — create

```sh
curl -i -X POST http://localhost:3000/api/notes \
  -H 'Content-Type: application/json' \
  -d '{"title":"Exam topics","body":"Hooks, Express, REST","tags":["exam"]}'
```

Response: **201 Created**, with
`Location: /api/notes/66f1c2e4b7a1d3f0c8e2a9b1`:

```json
{
  "_id": "66f1c2e4b7a1d3f0c8e2a9b1",
  "title": "Exam topics",
  "body": "Hooks, Express, REST",
  "tags": ["exam"],
  "createdAt": "2026-11-09T17:00:00.000Z",
  "updatedAt": "2026-11-09T17:00:00.000Z"
}
```

### GET /api/notes — list

```sh
curl -i http://localhost:3000/api/notes
```

Response: **200 OK**

```json
[
  {
    "_id": "66f1c2e4b7a1d3f0c8e2a9b1",
    "title": "Exam topics",
    "body": "Hooks, Express, REST",
    "tags": ["exam"],
    "createdAt": "2026-11-09T17:00:00.000Z",
    "updatedAt": "2026-11-09T17:00:00.000Z"
  }
]
```

An empty collection returns `[]`, with status 200. By default, all notes are
returned, newest first. Optional query parameters:

| Parameter | Behavior |
| --- | --- |
| `search` | Case-insensitive text search in the title; at most 120 characters; regex characters are treated literally |
| `sort` | `newest` (default) or `oldest`, using creation time |
| `limit` | Optional integer from 1 to 100; without it, all matching notes are returned |

```sh
curl -i 'http://localhost:3000/api/notes?search=exam&sort=oldest&limit=10'
```

This returns a 200 array in the same format. Unknown or repeated query
parameters and invalid values return 400.

### GET /api/notes/:id — read one

```sh
curl -i http://localhost:3000/api/notes/NOTE_ID
```

Response: **200 OK**

```json
{
  "_id": "66f1c2e4b7a1d3f0c8e2a9b1",
  "title": "Exam topics",
  "body": "Hooks, Express, REST",
  "tags": ["exam"],
  "createdAt": "2026-11-09T17:00:00.000Z",
  "updatedAt": "2026-11-09T17:00:00.000Z"
}
```

### PUT /api/notes/:id — replace

PUT requires a title and replaces every writable field. If body or tags are
omitted, they reset to `""` and `[]`. The ID and creation time stay the same.
PUT does not create a missing note.

```sh
curl -i -X PUT http://localhost:3000/api/notes/NOTE_ID \
  -H 'Content-Type: application/json' \
  -d '{"title":"Revision plan","body":"Review database validation","tags":["revision"]}'
```

Response: **200 OK**

```json
{
  "_id": "66f1c2e4b7a1d3f0c8e2a9b1",
  "title": "Revision plan",
  "body": "Review database validation",
  "tags": ["revision"],
  "createdAt": "2026-11-09T17:00:00.000Z",
  "updatedAt": "2026-11-09T17:05:00.000Z"
}
```

### PATCH /api/notes/:id — partial update

Supply at least one of title, body, or tags. Fields not supplied keep their
values. PATCH does not create a missing note.

```sh
curl -i -X PATCH http://localhost:3000/api/notes/NOTE_ID \
  -H 'Content-Type: application/json' \
  -d '{"body":"Ready to submit"}'
```

Response: **200 OK**

```json
{
  "_id": "66f1c2e4b7a1d3f0c8e2a9b1",
  "title": "Revision plan",
  "body": "Ready to submit",
  "tags": ["revision"],
  "createdAt": "2026-11-09T17:00:00.000Z",
  "updatedAt": "2026-11-09T17:10:00.000Z"
}
```

### DELETE /api/notes/:id — delete

```sh
curl -i -X DELETE http://localhost:3000/api/notes/NOTE_ID
```

Response: **204 No Content**, with an empty body. A later GET or DELETE for
that ID returns 404.

## Error examples

**400 Bad Request:** invalid input on create/update, invalid ID, invalid query,
or malformed JSON. For example, POST `{}` or PUT without a title:

```json
{
  "error": "Validation failed.",
  "details": {"title": "title is required and must be a non-empty string."}
}
```

A GET with ID `not-an-id` returns:

```json
{"error":"id must be a 24-character hexadecimal MongoDB ObjectId."}
```

A malformed body such as `{"title":` returns:

```json
{"error":"Malformed JSON. Send a valid JSON object."}
```

**404 Not Found:** a well-formed ID has no matching note:

```json
{"error":"Note not found."}
```

An unknown path returns `{"error":"Route not found."}` with 404.

**413 Payload Too Large:**

```json
{"error":"Request body exceeds the 64 KB limit."}
```

**415 Unsupported Media Type:** a create/update request has the wrong content type:

```json
{"error":"Content-Type must be application/json."}
```

**500 Internal Server Error:** an unexpected error or unavailable database:

```json
{"error":"Internal server error. Please try again later."}
```

Validation failures do not modify stored notes. Unexpected request errors are
handled centrally; the response does not expose stack traces or credentials.

## Test and demonstrate the API

### Postman

Import [postman/Notes_API.postman_collection.json](postman/Notes_API.postman_collection.json).
Start the database and API, then run all 24 requests in order in the Collection
Runner. The `baseUrl` collection variable defaults to `http://localhost:3000`.
The POST request saves `noteId` automatically. The final requests delete that
note and verify it is missing. Examples and assertions are included in the export.

### Automated checks

```sh
npm test
npm run test:collection
```

These commands start their own real MongoDB process on a free local port and
use an isolated temporary database. They do not need your API or `npm run db`
to be running. The binary is downloaded/cached as described above, or selected
with `MONGOMS_SYSTEM_BINARY`. The tests never clear the normal notes database.

The included collection runner uses Node's fetch and assert to execute the
synchronous test scripts in this exported collection. It needs no Postman
account and is intended for this collection, not arbitrary Postman projects.

Recorded results: **99 automated tests passed**, plus **24 collection requests
and 71 assertions passed**. Coverage includes all CRUD operations, raw stored
documents, update semantics, field limits/types, malformed JSON, invalid IDs,
missing records, query validation, CORS, startup errors, persistence after
restarting both servers, and a handled database failure followed by recovery.

- [Automated test transcript](docs/evidence/automated-tests.txt)
- [Collection transcript](docs/evidence/collection-run.txt)
- [Full process restart check](docs/evidence/process-restart.txt)
- [Rubric checklist and chapter mapping](docs/COURSE_ALIGNMENT.md)

To refresh the evidence, run `npm run test:evidence` and
`npm run test:collection`, then commit the updated transcripts.

### Manual persistence check

1. Create a note with POST and copy its `_id`.
2. Stop and restart the API, then GET the same ID.
3. Stop and restart `npm run db`, restart the API, and GET it again.
4. The note still exists because it is saved in MongoDB's disk files.

## Project structure

```text
src/app.js               Express middleware and route registration
src/server.js            Environment, database connection, and HTTP startup
src/config/database.js   Mongoose connection and durable writes
src/models/Note.js       Note schema and model
src/routes/notes.js       CRUD and list queries
src/middleware/          Validation, request logging, and JSON errors
scripts/                 Local database, evidence, collection, and ZIP tools
test/                    Real database API tests and startup checks
postman/                 Importable collection with examples and assertions
docs/                    Course mapping, PowerShell demo, and test evidence
.env.example             Safe setup template
```

## Troubleshooting

| Problem | Fix |
| --- | --- |
| API exits with a database connection message | Start MongoDB first; check MONGODB_URI; for Atlas, check the database user and allowed IP |
| PORT already in use | Set another PORT in .env and update the collection baseUrl |
| Local launcher fails on port 27017 | Use the already-running MongoDB server, or stop that server before starting the launcher |
| First download is slow or blocked | Wait for the download, use an installed MongoDB binary, or use Atlas for the API |
| Browser CORS error | Set CLIENT_ORIGIN to the browser's exact origin, including port, with no trailing slash |
| 400 for a note ID | Copy the actual 24-character _id from POST; do not use a numeric ID or the NOTE_ID placeholder |

## Submission

Submit the repository URL above and the generated project ZIP. After committing
all files, run:

```sh
npm run package
```

This creates `submission/Assignment_6_REST_API_Project.zip` from Git's committed
files. It includes the README, lockfile, environment example, Postman export,
and test evidence. It excludes `.env`, `node_modules/`, local database files,
the Git folder, and the ZIP itself. The grader installs dependencies with
`npm ci`, creates `.env`, and follows the setup steps above.
