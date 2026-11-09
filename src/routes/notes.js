import express from 'express';
import mongoose from 'mongoose';
import { Note } from '../models/Note.js';
import { validateNote } from '../middleware/validateNote.js';

const router = express.Router();

router.param('id', (req, res, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({ error: 'id must be a 24-character hexadecimal MongoDB ObjectId.' });
  }
  next();
});

router.get('/', async (req, res) => {
  const { search = '', sort = 'newest', limit } = req.query;
  const allowed = ['search', 'sort', 'limit'];
  if (Object.keys(req.query).some((key) => !allowed.includes(key))) {
    return res.status(400).json({ error: 'Supported query parameters are search, sort, and limit.' });
  }
  if (typeof search !== 'string' || search.length > 120) {
    return res.status(400).json({ error: 'search must be a single string of up to 120 characters.' });
  }
  if (sort !== 'newest' && sort !== 'oldest') {
    return res.status(400).json({ error: 'sort must be newest or oldest.' });
  }
  if (limit !== undefined && (typeof limit !== 'string' || !/^[1-9]\d*$/.test(limit)
    || Number(limit) > 100)) {
    return res.status(400).json({ error: 'limit must be an integer from 1 to 100.' });
  }

  // Treat search as text, so characters such as [ and * are safe to search.
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = search ? { title: { $regex: escaped, $options: 'i' } } : {};
  const direction = sort === 'oldest' ? 1 : -1;
  let query = Note.find(filter).sort({ createdAt: direction, _id: direction });
  if (limit !== undefined) query = query.limit(Number(limit));
  res.json(await query);
});

router.get('/:id', async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found.' });
  res.json(note);
});

router.post('/', validateNote, async (req, res) => {
  const note = await Note.create(req.noteData);
  res.location(`/api/notes/${note._id}`).status(201).json(note);
});

router.put('/:id', validateNote, async (req, res) => {
  const replacement = {
    title: req.noteData.title,
    body: req.noteData.body ?? '',
    tags: req.noteData.tags ?? [],
  };
  const note = await Note.findByIdAndUpdate(
    req.params.id,
    { $set: replacement },
    { new: true, runValidators: true },
  );
  if (!note) return res.status(404).json({ error: 'Note not found.' });
  res.json(note);
});

router.patch('/:id', validateNote, async (req, res) => {
  const note = await Note.findByIdAndUpdate(
    req.params.id,
    { $set: req.noteData },
    { new: true, runValidators: true },
  );
  if (!note) return res.status(404).json({ error: 'Note not found.' });
  res.json(note);
});

router.delete('/:id', async (req, res) => {
  const note = await Note.findByIdAndDelete(req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found.' });
  res.status(204).end();
});

export default router;
