const express = require('express')
const router = express.Router()
const config = require('../config/config')
const jwt = require('jsonwebtoken')
const multer = require('multer');

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
const Comment = require('../model/comment');
const Photo = require('../model/photo');
const Notification = require('../model/notification');

const io = require('../app')

//Add Post
router.post('/', [readToken, upload.single('postImage')], (req, res) => {
    const { content } = req.body;
    const imgPath = req.file ? req.file.path : null
    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        if (!content) {
            return res.status(400).json({
                message: "Please provide post content"
            })
        }
        User.findById(authData.id, (err, user) => {
            if (err) {
                return res.status(400).json({
                    message: err.message
                })
            }
            //create post and set user as author
            let post = new Post({ content: content, author: user._id, photo: imgPath });
            post.followers.push(user._id)
            //if post has photo save it with post
            if (req.file) {
                let photo = new Photo({ author: user._id, url: imgPath, parentPost: post._id })
                photo.save((err) => {
                    if (err) return res.status(500).json({ message: err.message })
                    post.photo = photo._id
                    post.save((err) => {
                        if (err) return res.status(500).json({ message: err.message })
                        user.posts.push(post._id)
                        user.photos.push(photo._id)
                        user.save((err) => {
                            if (err) return res.status(500).json({ message: err.message })
                            res.status(201).json(post);
                        })
                    })
                })
                //if no photo save just the post
            } else {
                post.save((err) => {
                    if (err) return res.status(500).json({ message: err.message })
                    user.posts.push(post._id)
                    user.save((err) => {
                        if (err) return res.status(500).json({ message: err.message })
                        res.status(201).json(post);
                    })
                })
            }
        })
    })
})

//Get Single Post
router.get('/:_id', (req, res) => {
    Post.findById(req.params._id)
        .populate('likes', 'first_name last_name email profilePic')
        .populate('author', 'first_name last_name profilePic')
        .populate('comments')
        .populate({
            path: "comments",
            populate: {
                path: "author",
                select: "first_name last_name email profilePic",
                model: "User"
            }
        })
        .populate({
            path: "comments",
            populate: {
                path: "likes",
                select: "first_name last_name email profilePic",
                model: "User"
            }
        })
        .populate('photo')
        .exec((err, post) => {
            if (err) {
                return res.status(500).json({ message: err.message })
            };
            if (!post) {
                return res.status(404).json({ message: "Post not found" })
            }
            res.json(post);
        });
})

//Edit Post
router.put('/:_id', readToken, (req, res) => {
    const { content } = req.body;
    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        if (!content) {
            return res.status(400).json({
                message: "Please provide post content"
            })
        }
        Post.findById(req.params._id)
            .exec((err, post) => {
                if (err) {
                    return res.status(500).json({ message: err.message })
                };
                if (!post) {
                    return res.status(404).json({ message: "Post not found" })
                }
                //Verify if post was made by current user
                if (authData.id == post.author) {
                    let edit = {
                        content: post.content,
                        time: post.last_edit_date
                    }
                    post.edit_history.push(edit);
                    post.content = content
                    post.last_edit_date = Date.now()
                    post.save((err) => {
                        if (err) return res.status(500).json({ message: err.message })
                        res.json(post);
                    })

                } else {
                    return res.status(401).json({ message: "This post does not belong to this user" })
                }

            });
    })
})

//Delete Post
router.delete('/:_id', readToken, (req, res) => {
    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        Post.findById(req.params._id)
            .exec((err, post) => {
                if (err) {
                    return res.status(500).json({ message: err.message })
                };
                if (!post) {
                    return res.status(404).json({ message: "Post not found" })
                }
                //Verify if post was made by current user
                if (authData.id == post.author) {

                    post.deleteOne((err) => {
                        if (err) return res.status(500).json({ message: err.message })
                    })
                    res.json({ message: "Post deleted" })

                } else {
                    return res.status(401).json({ message: "This post does not belong to this user" })
                }

            });
    })
})

