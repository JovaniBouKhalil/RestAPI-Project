const WRITABLE_FIELDS = ['title', 'body', 'tags'];

export function validateNote(req, res, next) {
  if (!req.is('application/json')) {
    return res.status(415).json({ error: 'Content-Type must be application/json.' });
  }

  const data = req.body;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return res.status(400).json({ error: 'Request body must be a JSON object.' });
  }

  const details = {};
  const fields = Object.keys(data);
  const unknownFields = fields.filter((field) => !WRITABLE_FIELDS.includes(field));
  if (unknownFields.length > 0) {
    details.fields = `Only title, body, and tags can be supplied. Unknown fields: ${unknownFields.join(', ')}.`;
  }

  // PUT replaces all writable fields; PATCH changes only supplied fields.
  const requireTitle = req.method !== 'PATCH';
  if (requireTitle || Object.hasOwn(data, 'title')) {
    if (typeof data.title !== 'string' || data.title.trim().length === 0) {
      details.title = 'title is required and must be a non-empty string.';
    } else if (data.title.trim().length > 120) {
      details.title = 'title must be 120 characters or fewer.';
    }
  }

  if (Object.hasOwn(data, 'body')) {
    if (typeof data.body !== 'string') {
      details.body = 'body must be a string.';
    } else if (data.body.length > 5000) {
      details.body = 'body must be 5000 characters or fewer.';
    }
  }

  if (Object.hasOwn(data, 'tags')) {
    if (!Array.isArray(data.tags) || data.tags.length > 10
      || data.tags.some((tag) => typeof tag !== 'string'
        || tag.trim().length === 0 || tag.trim().length > 30)) {
      details.tags = 'tags must be an array of at most 10 non-empty strings of up to 30 characters.';
    }
  }

  if (req.method === 'PATCH' && fields.length === 0) {
    details.fields = 'Supply at least one of title, body, or tags.';
  }

  if (Object.keys(details).length > 0) {
    return res.status(400).json({ error: 'Validation failed.', details });
  }

  // Copy allowed fields so MongoDB operators and server fields never reach an update.
  req.noteData = {};
  for (const field of WRITABLE_FIELDS) {
    if (Object.hasOwn(data, field)) req.noteData[field] = data[field];
  }
  next();
}
