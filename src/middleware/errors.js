export function notFound(req, res) {
  res.status(404).json({ error: 'Route not found.' });
}

// Express error middleware needs all four arguments.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON. Send a valid JSON object.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body exceeds the 64 KB limit.' });
  }
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: 'Invalid request body or encoding.' });
  }
  if (err.name === 'ValidationError') {
    const details = {};
    for (const [field, problem] of Object.entries(err.errors)) {
      details[field] = problem.message;
    }
    return res.status(400).json({ error: 'Validation failed.', details });
  }
  if (err.name === 'CastError' || err.name === 'StrictModeError') {
    return res.status(400).json({ error: 'Invalid field value.' });
  }

  console.error('Request failed:', err.name);
  res.status(500).json({ error: 'Internal server error. Please try again later.' });
}
