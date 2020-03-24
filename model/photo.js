const mongoose = require('mongoose');
const fs = require('fs')
const photoSchema = mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId, ref: 'User',
        required: true
    },
    create_date: {
        type: Date,
        default: Date.now
    },
    url: {
        type: String
    },
    parentPost: {
        type: String
    }
});

//on delete: remove image from server 
photoSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    let img = this

    fs.unlink(img.url, (err) => {
        if (err) console.error(err)
        else console.log(img.url + " deleted")
    })
    next()
})

module.exports = mongoose.model("Photo", photoSchema);
