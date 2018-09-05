#!/usr/bin/env node

let args = require('commander')
let jayson = require('jayson');
let request = require('request')
let app = require('./src/cli/app')
const Logger = require('./src/cli/logger')
const url = require('url')

app.initApp()
app.addBuildCommand()

args
    .option(
        '-n, --subgraph-name <NAME>',
        'subgraph name'
    )
    .option(
        '--node <URL>[:PORT]',
        'graph node'
    )

app.parse()

if (!args.node || !args.subgraphName) {
    args.help()
}

let compiler = app.compilerFromArgs()

let requestUrl = new URL(args.node)
if (!requestUrl.port) {
    requestUrl.port = "8020"
}

let client = jayson.Client.http(requestUrl)
let logger = new Logger(0, { verbosity: args.verbosity })

compiler.compile()
    .then(
        function (ipfsHash) {
            if (ipfsHash === undefined) {
                // Compilation failed, not deploying.
                process.exitCode = 1
                return
            }
            client.request('subgraph_deploy', { name: args.subgraphName, ipfs_hash: ipfsHash },
                function (requestError, jsonRpcError, res) {
                    if (requestError) {
                        logger.fatal("HTTP error deploying the subgraph:", requestError)
                    }
                    if (jsonRpcError) {
                        logger.fatal("Error deploying the subgraph:", jsonRpcError.message)
                    }
                })
        }
    )