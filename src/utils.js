'use strict'

const _ = require('lodash')

module.exports = {
  getAllServiceProxies() {
    const proxies = _.get(this, 'serverless.service.custom.apiGatewayServiceProxies')
    return proxies || []
  },
  haveServiceProxy() {
    return !_.isEmpty(this.getAllServiceProxies())
  }
}
