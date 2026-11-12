import { strict as assert } from 'node:assert'

const theme = await Bun.file('app/assets/css/tokens.css').text()
assert.ok(!/--spacing-(?:none|xs|sm|md|lg|xl|[2-9]xl)\s*:/.test(theme), 'Use the ui spacing namespace; generic aliases override Tailwind container widths and keywords')
const violations: string[] = []
const dimensions = /(?:^|[\s:'"[(>])(?:min-|max-)?(?:p[xysetbrl]?|m[xysetbrl]?|gap(?:-[xy])?|space-[xy]|size|w|h|basis|indent|inset(?:-[xy])?|top|left|right|bottom|start|end)-\d+(?:\.\d+)?(?:\/\d+)?(?=[\s:'"\]>)},]|$)/g
const literalUnits = /(?<![\w-])-?\d*\.?\d+(?:px|rem|em|dvh|svh|vh|vw|ms)\b/g
for await (const file of new Bun.Glob('**/*.{vue,ts,css}').scan('app')) {
  if (file === 'assets/css/tokens.css') {
    continue
  }
  const source = await Bun.file(`app/${file}`).text()
  source.split('\n').forEach((line, index) => {
    for (const match of [...line.matchAll(dimensions), ...line.matchAll(literalUnits)]) {
      violations.push(`app/${file}:${index + 1}: use a semantic theme token for ${match[0].trim()}`)
    }
    if (/\sstyle\s*=/.test(line)) {
      violations.push(`app/${file}:${index + 1}: static inline styling belongs in a semantic class`)
    }
  })
}
assert.equal(violations.length, 0, violations.join('\n'))
console.log('Semantic styles verified: dimensions belong to tokens; structural grid counts and runtime editor coordinates are allowed')
