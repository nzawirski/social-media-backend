const express = require('express')
const router = express.Router()
const config = require('../config/config')

const User = require('../model/user');
const Token = require('../model/token');

router.get('/:_token', (req, res) => {
    Token.findOne({ token: req.params._token })
        .exec((err, tokenObj) => {
            if (err) {
                return res.status(500).json({ message: err.message })
            };
            if (!tokenObj) {
                return res.status(404).send("Token not recognized")
            }
            User.findById(tokenObj.user)
                .exec((err, user) => {
                    if (err) {
                        return res.status(500).json({ message: err.message })
                    };
                    if (!user) {
                        return res.status(404).json({ message: "User not found"})
                    }
                    user.activated = true
                    user.save((err) => {
                        if (err) return res.status(500).json({ message: err.message })
                        tokenObj.token = null
                        tokenObj.save((err) => {
                            if (err) return res.status(500).json({ message: err.message }) 
                            res.status(200).json(user);
                        })
                    })
                });
        })
})
module.exports = router