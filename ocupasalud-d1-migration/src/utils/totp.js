// src/utils/totp.js - TOTP/2FA Authentication

const _totpBase32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const _totpBase32ToBytes = (base32) => {
  const s = base32
    .toUpperCase()
    .replace(/=+$/, "")
    .replace(/[^A-Z2-7]/g, "");
  const bytes = [];
  let buf = 0,
    bitsLeft = 0;
  for (const ch of s) {
    const val = _totpBase32Chars.indexOf(ch);
    if (val < 0) continue;
    buf = (buf << 5) | val;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      bytes.push((buf >> bitsLeft) & 0xff);
    }
  }
  return new Uint8Array(bytes);
};

const _totpGenSecret = () => {
  const raw = crypto.getRandomValues(new Uint8Array(20));
  let s = "";
  for (let i = 0; i < raw.length; i++) {
    s += _totpBase32Chars[(raw[i] >> 3) & 0x1f];
    if (i < raw.length - 1)
      s += _totpBase32Chars[((raw[i] & 0x07) << 2) | (raw[i + 1] >> 6)];
  }
  return s.substring(0, 32);
};

const _totpVerify = async (secret, token, window = 1) => {
  try {
    const keyBytes = _totpBase32ToBytes(secret);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );
    const now = Math.floor(Date.now() / 30000);
    for (let delta = -window; delta <= window; delta++) {
      const counter = now + delta;
      const msg = new DataView(new ArrayBuffer(8));
      msg.setUint32(4, counter & 0xffffffff, false);
      const sig = await crypto.subtle.sign("HMAC", cryptoKey, msg.buffer);
      const hmac = new Uint8Array(sig);
      const offset = hmac[hmac.length - 1] & 0x0f;
      const code =
        (((hmac[offset] & 0x7f) << 24) |
          ((hmac[offset + 1] & 0xff) << 16) |
          ((hmac[offset + 2] & 0xff) << 8) |
          (hmac[offset + 3] & 0xff)) %
        1000000;
      if (String(code).padStart(6, "0") === String(token).padStart(6, "0"))
        return true;
    }
    return false;
  } catch {
    return false;
  }
};

const _totpGetOtpAuthUrl = (secret, user, issuer = "SISOOcupaSalud") =>
  "otpauth://totp/" +
  encodeURIComponent(issuer + ":" + user) +
  "?secret=" +
  secret +
  "&issuer=" +
  encodeURIComponent(issuer) +
  "&algorithm=SHA1&digits=6&period=30";

const _totpGetQRCodeUrl = (secret, user) =>
  "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" +
  encodeURIComponent(_totpGetOtpAuthUrl(secret, user));

export { _totpBase32Chars, _totpBase32ToBytes, _totpGenSecret, _totpVerify, _totpGetOtpAuthUrl, _totpGetQRCodeUrl };
