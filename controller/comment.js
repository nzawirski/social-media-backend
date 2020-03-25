const express = require('express')
const router = express.Router()
const config = require('../config/config')
const jwt = require('jsonwebtoken')

const readToken = require('../utils/read-token')

const User = require('../model/user');
const Post = require('../model/post');
const Comment = require('../model/comment');
const Notification = require('../model/notification')

const io = require('../app')

//Get comment
router.get('/:_id', (req, res) => {
    Comment.findById(req.params._id)
        .populate('likes', 'first_name last_name email profilePic')
        .populate('author', 'first_name last_name email profilePic')
        .exec((err, comment) => {
            if (err) {
                return res.status(500).json({ message: err.message })
            };
            if (!comment) {
                return res.status(404).json({ message: "Comment not found" })
            }
            res.json(comment);
        });
})

//Edit Comment
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
                message: "Please provide comment content"
            })
        }
        Comment.findById(req.params._id)
            .exec((err, comment) => {
                if (err) {
                    return res.status(500).json({ message: err.message })
                };
                if (!comment) {
                    return res.status(404).json({ message: "Comment not found" })
                }
                //Verify if comment was made by current user
                if(authData.id == comment.author){
                    let edit = {
                        content: comment.content,
                        time: comment.last_edit_date
                    }
                    comment.edit_history.push(edit);
                    comment.content = content
                    comment.last_edit_date = Date.now()
                    comment.save((err) => {
                        if (err) return console.error(err);
                        res.json(comment);
                    })
                    
                }else{
                    return res.status(401).json({ message: "This comment does not belong to this user" })
                }
            });
    })
})

//Delete Comment
router.delete('/:_id', readToken, (req, res) => {
    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        Comment.findById(req.params._id)
            .exec((err, comment) => {
                if (err) {
                    return res.status(500).json({ message: err.message })
                };
                if (!comment) {
                    return res.status(404).json({ message: "Comment not found" })
                }
                //Verify if Comment was made by current user
                if (authData.id == comment.author) {
                    
                    comment.deleteOne((err) => {
                        if (err) return res.status(500).json({ message: err.message })
                    })
                    res.json({ message: "Comment deleted" });

                } else {
                    return res.status(401).json({ message: "This Comment does not belong to this user" })
                }

            });
    })
})

//Like or unlike a comment
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
            //find comment
            Comment.findById(req.params._id)
                .exec((err, comment) => {
                    if (err) {
                        return res.status(500).json({ message: err.message })
                    };
                    if (!comment) {
                        return res.status(404).json({ message: "Comment not found" })
                    }
                    //Check if comment was already liked
                    let alreadyLiked = false;
                    comment.likes.forEach(user => {
                        alreadyLiked = (user._id == authData.id) ? true : alreadyLiked
                    })
                    if (!alreadyLiked) {
                        //Add like
                        comment.likes.push(authData.id)
                        //send notification to comment author
                        let notification = new Notification()
                        notification.who = authData.id
                        notification.action = 'likeComment'
                        notification.relevantPost = comment.parentPost
                        notification.receiver = comment.author
                        notification.save((err) => {
                            if (err) console.error(err)
                        })
                        notification.who = user
                        let event = {
                            type: 'notification',
                            content: notification
                        }
                        io.sockets.emit(comment.author, event)
                    } else {
                        //Unlike
                        comment.likes = comment.likes.filter(e => e != authData.id);
                    }
                    comment.likesAmount = comment.likes.length
                    //save comment
                    comment.save((err) => {
                        if (err) return res.status(500).json({ message: err.message })
                        res.status(200).json(comment);
                    })
                })
        })
    })
})

module.exports = router