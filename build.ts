import { builder } from './builder.ts'

const prefix_version = '--version='

await builder.build_and_close(
    true, 
    process.argv
        .find(arg => arg.startsWith(prefix_version))
        ?.strip_start(prefix_version)
)
