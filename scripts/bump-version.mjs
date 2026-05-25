/**
 * Auto-bump patch version in package.json before every build.
 * 2.0.0 → 2.0.1 → 2.0.2 → ...
 *
 * Run automatically via "prebuild" npm script.
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgPath   = resolve(__dirname, '../package.json')

const pkg     = JSON.parse(readFileSync(pkgPath, 'utf8'))
const [major, minor, patch] = pkg.version.split('.').map(Number)
const newVersion = `${major}.${minor}.${patch + 1}`

pkg.version = newVersion
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

console.log(`📦 Version bumped: ${major}.${minor}.${patch} → ${newVersion}`)
