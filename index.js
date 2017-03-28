var projectDir = process.cwd()
var assert = require('assert')
var fs = require('fs')
var cmd =  require('node-cmd-promise')
var path = require('path')
var semver = require('semver')

var packagejson = require(path.join(projectDir, './package.json'))

module.exports = ({ buildStep, publishStep }) => {
  var argv = require('yargs')
  .option('type', {
    alias: 't',
    demandOption: true,
    choices: ['major', 'minor', 'patch']
  })
  .option('dry-run', {
    alias: 'd',
    type: 'boolean'
  })
  .argv

  cmdDestructive = cmd

  writeFile = (filename, contents) => fs.writeFileSync(filename, contents)

  if (argv['dry-run']) {
    cmdDestructive = (command) => {
      console.log(command)
      return Promise.resolve()
    }

    writeFile = (filename, contents) => {
      console.log(`writing to file: ${filename}`)
      console.log()
      console.log(contents)
      console.log()
    }
  }

  var safetyCheck = () => {
    return cmd('git symbolic-ref --short HEAD') // this command gets the current branch name
    .then(({ stdout, stderr }) => {
      assert(
        stdout.trim() === 'develop',
        `Tried to release from branch ${stdout}. Please switch to develop.`)

      return cmd('git status -s') // this command will have no output if the branch has no changes
    })
    .then(({ stdout, stderr }) => {
      assert(
        stdout.trim() === '',
        `Tried to release with uncommitted changes. Please commit or stash your changes.`)

      return cmd('git fetch')
    })
    .then(() => cmd('git pull')) // ensure the develop branch is up to date

    .then(() => cmd('git checkout master'))
    .then(() => cmd('git pull')) // ensure master is up to date

    .then(() => cmd('git checkout develop')) // return to develop
  }

  var build = () => {
    if (buildStep) {
      console.log('Building...')
      return buildStep()
    }

    return Promise.resolve(null)
  }

  var versionBump = () => {
    console.log('Updating package.json...')
    packagejson.version = semver.inc(packagejson.version, argv['type'])
    writeFile('./package.json', JSON.stringify(packagejson, null, 2))

    return Promise.resolve(null)
  }

  var commitToDevelop = () => {
    return cmdDestructive('git add -A .')
    .then(() => cmdDestructive(`git commit -m "Release ${packagejson.version}"`))
  }

  var updateAndTagMaster = () => {
    return cmdDestructive('git checkout master')
    .then(() => cmdDestructive('git merge develop'))
    .then(() => {
      console.log('Pushing to master...')
      return cmdDestructive('git push')
    })
    .then(() => {
      console.log('Tagging and pushing tag...')
      return cmdDestructive(`git tag -a v${packagejson.version} -m "Release v${packagejson.version}"`)
    })
    .then(() => cmdDestructive(`git push origin v${packagejson.version}`))
  }

  var publish = () => {
    if (publishStep) {
      console.log('Publishing...');
      return publishStep()
    }

    return Promise.resolve(null)
  }

  safetyCheck()
  .then(() => build())
  .then(() => versionBump())
  .then(() => commitToDevelop())
  .then(() => updateAndTagMaster())
  .then(() => publish())
  .then(() => cmd('git checkout develop'))
  .then(() => console.log(`Finished release v${packagejson.version}`))
  .catch((err) => {
    console.log(err.message)
    process.exit(1)
  })
}