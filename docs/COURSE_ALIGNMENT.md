# Course alignment and grading checklist

This project implements **Assignment 6: REST API Project**, using the supplied
course chapters. Notes are the single primary resource.

| Rubric criterion | Points | Implementation and evidence |
| --- | ---: | --- |
| CRUD completeness and correctness | 30 | [Routes](../src/routes/notes.js): GET list, GET one, POST, PUT, DELETE; also PATCH |
| RESTful design and status codes | 20 | [README](../README.md): plural resource URLs, JSON, 200/201/204/400/404/500 |
| Database integration | 20 | [Schema](../src/models/Note.js), [connection](../src/config/database.js), and a test that restarts both API and MongoDB |
| Error handling and validation | 15 | [Validation](../src/middleware/validateNote.js), [errors](../src/middleware/errors.js), and [99 passing tests](evidence/automated-tests.txt) |
| Documentation | 15 | [README](../README.md), [Postman collection](../postman/Notes_API.postman_collection.json), and [collection evidence](evidence/collection-run.txt) |

## Methods used from the chapters

- **12, JS Wrap-Up and Tooling:** npm scripts, package.json, ES modules,
  separate files by job, and .gitignore.
- **16, Node.js and Express:** Express 5, express.json(), middleware,
  request logging, req.params, req.query, res.status(), res.json(), and
  node --watch for development.
- **17, Building REST APIs:** plural nouns, CRUD, PUT versus PATCH,
  validation middleware, server-generated IDs and timestamps, search and
  sorting, CORS, curl, and a body-free 204 response after deletion.
- **18, Databases and Persistence:** MongoDB, Mongoose schemas/models,
  dotenv, timestamps, async/await, connect before listen, find(), findById(),
  create(), findByIdAndUpdate() with new and runValidators, and
  findByIdAndDelete().

The connection also requests journaled writes so acknowledged changes survive
an abrupt database process stop. API error middleware returns a generic 500
for unexpected failures; it does not expose database credentials or a stack.

Chapters 13-15 cover React. Chapters 19-20 add authentication and full-stack
integration. Those features belong to later work and are not required by this
assignment's rubric. The API can be evaluated independently with the supplied
collection and curl examples.

Automated tests, the optional local database launcher, and ZIP packaging are
development tools. The API itself follows the Express/Mongoose approach taught
in chapters 16-18. The local launcher runs a real MongoDB process using the
disk-based WiredTiger storage engine; it is not an array or a mock database.

Official references used to check library behavior:

- [Express error handling](https://expressjs.com/en/5x/guide/error-handling/)
- [Mongoose validation](https://mongoosejs.com/docs/validation.html)
- [Mongoose timestamps](https://mongoosejs.com/docs/timestamps.html)
