const express = require('express')
const router = express.Router()
const config = require('../config/config')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt');
const saltRounds = 10;

const User = require('../model/user');

const Password = require('../model/password')


//List of users
router.get('/', (req, res) => {
    User.find({ activated: true }, (err, users) => {
        if (err) return res.status(500).json({ message: err.message })
        res.json(users);
    });
})

//register
router.post('/', (req, res) => {
    const { first_name, last_name, email, password} = req.body;

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
            return res.status(409).json({ message: "User already exists"})
        }
        bcrypt.hash(password, saltRounds, (err, hash) => {
            if (err) return res.status(500).json({ message: err.message })

            //set user details
            let user = new User({ first_name, last_name, email })

            //save user
            user.save((err, user) => {
                if (err) return res.status(500).json({ message: err.message })
                //save password
                let password = new Password({ user: user._id, password: hash })
                password.save((err) => {
                    if (err) return res.status(500).json({ message: err.message })
                })
                res.status(201).json(user);
            })
        })
    })
})

module.exports = router