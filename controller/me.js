const express = require('express')
const router = express.Router()
const config = require('../config/config')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt');
const saltRounds = 10;
const multer = require('multer');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + file.originalname)
    }
});
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true)
    } else {
        cb(new Error('unsupported file extension'), false)
    }
}
//1024 * 1024 * 5 = 5MB
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5
    },
    fileFilter: fileFilter
});

const readToken = require('../utils/read-token')

const User = require('../model/user');
const Post = require('../model/post');
const Password = require('../model/password')
const Follow = require('../model/follow')
const Notification = require('../model/notification')

//get current user
router.get('/', readToken, (req, res) => {
    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        User.findById(authData.id)
            .exec((err, user) => {
                if (err) {
                    return res.status(500).json({ message: err.message })
                };
                if (!user) {
                    return res.status(404).json({ message: "User not found"})
                }
                res.json(user);
            })
    })
})

//get current users posts
router.get('/posts', readToken, (req, res) => {

    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        User.findById(authData.id, 'posts')
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
                    return res.status(404).json({ message: "User not found"})
                }
                res.json(user.posts);
            })
    })
})

//Get single user's photos
router.get('/photos', readToken, (req, res) => {
    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        User.findById(authData.id, 'photos')
            .populate('photos')
            .exec((err, user) => {
                if (err) {
                    return res.status(500).json({ message: err.message })
                };
                if (!user) {
                    return res.status(404).json({ message: "User not found"})
                }
                res.json(user.photos);
            });
    })
})

//edit current user
router.put('/', readToken, (req, res) => {
    const { first_name, last_name, password, date_of_birth, bio } = req.body;
    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        User.findById(authData.id)
            .exec((err, user) => {
                if (err) {
                    return res.status(500).json({ message: err.message })
                };
                if (!user) {
                    return res.status(404).json({ message: "User not found"})
                }
                if (password) {
                    Password.findOne({ user: authData.id }).exec((err, _password) => {
                        if (err) {
                            return res.status(500).json({ message: err.message })
                        };

                        bcrypt.hash(password, saltRounds, (err, hash) => {
                            if (err) return res.status(500).json({ message: err.message })
                            _password.password = hash
                            _password.save((err) => {
                                if (err) return res.status(500).json({ message: err.message })
                            })
                        })
                    })
                }
                user.first_name = first_name || user.first_name
                user.last_name = last_name || user.last_name
                date_of_birth ? user.date_of_birth = date_of_birth : null
                bio ? user.bio = bio : null
                user.save((err) => {
                    if (err) return res.status(500).json({ message: err.message })
                    res.status(200).json(user);
                })


            })
    })
})

//Change profile picture
router.put('/profilePic', [readToken, upload.single('image')], (req, res) => {

    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        const imgPath = req.file ? req.file.path : null
        User.findById(authData.id)
            .exec((err, user) => {
                if (err) {
                    return res.status(500).json({ message: err.message })
                };
                if (!user) {
                    return res.status(404).json({ message: "User not found"})
                }
                if (!imgPath) {
                    return res.status(400).json({ message: "Photo not uploaded"})
                }

                oldPic = user.profilePic
                //remove old image file
                if (oldPic) {
                    fs.unlink(oldPic, (err) => {
                        if (err) return console.log('Tried to delete ' + oldPic + 'but it was already gone');
                        console.log(oldPic + ' has been deleted');
                    });
                }

                user.profilePic = imgPath

                user.save((err) => {
                    if (err) return res.status(500).json({ message: err.message })
                    res.status(200).json(user);
                })

            })
    })
})

//Delete profile picture
router.delete('/profilePic', readToken, (req, res) => {
    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }

        User.findById(authData.id)
            .exec((err, user) => {
                if (err) {
                    return res.status(500).json({ message: err.message })
                };
                if (!user) {
                    return res.status(404).json({ message: "User not found"})
                }
                oldPic = user.profilePic
                //remove old image file
                if (oldPic) {
                    let delFail = false
                    fs.unlink(oldPic, (err) => {
                        if (err) delFail = true;

                        user.profilePic = null

                        user.save((err) => {
                            if (err) return res.status(500).json({ message: err.message })
                            delFail ?
                                res.status(200).json({message: 'Tried to delete ' + oldPic + 'but it was already gone. User profile updated'})
                                : res.status(200).json({message: oldPic + ' has been deleted'})
                        })

                    });
                } else {
                    res.status(200).json({message: 'There is no profile picture set'})
                }
            })
    })
})

//Delete user
router.delete('/', readToken, (req, res) => {
    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        User.findById(authData.id)
            .exec((err, user) => {
                if (err) {
                    return res.status(500).json({ message: err.message })
                };
                if (!user) {
                    return res.status(404).json({ message: "User not found"})
                }
                user.deleteOne((err) => {
                    if (err) return res.status(500).json({ message: err.message })
                    return res.status(200).json({ message: "Account deleted"})
                })
            })
    })
})

//Get Follows
router.get('/follows', readToken, (req, res) => {
    let followers = new Array();
    let following = new Array();

    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        Follow.find({ follower: authData.id }, "followee")
            .populate("followee")
            .exec((err, follows) => {
                if (err) {
                    return res.status(500).json({ message: err.message })
                };

                follows.forEach(follow => {
                    following.push(follow.followee)
                })

                Follow.find({ followee: authData.id }, "follower")
                    .populate("follower")
                    .exec((err, follows) => {
                        if (err) {
                            return res.status(500).json({ message: err.message })
                        };

                        follows.forEach(follow => {
                            followers.push(follow.follower)
                        })

                        //remove nulls from arrays
                        followers = followers.filter(x => x != null)
                        following = following.filter(x => x != null)
                        res.json({ followersAmount: followers.length, followers, followingAmount: following.length, following });
                    });
            });
    })
})

//News feed
router.get('/feed', readToken, (req, res) => {

    let following = new Array();
    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        Follow.find({ follower: authData.id }, "followee")
            .populate("followee")
            .exec((err, follows) => {
                if (err) {
                    return res.status(500).json({ message: err.message })
                };

                follows.forEach(follow => {
                    following.push(follow.followee)
                })
                Post.find({
                    'author': { $in: following }
                }).sort({ create_date: -1 })
                    .populate({
                        path: "likes",
                        select: "first_name last_name email profilePic",
                        model: "User"
                    })
                    .populate('author', 'first_name last_name email profilePic')
                    .populate('comments')
                    .populate({
                        path: "comments",
                        populate: {
                            path: "likes",
                            select: "first_name last_name email profilePic",
                            model: "User"
                        }
                    })
                    .populate({
                        path: "comments",
                        populate: {
                            path: "author",
                            select: "first_name last_name email profilePic",
                            model: "User"
                        }
                    })
                    .populate('photo')
                    .exec((err, posts) => {
                        if (err) {
                            return res.status(500).json({ message: err.message })
                        }
                        return res.json(posts)
                    })

            })
    })
})

//Notifications
router.get('/notifications', readToken, (req, res) => {
    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        Notification.find({ receiver: authData.id })
            .populate('who')
            .populate('relevantPost')
            .exec((err, notifications) => {
                if (err) {
                    return res.status(500).json({ message: err.message })
                };

                res.json(notifications);
            })
    })
})

//Unread notifications
router.get('/notifications/unread', readToken, (req, res) => {
    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        Notification.find({ receiver: authData.id, read: false })
            .populate('who')
            .populate('relevantPost')
            .exec((err, notifications) => {
                if (err) {
                    return res.status(500).json({ message: err.message })
                };

                res.json({ unreadAmount: notifications.length, notifications });
            })
    })
})

module.exports = router