import fs from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

if (fs.realpathSync?.native) {
  fs.realpathSync.native = fs.realpathSync
}
if (fs.realpath?.native) {
  fs.realpath.native = fs.realpath
}

export default defineConfig({
  plugins: [react()],
})
