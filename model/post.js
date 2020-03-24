const mongoose = require('mongoose');

const postSchema = mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId, ref: 'User',
        required: true
    },
    create_date: {
        type: Date,
        default: Date.now
    },
    last_edit_date: {
        type: Date,
        default: Date.now
    },
    content: {
        type: String,
        required: true
    },
    edit_history: [{
        content: String,
        time: Date
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId, ref: 'User'
    }],
    likesAmount: {
        type: Number,
        default: 0
    },
    comments: [{
        type: mongoose.Schema.Types.ObjectId, ref: 'Comment'
    }],
    commentsAmount: {
        type: Number,
        default: 0
    },
    photo: {
        type: mongoose.Schema.Types.ObjectId, ref: 'Photo'
    },
    followers: [{
        type: String
    }]
});

postSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    var post = this;
    //remove comment docs recursively
    await post.comments.forEach(comment => {
        mongoose.model('Comment').deleteOne({ _id: comment }, (err) => {
            if (err) console.error(err)
        });
    })
    //Remove photo document
    if(post.photo){
        await mongoose.model('Photo').findOne({ _id: post.photo }, (err, photo) => {
            if (err) console.error(err)
            photo.deleteOne((err)=> {
                if (err) console.error(err)
            })
        });
    }

    next()
});

module.exports = mongoose.model("Post", postSchema);