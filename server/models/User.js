const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Il nome è obbligatorio'],
      trim: true
    },
    email: {
      type: String,
      required: [true, "L'email è obbligatoria"],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'La password è obbligatoria'],
      minlength: [6, 'La password deve avere almeno 6 caratteri']
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    language: {
      type: String,
      enum: ['it', 'en', 'de'],
      default: 'it'
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
