
module.exports = async function teardown () {
  await globalThis.miniProgram.close()
  globalThis.miniProgram = null
}