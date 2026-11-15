import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const origin = process.env.E2E_ORIGIN!, workspace = process.env.E2E_WORKSPACE!
const cookie = (token: string) => ({ name: 'sele_session', value: token, url: origin, httpOnly: true, sameSite: 'Lax' as const })
test.beforeEach(async ({ context }) => {
  await context.addCookies([cookie(process.env.E2E_OWNER_TOKEN!)])
})
async function item(page: Page, kind: string) {
  const response = await page.request.post(`${origin}/api/workspaces/${workspace}/items`, { headers: { Origin: origin }, data: { title: `E2E ${kind} ${crypto.randomUUID()}`, kind } })
  expect(response.ok()).toBeTruthy()
  return (await response.json()).data as {
    id: string
    title: string
  }
}
const route = (id: string) => `/workspaces/${workspace}/items/${id}`
const surface = (page: Page) => page.locator('svg[role="application"]')
test('content fullscreen, drawing, undo and reload', async ({ page }) => {
  const board = await item(page, 'whiteboard')
  await page.goto(route(board.id))
  await expect(surface(page)).toBeVisible()
  await page.getByLabel('Enter fullscreen', { exact: true }).click()
  await expect(page.getByLabel('Workspace navigation', { exact: true })).toBeHidden()
  expect(await page.evaluate(() => document.fullscreenElement === null)).toBeTruthy()
  await page.getByLabel('Rectangle (R)', { exact: true }).click()
  const box = (await surface(page).boundingBox())!
  await page.mouse.move(box.x + 60, box.y + 60)
  await page.mouse.down()
  await page.mouse.move(box.x + 220, box.y + 150)
  await page.mouse.up()
  await expect(page.getByText(/1 elements ·/)).toBeVisible()
  await surface(page).press('ControlOrMeta+z')
  await expect(page.getByText(/0 elements ·/)).toBeVisible()
  await surface(page).press('ControlOrMeta+Shift+z')
  await expect(page.getByText(/1 elements ·/)).toBeVisible()
  await expect(page.getByText('All changes saved', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText(/1 elements ·/)).toBeVisible()
})
test('two members merge independent edits and see presence', async ({ page, browser }) => {
  const board = await item(page, 'whiteboard'), other = await browser.newContext({ baseURL: origin })
  try {
    await other.addCookies([cookie(process.env.E2E_MEMBER_TOKEN!)])
    const peer = await other.newPage()
    await Promise.all([page.goto(route(board.id)), peer.goto(route(board.id))])
    await expect(page.getByText(/UI Member/).first()).toBeVisible()
    const base = (await (await page.request.get(`${origin}/api/items/${board.id}/canvas`)).json()).data
    const shape = (x: number) => ({ id: crypto.randomUUID(), type: 'rectangle', x, y: 0, width: 80, height: 60, points: [], text: '', color: '#2563eb', size: 2 })
    const results = await Promise.all([page.request.put(`${origin}/api/items/${board.id}/canvas`, { headers: { Origin: origin }, data: { revision: base.revision, base: base.content, content: { kind: 'whiteboard', elements: [shape(0)] } } }), peer.request.put(`${origin}/api/items/${board.id}/canvas`, { headers: { Origin: origin }, data: { revision: base.revision, base: base.content, content: { kind: 'whiteboard', elements: [shape(200)] } } })])
    expect(results.every(response => response.ok())).toBeTruthy()
    await expect(page.getByText(/2 elements ·/)).toBeVisible()
    await expect(peer.getByText(/2 elements ·/)).toBeVisible()
  } finally {
    await other.close()
  }
})
test('recurring task completion creates the next occurrence and calendar opens', async ({ page }) => {
  const board = await item(page, 'kanban')
  await page.goto(route(board.id))
  await page.getByRole('button', { name: 'Add task', exact: true }).first().click()
  await page.getByRole('textbox', { name: /^Title/ }).fill('Weekly dispatch')
  await page.getByRole('combobox', { name: 'Repeat after completion' }).click()
  await page.getByRole('option', { name: 'Weekly', exact: true }).click()
  await page.getByLabel('Completion', { exact: true }).check()
  await page.getByRole('button', { name: 'Save task', exact: true }).click()
  await expect.poll(async () => (await (await page.request.get(`${origin}/api/items/${board.id}/canvas`)).json()).data.content.tasks.length).toBe(2)
  await page.getByText('Calendar', { exact: true }).click()
  await expect(page.getByLabel('Task calendar', { exact: true })).toBeVisible()
})
test('attachment preview and a related item survive reload', async ({ page }) => {
  const source = await item(page, 'diagram'), target = await item(page, 'document')
  await page.goto(route(source.id))
  await page.getByLabel('Files and related items', { exact: true }).click()
  await page.getByLabel('Choose attachment', { exact: true }).setInputFiles({ name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('UI attachment fixture') })
  await expect(page.getByText('note.txt', { exact: true })).toBeVisible()
  await page.getByLabel('Find related item', { exact: true }).fill(target.title)
  await page.getByRole('combobox', { name: 'Related item', exact: true }).click()
  await page.getByRole('option', { name: target.title, exact: true }).click()
  await page.getByRole('button', { name: 'Add relation', exact: true }).click()
  await expect(page.getByRole('link', { name: new RegExp(target.title) })).toBeVisible()
  await page.reload()
  await page.getByLabel('Files and related items', { exact: true }).click()
  await expect(page.getByText('note.txt', { exact: true })).toBeVisible()
})
test('search filters and saved searches', async ({ page }) => {
  const source = await item(page, 'whiteboard')
  await page.goto(route(source.id))
  await expect(surface(page)).toBeVisible()
  await page.keyboard.press('ControlOrMeta+k')
  await page.getByRole('textbox', { name: 'Search all content', exact: true }).fill(source.title)
  await page.getByRole('combobox', { name: 'Search item type', exact: true }).click()
  await page.getByRole('option', { name: 'whiteboard', exact: true }).click()
  await page.getByLabel('Saved search name', { exact: true }).fill('Whiteboards to review')
  await page.getByRole('button', { name: 'Save search', exact: true }).click()
  await expect(page.getByLabel('Saved search name', { exact: true })).toHaveValue('')
  const saved = (await (await page.request.get(`${origin}/api/library/searches`)).json()).data
  expect(saved.some((value: {
    name: string
    filters: {
      kind: string
    }
  }) => value.name === 'Whiteboards to review' && value.filters.kind === 'whiteboard')).toBeTruthy()
})
test('large whiteboards cull offscreen DOM while SVG export contains the entire scene', async ({ page }, info) => {
  const board = await item(page, 'whiteboard'), elements = Array.from({ length: 2000 }, (_, i) => ({ id: crypto.randomUUID(), type: 'rectangle', x: i % 50 * 400, y: Math.floor(i / 50) * 400, width: 100, height: 80, points: [], text: '', color: '#18181b', size: 2 }))
  const write = await page.request.put(`${origin}/api/items/${board.id}/canvas`, { headers: { Origin: origin }, data: { revision: 0, content: { kind: 'whiteboard', elements } } })
  expect(write.ok()).toBeTruthy()
  const start = Date.now()
  await page.goto(route(board.id))
  await expect(surface(page)).toBeVisible()
  const rendered = await page.locator('[data-element]').count()
  expect(rendered).toBeLessThan(100)
  await info.attach('canvas-render-budget', { body: JSON.stringify({ total: 2000, rendered, readyMs: Date.now() - start }), contentType: 'application/json' })
  await page.getByLabel('Export image', { exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Export SVG', exact: true }).click()
  const download = await downloadPromise
  expect((await readFile((await download.path())!, 'utf8')).match(/<g transform=/g)).toHaveLength(2000)
})
