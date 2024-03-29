const nodemailer = require('nodemailer')
const jade = require('jade')
const url = require('url');
const path = require('path')
const config = require('../config/config')

function resolveTemplatePath(filename) {
    return path.resolve(__dirname, `../emailTemplates/${filename}`);
}

function sendEmail(emailPayload) {
    if (process.env.NODE_ENV === 'production') {
        let transporter = nodemailer.createTransport(config.mail)
        transporter.sendMail(emailPayload, (err) => {
            if (err) {
                console.log('Error sending email', err);
            }
        });
    }else{
        if(process.env.NODE_ENV !== 'test'){
            console.log(emailPayload)
        }
    }

}

function sendAfterRegister(user, token) {
    const compile = jade.compileFile(resolveTemplatePath('afterRegister.tpl.jade'), { pretty: true });
    const htmlOut = compile({ link: url.resolve(config.frontendBaseUrl, `/confirm-account/${token}`) });
    const emailPayload = {
        to: user.email,
        from: config.mail.from,
        subject: 'Activate account on nodeBook',
        html: htmlOut
    };
    return sendEmail(emailPayload);
}

function sendPasswordReset(user, token) {
    const compile = jade.compileFile(resolveTemplatePath('passReset.tpl.jade'), { pretty: true });
    const htmlOut = compile({ name: user.first_name, link: url.resolve(config.frontendBaseUrl, `/reset-password/${token}`) });
    const emailPayload = {
        to: user.email,
        from: config.mail.from,
        subject: 'nodeBook - reset password',
        html: htmlOut
    };
    return sendEmail(emailPayload);
}

module.exports = {
    sendAfterRegister: sendAfterRegister,
    sendPasswordReset: sendPasswordReset
};