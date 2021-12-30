const express = require('express')
const { Conflict, Unauthorized } = require('http-errors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const gravatar = require('gravatar')
const path = require('path')
const fs = require('fs/promises')

const { auth } = require('../../middlewares/auth')
const { upload } = require('../../middlewares/upload')
const { User, userJoiSchema, subJoiSchema } = require('../../models/user')
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
    const hashPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10))
    const avatarURL = gravatar.url(email)
    await User.create({ email, password: hashPassword, avatarURL })

    res.status(201).json({
      status: 'success',
      code: 201,
      data: {
        user: {
          email,
          avatarURL,
          subscription: 'starter'
        }
      }
    })
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

    if (!user || !passCompare) {
      throw new Unauthorized('Email or password is wrong')
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
    await fs.rename(tempUpload, resultUpload)
    const avatarURL = path.join('public', 'avatars', imageName)
    await User.findByIdAndUpdate(_id, { avatarURL })
    res.json({ avatarURL })
  } catch (error) {
    await fs.unlink(tempUpload)
    next(error)
  }
})

module.exports = router
