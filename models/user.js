const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  image: {
    type: String,
    required: true
  },
  // Array => We tell mongoose that in documents based on the schema, we have multiple places entries instead of just one value
  places: [
    {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'Place'
    }
  ]
});

// With unique we create an internal index and it make it easier and faster to query our emails
// With uniqueValidator we make sure that we can only create a new user if the email doesn't exist already
userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User', userSchema);