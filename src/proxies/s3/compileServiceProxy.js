'use strict'
module.exports = {
  async compileS3ServiceProxy() {
    await this.validateS3ServiceProxy()
    await this.compileIamRoleToS3()
    await this.compileMethodsToS3()
  }
}
