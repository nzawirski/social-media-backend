const express = require('express')
const router = express.Router()
const config = require('../config/config')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt');
const saltRounds = 10;

const readToken = require('../utils/read-token')
const mailer = require('../utils/mailer')
const UIDGenerator = require('uid-generator');
const uidgen = new UIDGenerator();

const User = require('../model/user');
const Token = require('../model/token');
const Password = require('../model/password')
const Follow = require('../model//follow');
const Notification = require('../model/notification')

const io = require('../app')

//List of users
router.get('/', (req, res) => {
    User.find({ activated: true }, (err, users) => {
        if (err) return res.status(500).json({ message: err.message })
        res.json(users);
    });
})

//Search
router.get('/search', readToken, (req, res) => {

    let search = req.query.search
    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        User.find({ "_id": { "$ne": authData.id }, $or: [{ first_name: { $regex: '.*' + search + '.*' } }, { last_name: { $regex: '.*' + search + '.*' } }, { email: { $regex: '.*' + search + '.*' } }] }, (err, users) => {
            if (err) {
                return res.status(500).json({ message: err.message })
            }
            if (users.length == 0) {
                return res.json(users)
            }
            let itemsProcessed = 0
            users.forEach(user => {
                Follow.findOne({ follower: authData.id, followee: user._id }).exec((err, follow) => {
                    if (err) {
                        return res.status(500).json({ message: err.message })
                    }
                    let isFollowed = false
                    if (follow) {
                        isFollowed = true
                    }
                    user.isFollowed = isFollowed

                    itemsProcessed++
                    //return users only when we checked all of them
                    if (itemsProcessed == users.length) {
                        return res.json(users);
                    }
                })
            })
        });
    })
})

//register
router.post('/', (req, res) => {
    const { first_name, last_name, email, password, date_of_birth, bio } = req.body;

    if (!first_name || !last_name || !email || !password) {
        return res.status(400).json({
            message: "Please provide all required parameters"
        })
    }

    User.findOne({ email: email }, (err, user) => {
        if (err) {
            return res.status(500).json({ message: err.message })
        }
        if (user) {
            return res.status(409).json({ message: "User already exists" })
        }
        bcrypt.hash(password, saltRounds, (err, hash) => {
            if (err) return res.status(500).json({ message: err.message })
            //set user details
            let user = new User({ first_name, last_name, email })
            date_of_birth ? user.date_of_birth = date_of_birth : null
            bio ? user.bio = bio : null

            if(process.env.NODE_ENV === 'dev'){
                //automatically activate if in dev enviroment
                user.activated = true
            }

            //save user
            user.save((err, user) => {
                if (err) return res.status(500).json({ message: err.message })
                //save password
                let password = new Password({ user: user._id, password: hash })
                password.save((err) => {
                    if (err) return res.status(500).json({ message: err.message })
                })
                //save activation token
                let token = uidgen.generateSync();
                let tokenObject = new Token({ user: user._id, token })
                tokenObject.save((err) => {
                    if (err) return res.status(500).json({ message: err.message })
                })

                mailer.sendAfterRegister(user, token)


                res.status(201).json(user);
            })
        })
    })
})

//request pass reset
router.post('/reset/', (req, res) => {

    let { email } = req.body
    if (!email) {
        return res.status(400).json({
            message: "Please provide all required parameters"
        })
    }
    User.findOne({ email })
        .exec((err, user) => {
            if (err) {
                return res.status(500).json({ message: err.message })
            };
            if (!user) {
                return res.status(404).json({ message: "User not found" })
            }
            let token = uidgen.generateSync();
            let tokenObject = new Token({ user: user._id, token })
            tokenObject.save((err) => {
                if (err) return res.status(500).json({ message: err.message })
                mailer.sendPasswordReset(user, token)
                res.status(200).json({ message: "Token sent" });
            })
        })
})

//Get single user
router.get('/:_id', readToken, (req, res) => {
    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        let followeeList = new Array();
        Follow.find({ follower: authData.id }, "followee")
            .populate("followee")
            .exec((err, follows) => {
                if (err) {
                    return res.status(500).json({ message: err.message })
                };

                follows.forEach(follow => {
                    followeeList.push(follow.followee)
                })

                followeeList = followeeList.filter(x => x != null)

                User.findById(req.params._id)
                    .exec((err, user) => {
                        if (err) {
                            return res.status(500).json({ message: err.message })
                        };
                        if (!user) {
                            return res.status(404).json({ message: "User not found" })
                        }
                        let isFollowed = false

                        followeeList.forEach(followee => {
                            isFollowed = String(followee._id) == String(user._id) ? true : isFollowed
                        })

                        user.isFollowed = isFollowed

                        res.json(user);
                    })
            })
    })
})

