const { Schema, model } = require('mongoose')
const Joi = require('joi')

const userSchema = Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
  },
  subscription: {
    type: String,
    enum: ['starter', 'pro', 'business'],
    default: 'starter'
  },
  token: {
    type: String,
    default: null,
  },
  avatarURL: {
    type: String,
    required: true,
  },
  verify: {
    type: Boolean,
    default: false,
  },
  verificationToken: {
    type: String,
    required: [true, 'Verify token is required'],
  }
})

const userJoiSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required(),
  subscription: Joi.string(),
  token: Joi.string()
})

const subJoiSchema = Joi.object({
  subscription: Joi.string().valid('starter', 'pro', 'business').required()
})

const verifyJoiSchema = Joi.object({
  email: Joi.string().required()
})

const User = model('user', userSchema)

module.exports = {
  User,
  userJoiSchema,
  subJoiSchema,
  verifyJoiSchema
}
