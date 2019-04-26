'use strict'
const _ = require('lodash')
const BbPromise = require('bluebird')

module.exports = {
  async compileIamRoleToS3() {
    await BbPromise.all(
      this.getAllServiceProxies().map(async (serviceProxy) => {
        Object.keys(serviceProxy).forEach(async (serviceName) => {
          if (serviceName == 's3') {
            const template = {
              Type: 'AWS::IAM::Role',
              Properties: {
                AssumeRolePolicyDocument: {
                  Version: '2012-10-17',
                  Statement: [
                    {
                      Effect: 'Allow',
                      Principal: {
                        Service: 'apigateway.amazonaws.com'
                      },
                      Action: 'sts:AssumeRole'
                    }
                  ]
                },
                Policies: [
                  {
                    PolicyName: 'apigatewaytos3',
                    PolicyDocument: {
                      Version: '2012-10-17',
                      Statement: [
                        {
                          Effect: 'Allow',
                          Action: ['s3:GetObject'],
                          Resource: '*'
                        }
                      ]
                    }
                  }
                ]
              }
            }

            _.merge(this.serverless.service.provider.compiledCloudFormationTemplate.Resources, {
              ApigatewayToS3Role: template
            })
          }
        })
      })
    )
  }
}
