const automator = require('miniprogram-automator')
const path = require('path')
const customSelector = require('./custom-selector')
module.exports = async function setup () {
  const configPath = path.resolve(__dirname, '../stepconfig.js')
  const config = require(configPath)

  const miniProgram = await automator.launch(config)

  globalThis.miniProgram = miniProgram
  globalThis.customSelector = customSelector
}