import process from 'process'

import { fdclear } from 'xshell'

import { builder, fpd_out } from './builder.ts'


const { argv } = process

const prefix_version = '--version='

const prefix_root = '--root='

await fdclear(fpd_out)

await builder.build_bundles(true)

await builder.build(
    true, 
    argv
        .find(arg => arg.startsWith(prefix_version))
        ?.strip_start(prefix_version),
    argv.find(arg => arg.startsWith(prefix_root))
        ?.strip_start(prefix_root)
)


await builder.close()
