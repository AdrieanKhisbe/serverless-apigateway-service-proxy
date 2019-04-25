'use strict'

const BbPromise = require('bluebird')
const _ = require('lodash')

module.exports = {
  async validateS3ServiceProxy() {
    await BbPromise.all(
      this.validated.events.map(async (serviceProxy) => {
        const bucket = serviceProxy.http.bucket
        if (serviceProxy.functionName == 's3') {
          if (!bucket) {
            return BbPromise.reject(
              new this.serverless.classes.Error('Missing "bucket" property in S3 Service Proxy')
            )
          }

          if (
            (typeof bucket != 'object' && typeof bucket != 'string') ||
            (typeof bucket == 'object' && !_.has(bucket, 'Ref'))
          ) {
            const errorMessage = [
              'You can only set "string" or the AWS "Ref" intrinsic function',
              ' like { Ref: "SomeBucket"} as bucket property'
            ].join('')
            return BbPromise.reject(new this.serverless.classes.Error(errorMessage))
          }
        }
      })
    )
  }
}