//Get single user's posts
router.get('/:_id/posts', (req, res) => {
    User.findById(req.params._id, 'posts')
        .populate('posts')
        .populate({
            path: "posts",
            populate: {
                path: "likes",
                select: "first_name last_name email profilePic",
                model: "User"
            }
        })
        .populate({
            path: "posts",
            populate: {
                path: "author",
                select: "first_name last_name email profilePic",
                model: "User"
            }
        })
        .populate({
            path: "posts",
            populate: {
                path: "comments",
                model: "Comment"
            }
        })
        .populate({
            path: "posts",
            populate: {
                path: "comments",
                populate: {
                    path: "likes",
                    select: "first_name last_name email profilePic",
                    model: "User"
                }
            }
        })
        .populate({
            path: "posts",
            populate: {
                path: "photo",
                model: "Photo"
            }
        })
        .exec((err, user) => {
            if (err) {
                return res.status(500).json({ message: err.message })
            };
            if (!user) {
                return res.status(404).json({ message: "User not found" })
            }
            res.json(user.posts);
        });
})

//Get single user's photos
router.get('/:_id/photos', (req, res) => {
    User.findById(req.params._id, 'photos')
        .populate('photos')
        .exec((err, user) => {
            if (err) {
                return res.status(500).json({ message: err.message })
            };
            if (!user) {
                return res.status(404).json({ message: "User not found" })
            }
            res.json(user.photos);
        });
})

//Follow or Unfollow a user
router.post('/:_id/follow', readToken, (req, res) => {

    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        if (authData.id == req.params._id) {
            return res.status(400).json({ message: "You can't follow yourself" })
        }
        //find follower
        User.findById(authData.id, (err, follower) => {
            if (err) {
                return res.status(400).json({
                    message: err.message
                })
            }
            //find followee
            User.findById(req.params._id)
                .exec((err, followee) => {
                    if (err) {
                        return res.status(500).json({ message: err.message })
                    };
                    if (!followee) {
                        return res.status(404).json({ message: "User not found" })
                    }
                    Follow.findOne({ follower: follower._id, followee: followee._id }, (err, follow) => {
                        if (err) {
                            return res.status(500).json({ message: err.message })
                        };
                        if (follow) {
                            //unfollow
                            follow.deleteOne((err) => {
                                if (err) return res.status(500).json({ message: err.message })
                            })
                            res.status(200).json({ message: "User unfollowed" })
                        } else {
                            //follow
                            let newFollow = new Follow({ follower: follower._id, followee: followee._id })
                            newFollow.save((err) => {
                                if (err) return res.status(500).json({ message: err.message })
                                //send notification to post author
                                let notification = new Notification()
                                notification.who = follower._id
                                notification.action = 'follow'
                                notification.relevantPost = null
                                notification.receiver = followee._id
                                notification.save((err) => {
                                    if (err) console.error(err)
                                })
                                notification.who = follower
                                let event = {
                                    type: "notification",
                                    content: notification
                                }
                                io.sockets.emit(followee._id, event)
                                res.status(201).json(newFollow);
                            })
                        }
                    })

                })
        })
    })
})

//Get Follows
router.get('/:_id/follows', (req, res) => {
    let followers = new Array();
    let following = new Array();

    Follow.find({ follower: req.params._id }, "followee")
        .populate("followee")
        .exec((err, follows) => {
            if (err) {
                return res.status(500).json({ message: err.message })
            };
            if (!following) {
                return res.status(404).json({ message: "User not found" })
            }

            follows.forEach(follow => {
                following.push(follow.followee)
            })

            Follow.find({ followee: req.params._id }, "follower")
                .populate("follower")
                .exec((err, follows) => {
                    if (err) {
                        return res.status(500).json({ message: err.message })
                    };
                    if (!following) {
                        return res.status(404).json({ message: "User not found" })
                    }

                    follows.forEach(follow => {
                        followers.push(follow.follower)
                    })
                    followers = followers.filter(x => x != null)
                    following = following.filter(x => x != null)
                    res.json({ followersAmount: followers.length, followers, followingAmount: following.length, following });
                });
        });
})

module.exports = router