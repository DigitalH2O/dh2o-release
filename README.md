# dh2o-release
Release script for DH2O projects

This package exports a function that will run the release script when invoked. It takes an object with two parameters, both optional (`buildStep` and `publishStep`).

To use it, create a `release.js` file in your project that looks something like this:

```js
require('dh2o-release')({
  buildStep: () => {} // returns a Promise
  publishStep: () => {} // returns a Promise
 })
```

then run `node release.js -t [major|minor|patch]`


## What it does:

1. Checks that you're on develop and have no uncommitted changes.
2. Pulls both develop and master.
3. Runs your `buildStep`, if you have one -- the function should return a promise that resolves when your build is complete.
4. Increments your package.json version according to semver (depending on whether you specified a major, minor, or patch release).
5. Commits the new package.json and build result to develop.
6. Merges develop to master, pushes master, and creates a new tag.
7. Runs your `publishStep`, if you have one. Same deal as `buildStep`.

An easy way to write the build/publish step functions is to use the `node-cmd-promise` library, which takes a bash command and returns a promise that resolves when the command is finished. See this repo's own `release.js` for an example.
