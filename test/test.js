process.env.NODE_ENV = 'test';

const assert = require('chai').assert
const request = require('supertest')

const app = require('../app')
const db = require('../config/db')
const User = require('../model/user');

describe('Registration simple tests', function () {
    this.timeout(5000);
    before((done) => {
        db.connect()
            .then(() => done())
            .catch((err) => done(err))
    })

    after((done) => {
        db.disconnect()
            .then(() => done())
            .catch((err) => done(err))
    })

    it('Getting Users, should return empty array', (done) => {
        request(app).get('/api/users')
            .then((res) => {
                assert.equal(res.body.length, 0, "Array should be empty")
                assert.equal(res.status, 200, "Status code should be 200")
                done();
            })
            .catch((err) => done(err))
    })

    it('Registering user, should succeed', (done) => {
        request(app).post('/api/users')
            .send({
                first_name: "Niko",
                last_name: "Bellic",
                email: "abc@email.com",
                password: "qwe123"
            })
            .then((res) => {
                assert.equal(res.status, 201, "Status code should be 201")
                assert.equal(res.body.first_name, "Niko", 
                "Name should be Niko")
                done()
            })
            .catch((err) => done(err))
    })

    it('Registering user without name, should fail and return 400',
     (done) => {
        request(app).post('/api/users')
            .send({
                email: "abc@email.com",
                password: "qwe123"
            })
            .then((res) => {
                assert.equal(res.status, 400, "Status code should be 400")
                done()
            })
            .catch((err) => done(err))
    })

    it('Registering user with taken email, should fail and return 409', (done) => {
        request(app).post('/api/users')
            .send({
                first_name: "Niko",
                last_name: "Bellic",
                email: "abc@email.com",
                password: "qwe123"
            })
            .then((res) => {
                assert.equal(res.status, 409, "Status code should be 409")
                done()
            })
            .catch((err) => done(err))
    })


})
describe('Functionality after login: accessing protected route', function () {
    this.timeout(5000);
    before((done) => {
        db.connect()
            .then(() => done())
            .catch((err) => done(err))
    })

    after((done) => {
        db.disconnect()
            .then(() => done())
            .catch((err) => done(err))
    })
    let user1 = {
        first_name: "Anton",
        last_name: "Fanton",
        email: "music@nerd.com",
        password: "jennydeth"
    }

    it('Try accessing protected route without valid token, should return 401', (done) => {
        //accessing protected route
        request(app).get('/api/me')
            .then((res) => {
                assert.equal(res.status, 401, "/api/me should return 401")
                done()
            })
            .catch((err) => done(err))
    })

    it('Register user and activate', (done) => {
        //registering user
        request(app).post('/api/users')
            .send(user1)
            .then((res) => {
                assert.equal(res.status, 201, "Status code should be 201")
                assert.equal(res.body.first_name, user1.first_name, "Name should be same as given in POST request")
                //activate user manually
                User.findById(res.body._id)
                    .exec((err, user) => {
                        assert.exists(user, 'User should exist in database')
                        user.activated = true
                        user.save()
                        done()
                    });
            })
            .catch((err) => done(err))
    })

    let token
    it('Log in and save access token', (done) => {
        //logging in
        request(app).post('/api/login')
            .send({
                email: user1.email,
                password: user1.password
            })
            .then((res) => {
                token = res.body.token
                assert.equal(res.status, 200, "/api/login should return 200")
                assert.exists(token, "Should receive a token")
                done()
            })
            .catch((err) => done(err))
    })

    it('Access protected route with valid token', (done) => {
        //accessing protected route
        request(app).get('/api/me')
            .set('Authorization', 'Bearer ' + token)
            .then((res) => {
                assert.equal(res.status, 200, "/api/me should return 200")
                assert.equal(res.body.first_name, user1.first_name, 
                    "Name of user should be same as name used to register")
                done()
            })
            .catch((err) => done(err))
    })

})

