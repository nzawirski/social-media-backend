const mongoose = require('mongoose');

const passwordSchema = mongoose.Schema({
	user: { type: mongoose.Schema.Types.ObjectId ,ref: 'User' },
    password: { type: String, required: true }
});

module.exports = mongoose.model("password", passwordSchema);
