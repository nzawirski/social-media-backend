const mongoose = require('mongoose');

const commentSchema = mongoose.Schema({
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
        type: String
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
    parentPost: {
        type: String
    }
})

commentSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    var comment = this;
    // remove ref and recount comments amount
    await mongoose.model('Post').findById(comment.parentPost).exec((err, post) => {
        if (err) console.error(err)

        post.comments = post.comments.filter(e => e != String(comment._id));

        post.commentsAmount = post.comments.length
        post.save((err) => {
            if (err) console.error(err);
        })
    })

    next()
});

module.exports = mongoose.model("Comment", commentSchema);
