module.exports = function readToken (req, res, next) {
    //get auth header value
    const bearerHeader = req.get('authorization');

    if (typeof bearerHeader !== 'undefined') {
        // get token
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];
        // pass token to req
        req.token = bearerToken;
        next();
    } else {
        // Forbidden
        res.sendStatus(401);
    }
}