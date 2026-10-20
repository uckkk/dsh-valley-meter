/**
 * dsh-valley-meter build step.
 *
 * 本仓库的 lib/*.js 是手写产物(没有 TS 源码树,也没有打包器):
 *   - lib/index.js       Host 入口(cordis 功能插件)
 *   - lib/typert.host.js Host 面 Typert 清单
 *   - lib/client.js      浏览器端单文件 bundle(window.__ModuleLoader__ 协议)
 *
 * 因此“构建”做的是产物一致性校验 + 语法检查,而不是重新打包:
 *   1. package.json 的 exports / dsh 声明指向真实文件;
 *   2. client bundle 的注册 id 与包名一致;
 *   3. 三个入口都能被 Node 正确解析(ESM 语法检查);
 *   4. typert 清单可被导入,且每个 invocation 都带 strict codec + create() 工厂。
 */
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const problems = []
const note = (message) => problems.push(message)

for (const file of ['lib/index.js', 'lib/typert.host.js', 'lib/client.js', 'cordis.patch.yml', 'dsh.plugin.json']) {
  if (!existsSync(join(root, file))) note(`missing ${file}`)
}

if (pkg.exports?.['.']?.default !== './lib/index.js') note('exports["."] must point at ./lib/index.js')
if (pkg.exports?.['./client']?.default !== './lib/client.js') note('exports["./client"] must point at ./lib/client.js')
if (pkg.exports?.['./typert']?.default !== './lib/typert.host.js') note('exports["./typert"] must point at ./lib/typert.host.js')
if (pkg.dsh?.client?.platform !== 'web') note('dsh.client.platform must be "web"')
if (pkg.dsh?.manifestVersion !== 1) note('dsh.manifestVersion must be 1')
if (pkg.dsh?.bundle?.patch !== './cordis.patch.yml') note('dsh.bundle.patch must be ./cordis.patch.yml')

const client = await readFile(join(root, 'lib/client.js'), 'utf8')
const declaredId = client.match(/id:\s*['"]([^'"]+)['"]/)?.[1]
if (declaredId !== pkg.name) note(`client bundle id ${JSON.stringify(declaredId)} must equal package name ${JSON.stringify(pkg.name)}`)
if (!client.includes('window.__ModuleLoader__.load(')) note('client bundle must register through window.__ModuleLoader__.load()')

for (const file of ['lib/index.js', 'lib/typert.host.js', 'lib/client.js']) {
  try {
    execFileSync(process.execPath, ['--check', join(root, file)], { stdio: 'pipe' })
  } catch (error) {
    note(`${file} does not parse: ${String(error.stderr ?? error)}`)
  }
}

try {
  const { TYPERT } = await import(new URL('./lib/typert.host.js', import.meta.url))
  if (TYPERT?.package !== pkg.name) note('TYPERT.package must equal the package name')
  if (TYPERT?.face !== 'host') note('TYPERT.face must be "host"')
  if (!Array.isArray(TYPERT?.schemas)) note('TYPERT.schemas must be an array')
  const invocations = TYPERT?.invocations ?? []
  if (invocations.length !== 3) note(`expected 3 invocations, found ${invocations.length}`)
  for (const invocation of invocations) {
    for (const codec of [
      ...(invocation.parameters ?? []).flatMap((parameter) => [parameter.codec, parameter.strictCodec]),
      invocation.result,
    ]) {
      if (codec === undefined) continue
      if (codec.mode !== 'strict') note(`${invocation.id}: codec must be strict`)
      if (typeof codec.typeSymbol !== 'string' || codec.typeSymbol.length === 0) note(`${invocation.id}: codec needs a typeSymbol`)
      if (typeof codec.create !== 'function') note(`${invocation.id}: codec needs a create() factory`)
    }
  }
} catch (error) {
  note(`cannot import lib/typert.host.js (run pnpm install first): ${String(error)}`)
}

if (problems.length > 0) {
  console.error('dsh-valley-meter build failed:')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exitCode = 1
} else {
  console.log(`dsh-valley-meter ${pkg.version}: build checks passed (${pkg.name})`)
}
