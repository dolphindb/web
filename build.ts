import process from 'process'

import { builder } from './builder.ts'


const prefix_version = '--version='

await builder.build(
    true, 
    process.argv
        .find(arg => arg.startsWith(prefix_version))
        ?.strip_start(prefix_version)
)


await builder.close()
