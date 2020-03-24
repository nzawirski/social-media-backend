const mongoose = require('mongoose');

const tokenSchema = mongoose.Schema({
	user: { type: mongoose.Schema.Types.ObjectId ,ref: 'User' },
    token: { type: String }
});

module.exports = mongoose.model("token", tokenSchema);
