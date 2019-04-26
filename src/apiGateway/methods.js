'use strict'
const _ = require('lodash')

module.exports = {
  async getMethodResponses(http, extraStatus = []) {
    const methodResponse = {
      Properties: {
        MethodResponses: _.map([200, 400].concat(extraStatus), (status) => ({
          ResponseParameters: {},
          ResponseModels: {},
          StatusCode: status
        }))
      }
    }

    if (http && http.cors) {
      let origin = http.cors.origin
      if (http.cors.origins && http.cors.origins.length) {
        origin = http.cors.origins.join(',')
      }

      methodResponse.Properties.MethodResponses.forEach(async (val, i) => {
        methodResponse.Properties.MethodResponses[i].ResponseParameters = {
          'method.response.header.Access-Control-Allow-Origin': `'${origin}'`
        }
      })
    }

    return methodResponse
  }
}
