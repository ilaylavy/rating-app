// End-to-end smoke test against the production build (vite preview must be running).
// Usage: node scripts/smoke.mjs [baseURL]
import puppeteer from 'puppeteer'
import { mkdirSync } from 'node:fs'

const base = process.argv[2] || 'http://localhost:4173'
mkdirSync('shots', { recursive: true })

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
})
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 })
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message))

const fail = (msg) => {
  console.error('FAIL:', msg)
  process.exitCode = 1
}

async function clickByText(selector, text) {
  const handles = await page.$$(selector)
  for (const h of handles) {
    const t = await h.evaluate((el) => el.textContent?.trim())
    if (t && t.includes(text)) {
      await h.click()
      return true
    }
  }
  return false
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// --- 1. Onboarding ---
await page.goto(base, { waitUntil: 'networkidle0' })
await page.waitForSelector('input', { timeout: 10000 })
await page.type('input', 'Japan 2026')
await clickByText('.emoji-grid button', '⛩️')
await clickByText('button', 'Start my trip')
await page.waitForSelector('.trip-pill', { timeout: 5000 })
const tripName = await page.$eval('.trip-pill-name', (el) => el.textContent)
if (tripName !== 'Japan 2026') fail(`trip name: ${tripName}`)
console.log('✓ onboarding → trip created:', tripName)
await page.screenshot({ path: 'shots/1-journal-empty.png' })

// --- 2. Add a coffee entry ---
await page.click('.fab')
await page.waitForSelector('.cat-tile', { timeout: 5000 })
await page.screenshot({ path: 'shots/2-pick-category.png' })
if (!(await clickByText('.cat-tile', 'Coffee'))) fail('no Coffee tile')
await page.waitForSelector('.field input', { timeout: 5000 })
await page.type('.field input', 'Bear Pond Espresso')
const inputs = await page.$$('.field input')
await inputs[1].type('Shimokitazawa, Tokyo')
// rate: Taste 5, Vibe 4, Service 4, Value 3
const rows = await page.$$('.rating-row')
const want = [5, 4, 4, 3]
for (let i = 0; i < rows.length; i++) {
  const stars = await rows[i].$$('.star-input button')
  await stars[want[i] - 1].click()
}
// half star: click the LEFT half of the 4th star on the Value row → 3.5
const valueStars = await rows[3].$$('.star-input button')
const box = await valueStars[3].boundingBox()
await page.mouse.click(box.x + box.width * 0.25, box.y + box.height / 2)
const halfReadout = await rows[3].$eval('.star-value', (el) => el.textContent)
if (halfReadout !== '3.5') fail(`half-star readout: ${halfReadout}`)
console.log('✓ half-star rating works (Value → 3.5)')
// per-criterion note on the first criterion (Taste)
const noteToggles = await page.$$('.note-toggle')
await noteToggles[0].click()
await page.waitForSelector('.crit-note-input', { timeout: 5000 })
await page.type('.crit-note-input', 'Syrupy shot, zero bitterness')
console.log('✓ per-criterion note added')
await page.type('textarea', 'Tiny counter, intense espresso. The "dirty" is legendary.')
// attach a photo through the hidden file input
const photoInput = await page.$('input[type=file]')
await photoInput.uploadFile('shots/test-photo.jpg')
await page.waitForSelector('.photo-thumb img', { timeout: 10000 })
console.log('✓ photo processed and attached')
// (5 + 4 + 4 + 3.5) / 4 = 4.1
const overall = await page.$eval('.overall-row strong', (el) => el.textContent)
if (!overall?.startsWith('4.1')) fail(`overall preview: ${overall}`)
console.log('✓ form filled, overall preview:', overall)
await page.screenshot({ path: 'shots/3-add-entry.png' })
await clickByText('button', 'Save entry')

// --- 3. Detail page ---
await page.waitForSelector('.detail-head h1', { timeout: 5000 })
const title = await page.$eval('.detail-head h1', (el) => el.textContent)
if (title !== 'Bear Pond Espresso') fail(`detail title: ${title}`)
const detailOverall = await page.$eval('.detail-overall strong', (el) => el.textContent)
const critNote = await page.$eval('.crit-note', (el) => el.textContent)
if (critNote !== 'Syrupy shot, zero bitterness') fail(`criterion note on detail: ${critNote}`)
console.log('✓ per-criterion note shown on detail page')
await page.waitForSelector('.gallery img', { timeout: 5000 })
console.log('✓ entry saved → detail (with photo):', title, detailOverall, '★')
await page.screenshot({ path: 'shots/4-entry-detail.png' })

// --- 4. Add a second entry (Food) for stats ---
await page.goto(`${base}/#/add`, { waitUntil: 'networkidle0' })
await page.waitForSelector('.cat-tile', { timeout: 5000 })
await clickByText('.cat-tile', 'Food')
await page.waitForSelector('.field input', { timeout: 5000 })
await page.type('.field input', 'Ichiran Ramen')
const rows2 = await page.$$('.rating-row')
for (const r of rows2) {
  const stars = await r.$$('.star-input button')
  await stars[4].click()
}
await clickByText('button', 'Save entry')
await page.waitForSelector('.detail-head h1', { timeout: 5000 })
console.log('✓ second entry saved')

// --- 5. Journal list ---
await page.goto(`${base}/#/`, { waitUntil: 'networkidle0' })
await page.waitForSelector('.entry-card', { timeout: 5000 })
const cards = await page.$$('.entry-card')
if (cards.length !== 2) fail(`expected 2 cards, got ${cards.length}`)
console.log('✓ journal shows', cards.length, 'entries')
await page.screenshot({ path: 'shots/5-journal.png' })

// --- 6. Filter chips ---
await clickByText('.chip', 'Coffee')
await wait(300)
const filtered = await page.$$('.entry-card')
if (filtered.length !== 1) fail(`filter expected 1 card, got ${filtered.length}`)
console.log('✓ category filter works')

// --- 7. Stats ---
await page.goto(`${base}/#/stats`, { waitUntil: 'networkidle0' })
await page.waitForSelector('.stat-cards', { timeout: 5000 })
const statEntries = await page.$eval('.stat-card strong', (el) => el.textContent)
if (statEntries !== '2') fail(`stats entries: ${statEntries}`)
console.log('✓ stats page renders, entries:', statEntries)
await page.screenshot({ path: 'shots/6-stats.png' })
// per-category tab
await clickByText('.chip', 'Coffee')
await wait(300)
const catBars = await page.$$('.bar-row')
if (catBars.length === 0) fail('category stats tab shows no criterion bars')
const catStatEntries = await page.$eval('.stat-card strong', (el) => el.textContent)
if (catStatEntries !== '1') fail(`coffee tab entries: ${catStatEntries}`)
console.log('✓ stats category tab works, coffee entries:', catStatEntries)
await page.screenshot({ path: 'shots/6b-stats-coffee.png' })

// --- 8. Categories + persistence across reload ---
await page.goto(`${base}/#/categories`, { waitUntil: 'networkidle0' })
await page.waitForSelector('.list-row', { timeout: 5000 })
const catCount = (await page.$$('.list-row')).length
if (catCount < 5) fail(`expected >=5 categories, got ${catCount}`)
console.log('✓ categories page:', catCount, 'categories')
await page.screenshot({ path: 'shots/7-categories.png' })

await page.reload({ waitUntil: 'networkidle0' })
await page.goto(`${base}/#/`, { waitUntil: 'networkidle0' })
await page.waitForSelector('.entry-card', { timeout: 5000 })
const afterReload = await page.$$('.entry-card')
if (afterReload.length !== 2) fail(`expected 2 cards after reload, got ${afterReload.length}`)
console.log('✓ data persists after reload')

await browser.close()
console.log(process.exitCode ? 'SMOKE TEST FAILED' : 'SMOKE TEST PASSED')