describe('Functionality after login: Posts, comments, likes', function () {
    this.timeout(5000);
    before((done) => {
        db.connect()
            .then(() => done())
            .catch((err) => done(err))
    })

    after((done) => {
        db.disconnect()
            .then(() => done())
            .catch((err) => done(err))
    })
    let user1 = {
        first_name: "Nick",
        last_name: "Demos",
        email: "nick@email.com",
        password: "qwe123"
    }
    let user1token
    let user1id
    let user2 = {
        first_name: "Enzo",
        last_name: "Gorlomi",
        email: "enzo@email.com",
        password: "asd%PPP199"
    }
    let user2token
    let user2id
    it('Register and activate 1st user', (done) => {
        //registering user
        request(app).post('/api/users')
            .send(user1)
            .then((res) => {
                assert.equal(res.status, 201, "Status code should be 201")
                user1id = res.body._id
                //activating user manually
                User.findById(user1id)
                    .exec((err, user) => {
                        assert.exists(user, 'User should exist in database')
                        user.activated = true
                        user.save()
                        done()
                    });
            })
            .catch((err) => done(err))
    })
    it('Register and activate 2nd user', (done) => {
        //registering user
        request(app).post('/api/users')
            .send(user2)
            .then((res) => {
                assert.equal(res.status, 201, "Status code should be 201")
                user2id = res.body._id
                //activating user manually
                User.findById(user2id)
                    .exec((err, user) => {
                        assert.exists(user, 'User should exist in database')
                        user.activated = true
                        user.save()
                        done()
                    });
            })
            .catch((err) => done(err))

    })

    it('Log in as 1st user and save access token', (done) => {
        //logging in
        request(app).post('/api/login')
            .send({
                email: user1.email,
                password: user1.password
            })
            .then((res) => {
                assert.equal(res.status, 200, "/api/login should return 200")
                assert.exists(res.body.token, "Should receive a token")
                user1token = res.body.token
                done()
            })
            .catch((err) => done(err))
    })
    it('Log in as 2nd user and save access token', (done) => {
        //logging in
        request(app).post('/api/login')
            .send({
                email: user2.email,
                password: user2.password
            })
            .then((res) => {
                assert.equal(res.status, 200, "/api/login should return 200")
                assert.exists(res.body.token, "Should receive a token")
                user2token = res.body.token
                done()
            })
            .catch((err) => done(err))
    })
    let postId
    it('as 1st user: Create a post', (done) => {
        request(app).post('/api/posts')
            .set('Authorization', 'Bearer ' + user1token)
            .send({
                content: "hello world"
            })
            .then((res) => {
                assert.equal(res.status, 201, "Creating post should return 201")
                assert.equal(res.body.author, user1id, "ID of author should be the ID of user")
                postId = res.body._id
                done()
            })
            .catch((err) => done(err))
    })

    it('as 1st user: Edit a post', (done) => {
        request(app).put('/api/posts/' + postId)
            .set('Authorization', 'Bearer ' + user1token)
            .send({
                content: "Hello World!"
            })
            .then((res) => {
                assert.equal(res.status, 200, "Editing post should return 200")
                assert.equal(res.body.content, "Hello World!", "Content of post should be changed")
                assert.equal(res.body.edit_history.length, 1, "Post edit history should have one element")
                done()
            })
            .catch((err) => done(err))
    })

    it('as 2nd user: read 1st user\'s post', (done) => {
        request(app).get('/api/posts/' + postId)
            .set('Authorization', 'Bearer ' + user2token)
            .then((res) => {
                assert.equal(res.status, 200, "Getting post should return 200")
                assert.equal(res.body.author.first_name, user1.first_name, "Name of post author should be the name of user1")
                assert.equal(res.body.content, "Hello World!", "Content of post should be changed")
                assert.equal(res.body.edit_history.length, 1, "Post edit history should have one element")
                done()
            })
            .catch((err) => done(err))
    })
    it('as 2nd user: like 1st user\'s post', (done) => {
        request(app).post('/api/posts/' + postId + '/like')
            .set('Authorization', 'Bearer ' + user2token)
            .then((res) => {
                assert.equal(res.status, 200, "Liking post should return 200")
                assert.equal(res.body.likesAmount, 1, "Number of likes should be 1")
                done()
            })
            .catch((err) => done(err))
    })
    it('as 1st user: check likes and comments on post', (done) => {
        request(app).get('/api/posts/' + postId)
            .set('Authorization', 'Bearer ' + user1token)
            .then((res) => {
                assert.equal(res.status, 200, "Getting post should return 200")
                assert.equal(res.body.likesAmount, 1, "Number of likes should be 1")
                assert.equal(res.body.likes[0].first_name, user2.first_name, "Name of user liking should be the name of user2")
                assert.equal(res.body.commentsAmount, 0, "Number of comments should be 0")
                done()
            })
            .catch((err) => done(err))
    })
    it('as 2nd user: unlike 1st user\'s post', (done) => {
        request(app).post('/api/posts/' + postId + '/like')
            .set('Authorization', 'Bearer ' + user2token)
            .then((res) => {
                assert.equal(res.status, 200, "Liking post should return 200")
                assert.equal(res.body.likesAmount, 0, "Number of likes should be 0")
                done()
            })
            .catch((err) => done(err))
    })

    let commentId
    it('as 2nd user: comment on 1st user\'s post', (done) => {
        request(app).post('/api/posts/' + postId + '/comments')
            .set('Authorization', 'Bearer ' + user2token)
            .send({
                content: `Hello ${user1.first_name}`
            })
            .then((res) => {
                assert.equal(res.status, 201, 
                    "Commenting post should return 201")
                commentId = res.body._id
                done()
            })
            .catch((err) => done(err))
    })
    it('as 1st user: check likes and comments on post again', (done) => {
        request(app).get('/api/posts/' + postId)
            .set('Authorization', 'Bearer ' + user1token)
            .then((res) => {
                assert.equal(res.status, 200, "Getting post should return 200")
                assert.equal(res.body.likesAmount, 0, "Number of likes should be 0")
                assert.equal(res.body.commentsAmount, 1, "Number of comments should be 1")
                assert.equal(res.body.comments[0].author._id, user2id, "ID of comment author should be the ID of user2")
                assert.equal(res.body.comments[0].content, `Hello ${user1.first_name}`, "Comment content should match content sent by user2")
                done()
            })
            .catch((err) => done(err))
    })
    it('as 1st user: like 2nd user\'s comment', (done) => {
        request(app).post('/api/comments/' + commentId + '/like')
            .set('Authorization', 'Bearer ' + user1token)
            .then((res) => {
                assert.equal(res.status, 200, "Liking comment should return 200")
                assert.equal(res.body.likesAmount, 1, "Number of likes should be 1")
                done()
            })
            .catch((err) => done(err))
    })

})

