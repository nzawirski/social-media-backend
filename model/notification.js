const mongoose = require('mongoose');

const actions = ['follow', 'comment', 'likePost', 'likeComment']

const notificationSchema = mongoose.Schema({
	who:{
		type: mongoose.Schema.Types.ObjectId, ref: 'User'
    },
    action:{
        type: String,
        enum: actions
    },
    when:{
        type: Date,
        default: Date.now
    },
    relevantPost:{
        type: mongoose.Schema.Types.ObjectId, ref: 'Post'
    },
    receiver:{
        type: String
    },
    read:{
        type: Boolean,
        default: false
    }
});

notificationSchema.index({ receiver: 1 })

module.exports = mongoose.model("Notification", notificationSchema);
