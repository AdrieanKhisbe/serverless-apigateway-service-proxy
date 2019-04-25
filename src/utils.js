'use strict'

function getAllServiceProxies() {
  if (this.serverless.service.custom && this.serverless.service.custom.apiGatewayServiceProxies) {
    return this.serverless.service.custom.apiGatewayServiceProxies
  }
  return []
}
module.exports = {
  getAllServiceProxies,
  haveServiceProxy() {
    return getAllServiceProxies().length > 0
  }
}
