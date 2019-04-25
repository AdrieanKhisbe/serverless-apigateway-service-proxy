'use strict'
const chalk = require('chalk')
const BbPromise = require('bluebird')
const _ = require('lodash')

const utils = require('./utils')
const validate = require('./apiGateway/validate')
const methods = require('./apiGateway/methods')
const compileRestApi = require('serverless/lib/plugins/aws/package/compile/events/apiGateway/lib/restApi')
const compileResources = require('serverless/lib/plugins/aws/package/compile/events/apiGateway/lib/resources')
const compileCors = require('serverless/lib/plugins/aws/package/compile/events/apiGateway/lib/cors')
const compileDeployment = require('serverless/lib/plugins/aws/package/compile/events/apiGateway/lib/deployment')
const getStackInfo = require('serverless/lib/plugins/aws/info/getStackInfo')

const kinesisProxy = require('./proxies/kinesis')
const sqsProxy = require('./proxies/sqs')

const proxies = [kinesisProxy, sqsProxy]

class ServerlessApigatewayServiceProxy {
  constructor(serverless, options) {
    this.serverless = serverless
    this.options = options || {}
    this.provider = this.serverless.getProvider('aws')
    this.service = this.serverless.service.service
    this.region = this.provider.getRegion()
    this.stage = this.provider.getStage()
    this.apiGatewayMethodLogicalIds = []
    Object.assign(
      this,
      compileRestApi,
      compileResources,
      compileCors,
      compileDeployment,
      getStackInfo,
      validate,
      methods,
      utils
    )
    proxies.forEach((proxy) => Object.assign(this, proxy))

    this.hooks = {
      'package:compileEvents': async () => {
        if (this.haveServiceProxy()) {
          this.validated = await this.validateServiceProxies()
          await this.compileRestApi()
          await this.compileResources()
          await this.compileCors()

          // Proxies
          await this.compileKinesisServiceProxy()
          await this.compileSqsServiceProxy()

          await this.mergeDeployment()
        }
      },
      'after:deploy:deploy': async () => {
        if (this.haveServiceProxy()) {
          await this.getStackInfo()
          await this.display()
        }
      }
    }
  }

  async mergeDeployment() {
    let exists = false
    Object.keys(this.serverless.service.provider.compiledCloudFormationTemplate.Resources).forEach(
      async (resource) => {
        if (
          this.serverless.service.provider.compiledCloudFormationTemplate.Resources[resource][
            'Type'
          ] == 'AWS::ApiGateway::Deployment'
        ) {
          exists = true
          this.serverless.service.provider.compiledCloudFormationTemplate.Resources[resource][
            'DependsOn'
          ] = this.serverless.service.provider.compiledCloudFormationTemplate.Resources[resource][
            'DependsOn'
          ].concat(this.apiGatewayMethodLogicalIds)
        }
      }
    )

    if (!exists) {
      await this.compileDeployment()
    }
  }

  async display() {
    let message = ''
    let serviceProxyMessages = ''
    const info = this.gatheredData.info
    const endpointInfo = _.get(info, 'endpoint', _.get(info, 'endpoints[0]'))
    message += `${chalk.yellow.underline('Serverless APIGateway Service Proxy OutPuts')}\n`
    message += `${chalk.yellow('endpoints:')}`

    await BbPromise.all(
      this.getAllServiceProxies().map(async (serviceProxy) => {
        Object.keys(serviceProxy).forEach(async (serviceName) => {
          let path
          const method = serviceProxy[serviceName].method.toUpperCase()
          path = serviceProxy[serviceName].path
          path =
            path !== '/'
              ? `/${path
                  .split('/')
                  .filter((p) => p !== '')
                  .join('/')}`
              : ''
          serviceProxyMessages += `\n  ${method} - ${endpointInfo}${path}`
        })
      })
    )

    if (_.isEmpty(serviceProxyMessages)) {
      return ''
    }

    message += serviceProxyMessages
    message += '\n'

    this.serverless.cli.consoleLog(message)

    return message
  }
}

module.exports = ServerlessApigatewayServiceProxy
