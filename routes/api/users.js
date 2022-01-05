const express = require('express')
const { Conflict, Unauthorized, NotFound } = require('http-errors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const gravatar = require('gravatar')
const path = require('path')
const fs = require('fs/promises')
const Jimp = require('jimp')
const { nanoid } = require('nanoid')

const { auth } = require('../../middlewares/auth')
const { upload } = require('../../middlewares/upload')
const { User, userJoiSchema, subJoiSchema, verifyJoiSchema } = require('../../models/user')
const sendEmail = require('../../helpers/sendEmail')

const { SECRET_KEY } = process.env

const router = express.Router()

router.post('/signup', async (req, res, next) => {
  try {
    const { error } = userJoiSchema.validate(req.body)
    if (error) {
      error.status = 400
      throw error
    }

    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (user) {
      throw new Conflict('Email in use')
    }
    const verificationToken = nanoid()
    const hashPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10))
    const avatarURL = gravatar.url(email)

    await User.create({ email, password: hashPassword, avatarURL, verificationToken })

    const verificationMail = {
      to: email,
      subject: 'Verification mail',
      text: 'Click for verivication',
      html: `<a target="_blank" href = "http://localhost:3000/api/users/verify/${verificationToken}">Click for verivication</a>`,
    }

    await sendEmail(verificationMail)

    res.status(201).json({
      status: 'success',
      code: 201,
      data: {
        user: {
          email,
          avatarURL,
          verificationToken,
          subscription: 'starter'
        }
      }
    })
  } catch (error) {
    next(error)
  }
})

router.get('/verify/:verificationToken', async (req, res, next) => {
  try {
    const { verificationToken } = req.params
    const user = await User.findOne({ verificationToken })
    if (!user) {
      throw NotFound()
    }
    await User.findByIdAndUpdate(user._id, { verify: true, verificationToken: null })

    res.status(200).json({
      message: 'Verification successful'
    })
  } catch (error) {
    next(error)
  }
})

router.post('/verify', async (req, res, next) => {
  try {
    const { error } = verifyJoiSchema.validate(req.body)
    if (error) {
      error.status = 400
      throw error
    }

    const { email } = req.body
    const { verificationToken } = req.params

    const verificationMail = {
      to: email,
      subject: 'Verification mail',
      text: 'Click for verivication',
      html: `<a target="_blank" href = "http://localhost:3000/api/users/verify/${verificationToken}">Click for verivication</a>`,
    }

    const user = await User.findOne({ email })

    if (!user) {
      throw NotFound()
    }

    if (!user.verify) {
      await sendEmail(verificationMail)

      res.status(200).json({
        message: 'Verification email sent'
      })
    } else {
      res.status(400).json({
        message: 'Verification has already been passed'
      })
    }
  } catch (error) {
    next(error)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const { error } = userJoiSchema.validate(req.body)
    if (error) {
      error.status = 400
      throw error
    }

    const { email, password } = req.body

    const user = await User.findOne({ email })
    const passCompare = bcrypt.compareSync(password, user.password)

    if (!user || !passCompare || !user.verify) {
      throw new Unauthorized('Email or password is wrong or email is not verify')
    }

    const payload = {
      id: user._id
    }

    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '3h' })
    await User.findByIdAndUpdate(user._id, { token })
    res.json({
      status: 'success',
      code: 200,
      data: {
        token
      }
    })
  } catch (error) {
    next(error)
  }
})

router.post('/logout', auth, async (req, res, next) => {
  try {
    const { _id } = req.user
    await User.findByIdAndUpdate(_id, { token: null })
    res.status(204).json()
  } catch (error) {
    next(error)
  }
})

router.get('/current', auth, async (req, res, next) => {
  try {
    const { email, subscription } = req.user
    res.json({
      status: 'success',
      code: 200,
      data: {
        user: {
          email,
          subscription
        }
      }
    })
  } catch (error) {
    next(error)
  }
})

router.patch('/', auth, async(req, res, next) => {
  try {
    const { error } = subJoiSchema.validate(req.body)
    if (error) {
      error.status = 400
      throw error
    }
    const { _id } = req.user
    const { subscription } = req.body
    const result = await User.findByIdAndUpdate(_id, { subscription }, { new: true })
    res.json({
      status: 'success',
      code: 200,
      message: 'subscription updated',
      data: {
        result
      }
    })
  } catch (error) {
    next(error)
  }
})

router.patch('/avatars', auth, upload.single('avatar'), async(req, res, next) => {
  const { path: tempUpload, originalname } = req.file
  const avatarDir = path.join(__dirname, '../../', 'public', 'avatars')
  const { _id } = req.user
  const imageName = `${_id}_${originalname}`
  try {
    const resultUpload = path.join(avatarDir, imageName)
    Jimp.read(tempUpload)
      .then(image => {
        image.resize(250, 250).write(resultUpload)
      })
      .catch(err => {
        next(err)
      })
    await fs.rename(tempUpload, resultUpload)
    const avatarURL = path.join('public', 'avatars', imageName)
    // await User.findByIdAndUpdate(_id, { avatarURL })
    res.json({ avatarURL })
  } catch (error) {
    await fs.unlink(tempUpload)
    next(error)
  }
})

module.exports = router
