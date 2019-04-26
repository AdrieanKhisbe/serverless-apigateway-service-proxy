'use strict'

const BbPromise = require('bluebird')
const _ = require('lodash')

module.exports = {
  async compileMethodsToS3() {
    this.validated.events.forEach(async (event) => {
      if (event.functionName == 's3') {
        const resourceId = this.getResourceId(event.http.path)
        const resourceName = this.getResourceName(event.http.path)

        const template = {
          Type: 'AWS::ApiGateway::Method',
          Properties: {
            HttpMethod: event.http.method.toUpperCase(),
            RequestParameters: {},
            AuthorizationType: 'NONE',
            ApiKeyRequired: Boolean(event.http.private),
            ResourceId: resourceId,
            RestApiId: this.provider.getApiGatewayRestApiId()
          }
        }

        _.merge(
          template,
          await this.getS3MethodIntegration(event.http),
          await this.getMethodResponses(event.http, [404])
        )

        const methodLogicalId = this.provider.naming.getMethodLogicalId(
          resourceName,
          event.http.method
        )

        this.apiGatewayMethodLogicalIds.push(methodLogicalId)

        _.merge(this.serverless.service.provider.compiledCloudFormationTemplate.Resources, {
          [methodLogicalId]: template
        })
      }
    })

    return BbPromise.resolve()
  },

  async getS3MethodIntegration(http) {
    let bucket = http.bucket
    if (typeof bucket == 'string') {
      bucket = `"${bucket}"`
    }
    const integration = {
      IntegrationHttpMethod: 'GET',
      Type: 'AWS',
      Credentials: {
        'Fn::GetAtt': ['ApigatewayToS3Role', 'Arn']
      },
      Uri: {
        'Fn::Join': [
          '',
          [
            'arn:aws:apigateway:',
            {
              Ref: 'AWS::Region'
            },
            ':s3:path/{bucket}/{object}'
          ]
        ]
      },
      RequestParameters: {
        'integration.request.path.bucket': {
          'Fn::Join': ["'", ['', bucket, '']]
        },
        'integration.request.path.object': 'method.request.path.proxy'
      },
      RequestTemplates: { 'application/json': '{statusCode:200}' }
    }

    const integrationResponse = {
      IntegrationResponses: [
        {
          StatusCode: 200,
          SelectionPattern: 200,
          ResponseParameters: {},
          ResponseTemplates: {}
        },
        {
          StatusCode: 400,
          SelectionPattern: 400,
          ResponseParameters: {},
          ResponseTemplates: {}
        },
        {
          StatusCode: 404,
          SelectionPattern: 403,
          ResponseTemplates: {
            'application/xml': `Path not found: /${http.path.replace(
              '/{proxy+}',
              ''
            )}/$input.params().get('path').get('proxy')`
          },
          ResponseParameters: {}
        }
      ]
    }

    if (http && http.cors) {
      let origin = http.cors.origin
      if (http.cors.origins && http.cors.origins.length) {
        origin = http.cors.origins.join(',')
      }

      integrationResponse.IntegrationResponses.forEach(async (val, i) => {
        integrationResponse.IntegrationResponses[i].ResponseParameters = {
          'method.response.header.Access-Control-Allow-Origin': `'${origin}'`
        }
      })
    }

    _.merge(integration, integrationResponse)

    return {
      Properties: {
        Integration: integration,
        RequestParameters: { 'method.request.path.proxy': true }
      }
    }
  }
}
