const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt');
const saltRounds = 10;

const User = require('../model/user');
const Token = require('../model/token');
const Password = require('../model/password')

router.post('/:_token', (req, res) => {
    Token.findOne({ token: req.params._token })
        .exec((err, tokenObj) => {
            if (err) {
                return res.status(500).json({ message: err.message })
            };
            if (!tokenObj) {
                return res.status(404).json({ message: "Token not recognized" })
            }
            User.findById(tokenObj.user)
                .exec((err, user) => {
                    if (err) {
                        return res.status(500).json({ message: err.message })
                    };
                    if (!user) {
                        return res.status(404).json({ message: "User not found" })
                    }
                    Password.findOne({ user: user.id }).exec((err, _password) => {
                        if (err) {
                            return res.status(500).json({ message: err.message })
                        };
                        const { password } = req.body;
                        if(!password){
                            return res.status(400).json({
                                message: "Please provide all required parameters"
                            })
                        }
                        bcrypt.hash(password, saltRounds, (err, hash) => {
                            if (err) return res.status(500).json({ message: err.message })
                            _password.password = hash
                            _password.save((err) => {
                                if (err) return res.status(500).json({ message: err.message })
                                tokenObj.token = null
                                tokenObj.save((err) => {
                                    if (err) return res.status(500).json({ message: err.message })
                                    res.status(200).json(user);
                                })
                            })
                        })
                    })

                });
        })
})
module.exports = router