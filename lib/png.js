'use strict';

/**
 * Minimal PNG codec — decode and encode, no dependencies.
 *
 * Written for this project because the terrain DEM ships as PNG (Mapbox
 * "terrarium" encoding) and the analysis raster is published back as PNG.
 * Supports 8-bit non-interlaced greyscale / RGB / RGBA, which is what both
 * ends of this pipeline use.
 */

const zlib = require('zlib');

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/* ------------------------------------------------------------------ *
 * CRC32 (required by the PNG container)
 * ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ------------------------------------------------------------------ *
 * decode
 * ------------------------------------------------------------------ */

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function decode(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 8 || !buf.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error('not a PNG (bad signature)');
  }

  let off = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];

  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const start = off + 8;

    if (type === 'IHDR') {
      width = buf.readUInt32BE(start);
      height = buf.readUInt32BE(start + 4);
      bitDepth = buf[start + 8];
      colorType = buf[start + 9];
      interlace = buf[start + 12];
    } else if (type === 'IDAT') {
      idat.push(buf.subarray(start, start + len));
    } else if (type === 'IEND') {
      break;
    }
    off = start + len + 4;
  }

  if (!width || !height) throw new Error('PNG missing IHDR');
  if (bitDepth !== 8) throw new Error(`unsupported PNG bit depth ${bitDepth}`);
  if (interlace !== 0) throw new Error('interlaced PNG not supported');

  const channels = CHANNELS[colorType];
  if (!channels) throw new Error(`unsupported PNG colour type ${colorType}`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);

  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;

    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = (prev && x >= channels) ? prev[x - channels] : 0;
      let v = line[x];

      switch (filter) {
        case 0: break;                                       // None
        case 1: v = (v + a) & 0xff; break;                   // Sub
        case 2: v = (v + b) & 0xff; break;                   // Up
        case 3: v = (v + ((a + b) >> 1)) & 0xff; break;      // Average
        case 4: {                                            // Paeth
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          const pred = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
          v = (v + pred) & 0xff;
          break;
        }
        default: throw new Error(`bad PNG filter ${filter} on row ${y}`);
      }
      cur[x] = v;
    }
  }

  return { width, height, channels, colorType, data: out };
}

/* ------------------------------------------------------------------ *
 * encode (8-bit RGB, filter 0)
 * ------------------------------------------------------------------ */

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  const crcBuf = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  out.writeUInt32BE(crc32(crcBuf), 8 + data.length);
  return out;
}

/**
 * @param {number} width
 * @param {number} height
 * @param {Buffer|Uint8Array} data  width*height*channels bytes
 * @param {{channels?: 3|4}} [opts] 3 = RGB (default), 4 = RGBA
 */
function encode(width, height, data, opts = {}) {
  const channels = opts.channels === 4 ? 4 : 3;
  const expected = width * height * channels;
  if (data.length !== expected) {
    throw new Error(`encode: expected ${expected} bytes, got ${data.length}`);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;                        // bit depth
  ihdr[9] = channels === 4 ? 6 : 2;   // colour type: 6 = RGBA, 2 = RGB
  ihdr[10] = 0;                       // compression
  ihdr[11] = 0;                       // filter
  ihdr[12] = 0;                       // interlace

  // one filter byte (0 = None) per scanline
  const stride = width * channels;
  const raw = Buffer.alloc(height * (stride + 1));
  const src = Buffer.from(data.buffer || data, data.byteOffset || 0, data.length);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    src.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

module.exports = { decode, encode, crc32 };