describe('Functionality after login: Following, news feed', function () {
    this.timeout(5000);
    before((done) => {
        db.connect()
            .then(() => done())
            .catch((err) => done(err))
    })

    after((done) => {
        db.disconnect()
            .then(() => done())
            .catch((err) => done(err))
    })
    let user1 = {
        first_name: "Nick",
        last_name: "Demos",
        email: "nick@email.com",
        password: "qwe123"
    }
    let user1token
    let user1id
    let user2 = {
        first_name: "Enzo",
        last_name: "Gorlomi",
        email: "enzo@email.com",
        password: "asd%PPP199"
    }
    let user2token
    let user2id
    it('Register and activate 1st user', (done) => {
        //registering user
        request(app).post('/api/users')
            .send(user1)
            .then((res) => {
                assert.equal(res.status, 201, "Status code should be 201")
                user1id = res.body._id
                //activating user manually
                User.findById(user1id)
                    .exec((err, user) => {
                        assert.exists(user, 'User should exist in database')
                        user.activated = true
                        user.save()
                        done()
                    });
            })
            .catch((err) => done(err))
    })
    it('Register and activate 2nd user', (done) => {
        //registering user
        request(app).post('/api/users')
            .send(user2)
            .then((res) => {
                assert.equal(res.status, 201, "Status code should be 201")
                user2id = res.body._id
                //activating user manually
                User.findById(user2id)
                    .exec((err, user) => {
                        assert.exists(user, 'User should exist in database')
                        user.activated = true
                        user.save()
                        done()
                    });
            })
            .catch((err) => done(err))

    })

    it('Log in as 1st user and save access token', (done) => {
        //logging in
        request(app).post('/api/login')
            .send({
                email: user1.email,
                password: user1.password
            })
            .then((res) => {
                assert.equal(res.status, 200, "/api/login should return 200")
                assert.exists(res.body.token, "Should receive a token")
                user1token = res.body.token
                done()
            })
            .catch((err) => done(err))
    })
    it('Log in as 2nd user and save access token', (done) => {
        //logging in
        request(app).post('/api/login')
            .send({
                email: user2.email,
                password: user2.password
            })
            .then((res) => {
                assert.equal(res.status, 200, "/api/login should return 200")
                assert.exists(res.body.token, "Should receive a token")
                user2token = res.body.token
                done()
            })
            .catch((err) => done(err))
    })
    it('as 1st user: follow 2nd user', (done) => {
        request(app).post('/api/users/'+user2id+'/follow')
            .set('Authorization', 'Bearer ' + user1token)
            .then((res) => {
                assert.equal(res.status, 201, 
                    "Following user should return 201")
                assert.equal(res.body.followee, user2id, 
                    "Followee ID should match User2 ID")
                done()
            })
            .catch((err) => done(err))
    })

    it('as 2nd user: check followers', (done) => {
        request(app).get('/api/me/follows')
            .set('Authorization', 'Bearer ' + user2token)
            .then((res) => {
                assert.equal(res.status, 200, 
                    "api/me/follows should return 200")
                assert.equal(res.body.followersAmount, 1, 
                    "Should have one follower")
                assert.equal(res.body.followers[0].first_name, 
                    user1.first_name, 
                    "Name of the follower should be the name of user1")
                done()
            })
            .catch((err) => done(err))
    })

    it('as 1st user: unfollow 2nd user', (done) => {
        request(app).post('/api/users/'+user2id+'/follow')
            .set('Authorization', 'Bearer ' + user1token)
            .then((res) => {
                assert.equal(res.status, 200, "Unfollowing user should return 200")
                done()
            })
            .catch((err) => done(err))
    })

    it('as 2nd user: check followers again', (done) => {
        request(app).get('/api/me/follows')
            .set('Authorization', 'Bearer ' + user2token)
            .then((res) => {
                assert.equal(res.status, 200, "api/me/follows should return 200")
                assert.equal(res.body.followersAmount, 0, "Should have NO followers")
                done()
            })
            .catch((err) => done(err))
    })
})

