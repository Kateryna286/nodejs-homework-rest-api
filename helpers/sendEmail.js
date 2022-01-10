const sgMail = require('@sendgrid/mail')
require('dotenv').config()

const { SENDGRID_API_KEY } = process.env

sgMail.setApiKey(SENDGRID_API_KEY)

const sendEmail = (data) => {
  const email = { ...data, from: 'katyakarpova@gmail.com' }
  sgMail.send(email)
    .then(() => { console.log('Email sent') })
    .catch(error => {
      console.log(error.message)
    })
}

module.exports = sendEmail

// const email = {
//   to: 'casotoc925@unigeol.com',
//   from: 'katyakarpova@gmail.com',
//   subject: 'Sending with SendGrid is Fun',
//   text: 'and easy to do anywhere, even with Node.js',
//   html: '<strong>and easy to do anywhere, even with Node.js</strong>',
// }

// sgMail.send(email)
//   .then(() => { console.log('Email sent') })
//   .catch(error => {
//     console.log(error.message)
//   })
