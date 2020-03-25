const mongoose = require('mongoose');

const conversationSchema = mongoose.Schema({
    participants:[{
		type: mongoose.Schema.Types.ObjectId, ref: 'User'
    }],
    messages:[{
        type: mongoose.Schema.Types.ObjectId, ref: 'Message'
    }],
    last_activity:{
        type: Date,
        default: Date.now
    },
    hasSeenLatestMessages:[{
        type: mongoose.Schema.Types.ObjectId, ref: 'User'
    }],
    read:{ //never store anything in that field
        type: String
    }
});

conversationSchema.index({ last_activity: 1 })

module.exports = mongoose.model("Converstaion", conversationSchema);
