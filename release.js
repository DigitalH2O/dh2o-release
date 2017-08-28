var cmd = require('node-cmd-promise')

require('./index')({
  publishStep() {
    return cmd('npm publish')
  }
})
