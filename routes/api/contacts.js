const express = require('express')
const router = express.Router()
const { NotFound } = require('http-errors')
const { joiSchema, Contact, favoriteJoiSchema } = require('../../models/contact')
const { auth } = require('../../middlewares/auth')

router.get('/', auth, async (req, res, next) => {
  try {
    const { _id } = req.user

    /* Дополнительные задание 1, 2 */

    const { page = 1, limit = 10, favorite } = req.query
    const skip = (page - 1) * limit
    const contacts = await Contact.find({ owner: _id, favorite: favorite }, '', { skip, limit: Number(limit) }).populate('owner', 'email subscription')
    res.json({
      status: 'success',
      code: 200,
      data: {
        result: contacts
      }
    })
  } catch (error) {
    next(error)
  }
})

router.get('/:contactId', auth, async (req, res, next) => {
  try {
    const { contactId } = req.params
    const result = await Contact.findById(contactId).populate('owner', 'email subscription')
    if (!result) {
      throw new NotFound(`Product with id=${contactId} not found`)
    }
    res.json({
      status: 'success',
      code: 200,
      data: {
        result
      }
    })
  } catch (error) {
    next(error)
  }
})

router.post('/', auth, async (req, res, next) => {
  try {
    const { error } = joiSchema.validate(req.body)
    if (error) {
      error.status = 400
      throw error
    }
    const { _id } = req.user
    const result = await Contact.create({ ...req.body, owner: _id })
    res.status(201).json({
      status: 'success',
      code: 201,
      data: {
        result
      }
    })
  } catch (error) {
    next(error)
  }
})

router.delete('/:contactId', async (req, res, next) => {
  try {
    const { contactId } = req.params
    const result = await Contact.findByIdAndRemove(contactId)
    if (!result) {
      throw new NotFound(`Product with id=${contactId} not found`)
    }
    res.json({
      status: 'success',
      code: 200,
      message: 'contact deleted',
      data: {
        result
      }
    })
  } catch (error) {
    next(error)
  }
})

router.put('/:contactId', async (req, res, next) => {
  try {
    const { error } = joiSchema.validate(req.body)
    if (error) {
      error.status = 400
      throw error
    }
    const { contactId } = req.params
    const result = await Contact.findByIdAndUpdate(contactId, req.body, { new: true })
    if (!result) {
      throw new NotFound(`Product with id=${contactId} not found`)
    }
    res.json({
      status: 'success',
      code: 200,
      message: 'product updated',
      data: {
        result
      }
    })
  } catch (error) {
    next(error)
  }
})

router.patch('/:contactId/favorite', async (req, res, next) => {
  try {
    const { error } = favoriteJoiSchema.validate(req.body)
    if (error) {
      error.status = 400
      error.message = 'missing field favorite'
      throw error
    }
    const { contactId } = req.params
    const { favorite } = req.body
    const result = await Contact.findByIdAndUpdate(contactId, { favorite }, { new: true })
    if (!result) {
      throw new NotFound(`Product with id=${contactId} not found`)
    }
    res.json({
      status: 'success',
      code: 200,
      message: 'product updated',
      data: {
        result
      }
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
