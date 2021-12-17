#!/usr/bin/env node

import xsh from 'xshell'

import { webpack } from './webpack.js'
import { fp_root, fpd_out } from './config.js'

const { fcopy, fdelete } = xsh

await fdelete(fpd_out)
await fcopy(`${fp_root}src/`, fpd_out, { overwrite: true })
await fcopy(`${fp_root}index.html`, `${fpd_out}index.html`, { overwrite: true })

await webpack.build()
