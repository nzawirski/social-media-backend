const express = require('express')
const router = express.Router()
const config = require('../config/config')
const jwt = require('jsonwebtoken')

const readToken = require('../utils/read-token')

const User = require('../model/user');
const Conversation = require('../model/conversation')
const Message = require('../model/message')

const io = require('../app')

//get curent users convos
router.get('/', readToken, (req, res) => {
    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        Conversation.find({ 'participants': authData.id })
            .populate('participants')
            .exec((err, conversations) => {
                if (err) return res.status(500).json({ message: err.message })

                if(conversations.length == 0){
                    return res.json(conversations);
                }
                let itemsProcessed = 0
                conversations.forEach(conversation => {
                    //check if user has seen latest changes
                    let upToDate = false;
                    conversation.hasSeenLatestMessages.forEach(user => {
                        upToDate = (user._id == authData.id) ? true : upToDate
                    })
                    conversation.read = upToDate
                    itemsProcessed++
                    //return conversations only when we checked all of them
                    if(itemsProcessed == conversations.length){
                        return res.json(conversations);
                    }
                })
            });
    })
})

//new convo
router.post('/', readToken, (req, res) => {
    const { participants } = req.body;
    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        if (!participants) {
            return res.status(400).json({
                message: "Please provide participants"
            })
        }
        participants.push(authData.id)
        participants.sort() // need to sort so order doesn't matter in query

        Conversation.findOne({ 'participants': participants }, (err, _conversation) => {
            if (err) return res.status(500).json({ message: err.message })
            if (_conversation) {
                //return existing conv
                res.json(_conversation);
            } else {
                //create new conv
                let conversation = new Conversation({ participants: participants });
                conversation.hasSeenLatestMessages.push(authData.id)
                conversation.save((err) => {
                    if (err) return res.status(500).json({ message: err.message })
                    res.status(201).json(conversation)
                })
            }

        });
    })
})

//get single conv
router.get('/:_id', readToken, (req, res) => {
    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        Conversation.findById(req.params._id)
            .populate('participants', 'first_name last_name email profilePic')
            .populate('hasSeenLatestMessages', 'first_name last_name email profilePic')
            .populate('messages')
            .populate({
                path: "messages",
                populate: {
                    path: "sender",
                    select: "first_name last_name email profilePic",
                    model: "User"
                }
            })
            .exec((err, conversation) => {
                if (err) return res.status(500).json({ message: err.message })
                if (!conversation) {
                    return res.status(404).send("Conversation not found")
                }
                let isParticipant = false
                conversation.participants.forEach(participant => {
                    isParticipant = (participant._id == authData.id) ? true : isParticipant
                })
                if (!isParticipant) {
                    return res.status(403).send("User is not a participant in this conversation")
                }
                //check if user has seen latest changes
                let upToDate = false;
                conversation.hasSeenLatestMessages.forEach(user => {
                    upToDate = (user._id == authData.id) ? true : upToDate
                })
                if (!upToDate) {
                    conversation.hasSeenLatestMessages.push(authData.id)
                    conversation.save((err) => {
                        if (err) return res.status(500).json({ message: err.message })
                    })
                }

                res.json(conversation);
            });
    })
})

//send message
router.post('/:_id', readToken, (req, res) => {
    let { content } = req.body
    if(!content){
        return res.status(400).json({ message: "Message content is missing"})
    }
    jwt.verify(req.token, config.secretKey, (err, authData) => {
        if (err) {
            return res.status(403).json({
                message: err.message
            })
        }
        Conversation.findById(req.params._id)
            .exec((err, conversation) => {
                if (err) return res.status(500).json({ message: err.message })
                if (!conversation) {
                    return res.status(404).json({ message: "Conversation not found" })
                }
                let isParticipant = false
                conversation.participants.forEach(participant => {
                    isParticipant = (participant == authData.id) ? true : isParticipant
                })
                if (!isParticipant) {
                    return res.status(403).json({ message: "User is not a participant in this conversation" })
                }
                let message = new Message({ content, sender: authData.id })
                message.save((err) => {
                    if (err) return res.status(500).json({ message: err.message })
                    conversation.messages.push(message._id)
                    conversation.last_activity = Date.now()
                    conversation.hasSeenLatestMessages = []
                    conversation.hasSeenLatestMessages.push(authData.id)
                    conversation.participants.forEach(_user => {
                        if (authData.id != _user) {
                            let event = {
                                type: 'message',
                                content: conversation._id
                            }
                            io.sockets.emit(_user, event)
                        }
                    })
                    conversation.save((err) => {
                        if (err) return res.status(500).json({ message: err.message })
                        res.status(201).json(message);
                    })
                })

            });
    })
})

module.exports = router