describe('Functionality after login: Conversations', function () {
    this.timeout(5000);
    before((done) => {
        db.connect()
            .then(() => done())
            .catch((err) => done(err))
    })

    after((done) => {
        db.disconnect()
            .then(() => done())
            .catch((err) => done(err))
    })
    let user1 = {
        first_name: "Nick",
        last_name: "Demos",
        email: "nick@email.com",
        password: "qwe123"
    }
    let user1token
    let user1id
    let user2 = {
        first_name: "Enzo",
        last_name: "Gorlomi",
        email: "enzo@email.com",
        password: "asd%PPP199"
    }
    let user2token
    let user2id
    it('Register and activate 1st user', (done) => {
        //registering user
        request(app).post('/api/users')
            .send(user1)
            .then((res) => {
                assert.equal(res.status, 201, "Status code should be 201")
                user1id = res.body._id
                //activating user manually
                User.findById(user1id)
                    .exec((err, user) => {
                        assert.exists(user, 'User should exist in database')
                        user.activated = true
                        user.save()
                        done()
                    });
            })
            .catch((err) => done(err))
    })
    it('Register and activate 2nd user', (done) => {
        //registering user
        request(app).post('/api/users')
            .send(user2)
            .then((res) => {
                assert.equal(res.status, 201, "Status code should be 201")
                user2id = res.body._id
                //activating user manually
                User.findById(user2id)
                    .exec((err, user) => {
                        assert.exists(user, 'User should exist in database')
                        user.activated = true
                        user.save()
                        done()
                    });
            })
            .catch((err) => done(err))

    })

    it('Log in as 1st user and save access token', (done) => {
        //logging in
        request(app).post('/api/login')
            .send({
                email: user1.email,
                password: user1.password
            })
            .then((res) => {
                assert.equal(res.status, 200, "/api/login should return 200")
                assert.exists(res.body.token, "Should receive a token")
                user1token = res.body.token
                done()
            })
            .catch((err) => done(err))
    })
    it('Log in as 2nd user and save access token', (done) => {
        //logging in
        request(app).post('/api/login')
            .send({
                email: user2.email,
                password: user2.password
            })
            .then((res) => {
                assert.equal(res.status, 200, "/api/login should return 200")
                assert.exists(res.body.token, "Should receive a token")
                user2token = res.body.token
                done()
            })
            .catch((err) => done(err))
    })
    let convId
    it('as 1st user: create conversation with 2nd user', (done) => {
        request(app).post('/api/conversations/')
            .set('Authorization', 'Bearer ' + user1token)
            .send({
                participants: [user2id]
            })
            .then((res) => {
                convId = res.body._id
                assert.equal(res.status, 201,
                    "Creating conv sould return 201")
                assert.equal(res.body.participants.length, 2,
                    "Conv participants collection should have 2 users")
                done()
            })
            .catch((err) => done(err))
    })
    it('as 2nd user: check conversations', (done) => {
        request(app).get('/api/conversations/')
            .set('Authorization', 'Bearer ' + user2token)
            .then((res) => {
                assert.equal(res.status, 200,
                    "Getting convos sould return 200")
                assert.equal(res.body.length, 1,
                    "Conv array should have one element")
                assert.equal(res.body[0]._id, convId,
                    "Conv id should match created conv id")
                done()
            })
            .catch((err) => done(err))
    })
    it('as 2nd user: send empty message, should fail', (done) => {
        request(app).post('/api/conversations/' + convId)
            .set('Authorization', 'Bearer ' + user2token)
            .then((res) => {
                assert.equal(res.status, 400,
                    "Sending message should return 400")
                done()
            })
            .catch((err) => done(err))
    })
    it('as 2nd user: send message', (done) => {
        request(app).post('/api/conversations/' + convId)
            .set('Authorization', 'Bearer ' + user2token)
            .send({
                content: "Hello"
            })
            .then((res) => {
                assert.equal(res.status, 201,
                    "Sending message should return 201")
                assert.equal(res.body.content, "Hello",
                    "Message content should be \"Hello\"")
                done()
            })
            .catch((err) => done(err))
    })
    it('as 1st user: check conversations', (done) => {
        request(app).get('/api/conversations/')
            .set('Authorization', 'Bearer ' + user1token)
            .then((res) => {
                assert.equal(res.status, 200,
                    "Getting convos sould return 200")
                assert.equal(res.body[0].read, "false",
                    "Conversation should be marked as unread")
                done()
            })
            .catch((err) => done(err))
    })
    it('as 1nd user: read conv', (done) => {
        request(app).get('/api/conversations/' + convId)
            .set('Authorization', 'Bearer ' + user1token)
            .then((res) => {
                assert.equal(res.status, 200,
                    "Reading conv should return 200")
                assert.equal(res.body.messages[0].content, "Hello",
                    "Message content should be \"Hello\"")
                assert.equal(res.body.messages[0].sender._id, user2id,
                    "Message author id should be user2 id")
                done()
            })
            .catch((err) => done(err))
    })
    it('as 1st user: check conversations again', (done) => {
        request(app).get('/api/conversations/')
            .set('Authorization', 'Bearer ' + user1token)
            .then((res) => {
                assert.equal(res.status, 200,
                    "Getting convos sould return 200")
                assert.equal(res.body[0].read, "true",
                    "Conversation should be marked as read")
                done()
            })
            .catch((err) => done(err))
    })

})