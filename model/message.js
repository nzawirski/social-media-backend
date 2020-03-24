const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
	sender:{
		type: mongoose.Schema.Types.ObjectId, ref: 'User'
    },
    time:{
        type: Date,
        default: Date.now
    },
    content:{
        type: String
    }
});

module.exports = mongoose.model("Message", messageSchema);
