const mongoose = require('mongoose');

const followSchema = mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User'
  },
  followee: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User'
  },
});

followSchema.index({ follower: 1 })
followSchema.index({ followee: 1 })

module.exports = mongoose.model("Follow", followSchema);
