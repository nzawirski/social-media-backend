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
	bio:{
		type: String
	},
	create_date:{
		type: Date,
		default: Date.now
	},
	posts:[{
		type: mongoose.Schema.Types.ObjectId, ref: 'Post'
	}],
	photos:[{
		type: mongoose.Schema.Types.ObjectId, ref: 'Photo'
	}],
	profilePic:{
		type: String
	},
	activated: {
		type: Boolean,
		default: false
	},
	date_of_birth: {
		type: Date
	},
	isFollowed: { //never store anything in that field
		type: String
	}
});

userSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
	var user = this;
	console.log(user)
    //remove follow docs recursively
    await mongoose.model('Follow').deleteMany({$or: [{follower: user._id},{ followee: user._id}]  },(err) => {
        if (err) console.error(err)

    })
    next()
});

module.exports = mongoose.model("User", userSchema);
