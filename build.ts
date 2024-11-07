import process from 'process'

import { fdclear } from 'xshell'

import { builder, fpd_out } from './builder.ts'


const prefix_version = '--version='

await fdclear(fpd_out)

await builder.build_bundles(true)

await builder.build(
    true, 
    process.argv
        .find(arg => arg.startsWith(prefix_version))
        ?.strip_start(prefix_version)
)


await builder.close()
