const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address'
      ]
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: [20, 'Phone number cannot exceed 20 characters']
    },
    address: {
      type: String,
      trim: true,
      default: '',
      maxlength: [250, 'Address cannot exceed 250 characters']
    }
  },
  {
    timestamps: true
  }
);

// Ensure password or sensitive user data is never returned in JSON
profileSchema.methods.toJSON = function () {
  const profileObj = this.toObject();
  delete profileObj.__v;
  return profileObj;
};

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;
