const User = require('../models/User');

const getUserById = async (id) => {
  return User.findById(id).select('-password');
};

const updateUser = async (id, data) => {
  const { password, ...safeData } = data;
  return User.findByIdAndUpdate(id, safeData, { new: true, runValidators: true }).select('-password');
};

module.exports = { getUserById, updateUser };
