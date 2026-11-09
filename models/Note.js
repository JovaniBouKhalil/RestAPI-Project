import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'title is required.'],
      trim: true,
      maxlength: [120, 'title must be 120 characters or fewer.'],
    },
    body: {
      type: String,
      default: '',
      maxlength: [5000, 'body must be 5000 characters or fewer.'],
    },
    tags: {
      type: [{ type: String, trim: true }],
      default: [],
      validate: {
        validator: (tags) => tags.length <= 10
          && tags.every((tag) => tag.length > 0 && tag.length <= 30),
        message: 'tags must contain at most 10 non-empty strings of up to 30 characters.',
      },
    },
  },
  { timestamps: true, versionKey: false },
);

export const Note = mongoose.model('Note', noteSchema);
