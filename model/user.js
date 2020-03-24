const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
	first_name:{
		type: String,
		required: true
    },
	last_name:{
		type: String,
		required: true
    },
	email:{
		type: String,
		required: true
	},
	create_date:{
		type: Date,
		default: Date.now
	}
});

module.exports = mongoose.model("User", userSchema);
