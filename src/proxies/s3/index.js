const _ = require('lodash')

const compileMethods = require('./compileMethods')
const compileIamRole = require('./compileIamRole')
const validateServiceProxy = require('./validateServiceProxy')
const compileServiceProxy = require('./compileServiceProxy')

module.export = _.assign(
  {},
  compileIamRole,
  compileServiceProxy,
  compileMethods,
  validateServiceProxy
)
