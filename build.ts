#!/usr/bin/env node

import xsh from 'xshell'

import { webpack } from './webpack.js'
import { fp_root } from './config.js'

const { fcopy } = xsh

await fcopy(`${fp_root}src/`, `${fp_root}build/`, { overwrite: true })
await fcopy(`${fp_root}index.html`, `${fp_root}build/index.html`, { overwrite: true })

await webpack.build()