//Add comment
router.post('/:_id/comments', readToken, (req, res) => {
    const { content } = req.body;

    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        if (!content) {
            return res.status(400).json({
                message: "Please provide comment content"
            })
        }
        User.findById(authData.id, (err, user) => {
            if (err) {
                return res.status(400).json({
                    message: err.message
                })
            }
            //find post
            Post.findById(req.params._id)
                .exec((err, post) => {
                    if (err) {
                        return res.status(500).json({ message: err.message })
                    };
                    if (!post) {
                        return res.status(404).json({ message: "Post not found" })
                    }
                    //Create and add comment
                    let comment = new Comment({ content: content, author: user._id, parentPost: post._id });
                    comment.save((err) => {
                        if (err) return res.status(500).json({ message: err.message })
                        post.comments.push(comment._id)
                        post.commentsAmount = post.comments.length
                        post.last_activity = Date.now()
                        //add commenter to post followers
                        let alreadyFollowing = false;
                        post.followers.forEach(_user => {
                            alreadyFollowing = (_user == authData.id) ? true : alreadyFollowing
                        })
                        if (!alreadyFollowing) {
                            post.followers.push(user._id)
                        }
                        post.save((err) => {
                            if (err) return res.status(500).json({ message: err.message })
                            //send notification to all post followers except the sender

                            post.followers.forEach(_user => {
                                if (authData.id != _user) {
                                    let notification = new Notification()
                                    notification.who = authData.id
                                    notification.action = 'comment'
                                    notification.relevantPost = post._id
                                    notification.receiver = _user
                                    notification.save((err) => {
                                        if (err) console.error(err)
                                    })
                                    notification.who = user
                                    let event = {
                                        type: "notification",
                                        content: notification
                                    }
                                    io.sockets.emit(_user, event)
                                }
                            })

                            res.status(201).json(comment);
                        })
                    })
                })
        })
    })
})

//Like or unlike a post
router.post('/:_id/like', readToken, (req, res) => {

    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }

        User.findById(authData.id, (err, user) => {
            if (err) {
                return res.status(400).json({
                    message: err.message
                })
            }
            //find post
            Post.findById(req.params._id)
                .exec((err, post) => {
                    if (err) {
                        return res.status(500).json({ message: err.message })
                    };
                    if (!post) {
                        return res.status(404).json({ message: "Post not found" })
                    }
                    //Check if post was already liked
                    let alreadyLiked = false;
                    post.likes.forEach(user => {
                        alreadyLiked = (user._id == authData.id) ? true : alreadyLiked
                    })
                    if (!alreadyLiked) {
                        //Add like
                        post.likes.push(authData.id)
                        //send notification to post author (if it's not author liking their own post)
                        if(post.author != authData.id){
                            let notification = new Notification()
                            notification.who = authData.id
                            notification.action = 'likePost'
                            notification.relevantPost = post._id
                            notification.receiver = post.author
                            notification.save((err) => {
                                if (err) console.error(err)
                            })
                            notification.who = user
                            let event = {
                                type: "notification",
                                content: notification
                            }
                            io.sockets.emit(post.author, event)
                        }
                        
                    } else {
                        //Unlike
                        post.likes = post.likes.filter(e => e != authData.id);
                        // ^ this is a workaround
                        //   post.likes.id(authData.id) is not working for some reason
                    }
                    post.likesAmount = post.likes.length
                    //save post
                    post.save((err) => {
                        if (err) return res.status(500).json({ message: err.message })
                        res.status(200).json(post);
                    })
                })
        })
    })
})

//Unfollow a post
router.post('/:_id/follow', readToken, (req, res) => {
    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        User.findById(authData.id, (err, user) => {
            if (err) {
                return res.status(400).json({
                    message: err.message
                })
            }
            //find post
            Post.findById(req.params._id)
                .exec((err, post) => {
                    if (err) {
                        return res.status(500).json({ message: err.message })
                    };
                    if (!post) {
                        return res.status(404).json({ message: "Post not found" })
                    }

                    //check if user follows post
                    let alreadyFollowing = false;
                    post.followers.forEach(_user => {
                        alreadyFollowing = (_user == authData.id) ? true : alreadyFollowing
                    })
                    if (!alreadyFollowing) {
                        //follow
                        post.followers.push(user._id)
                    }else{
                        //unfollow
                        post.followers = post.followers.filter(e => e != authData.id);
                    }
                    post.save((err) => {
                        if (err) return res.status(500).json({ message: err.message })
                        res.status(200).json(post);
                    })
                })
        })
    })
})

module.exports = router