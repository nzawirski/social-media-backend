const express = require('express')
const router = express.Router()
const config = require('../config/config')
const jwt = require('jsonwebtoken')

const readToken = require('../utils/read-token')

const User = require('../model/user');
const Notification = require('../model/notification')

router.get('/:_id', readToken, (req, res) => {

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
                    return res.status(404).json({ message: "User not found" })
                }
                Notification.findById(req.params._id)
                .populate("who")
                .exec((err, notification) => {
                    if (err) {
                        return res.status(500).json({ message: err.message })
                    };
                    if (!notification) {
                        return res.status(404).json({ message: "Notification not found"})
                    }
                    if(notification.receiver != authData.id){
                        return res.status(401).json({ message:"User is not authorised to see this"})
                    }
                    notification.read = true
                    notification.save((err) => {
                        if (err) {
                            return res.status(500).json({ message: err.message })
                        };
                        res.json(notification);
                    })
                })
                
            })
    })
})

module.exports = router