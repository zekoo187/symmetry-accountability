// Generates the app icon (public/icon-512.png) deterministically — no browser,
// no fonts, no dependencies. Shapes are drawn analytically and supersampled
// for anti-aliasing, then encoded as a PNG with Node's zlib.
//
//   node scripts/make-icon.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const S = 512
const SS = 4 // supersampling factor per axis

// --- brand colours -----------------------------------------------------------
const INK = [0x23, 0x20, 0x1c]
const WHITE = [0xff, 0xff, 0xff]
const GREEN = [0x2e, 0x7d, 0x5b]

// --- geometry helpers --------------------------------------------------------
const hypot = (x, y) => Math.sqrt(x * x + y * y)
const inRect = (x, y, x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1
/** distance from point to a line segment — used for capsule shapes */
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return hypot(px - (ax + t * dx), py - (ay + t * dy))
}

// "S" = two 3/4 annulus arcs stacked so they meet in the middle.
const SX = 191
const R = 50
const STROKE = 21 // half-width of the stroke
function inS(x, y) {
  const d1 = hypot(x - SX, y - 190)
  const upper = Math.abs(d1 - R) <= STROKE && !(x > SX && y > 190) // drop bottom-right
  const d2 = hypot(x - SX, y - 290)
  const lower = Math.abs(d2 - R) <= STROKE && !(x < SX && y < 290) // drop top-left
  return upper || lower
}

// "F" = a stem plus two arms.
function inF(x, y) {
  return (
    inRect(x, y, 281, 140, 323, 340) || // stem
    inRect(x, y, 281, 140, 371, 182) || // top arm
    inRect(x, y, 281, 222, 352, 264) //   middle arm
  )
}

// Green accent bar beneath the wordmark (a capsule).
const inBar = (x, y) => distToSeg(x, y, 186, 385, 326, 385) <= 10

// --- rasterise ---------------------------------------------------------------
const rgb = Buffer.alloc(S * S * 3)
for (let py = 0; py < S; py++) {
  for (let px = 0; px < S; px++) {
    let markHits = 0
    let barHits = 0
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const x = px + (sx + 0.5) / SS
        const y = py + (sy + 0.5) / SS
        if (inS(x, y) || inF(x, y)) markHits++
        else if (inBar(x, y)) barHits++
      }
    }
    const total = SS * SS
    const aMark = markHits / total
    const aBar = barHits / total
    const i = (py * S + px) * 3
    for (let c = 0; c < 3; c++) {
      // composite: ink background <- green bar <- white mark
      let v = INK[c] * (1 - aBar) + GREEN[c] * aBar
      v = v * (1 - aMark) + WHITE[c] * aMark
      rgb[i + c] = Math.round(v)
    }
  }
}

// --- encode PNG (truecolour, 8-bit, no alpha) --------------------------------
const raw = Buffer.alloc(S * (S * 3 + 1))
for (let y = 0; y < S; y++) {
  raw[y * (S * 3 + 1)] = 0 // filter: none
  rgb.copy(raw, y * (S * 3 + 1) + 1, y * S * 3, (y + 1) * S * 3)
}

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(S, 0)
ihdr.writeUInt32BE(S, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 2 // colour type: truecolour
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])

mkdirSync('public', { recursive: true })
writeFileSync('public/icon-512.png', png)
console.log('wrote public/icon-512.png —', png.length, 'bytes')
