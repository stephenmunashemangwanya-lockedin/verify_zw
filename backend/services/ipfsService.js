const fs = require("fs");
const path = require("path");

const { getIpfsConfig } = require("../config/ipfs");

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

class IpfsServiceError extends Error {
  constructor(message, { statusCode = 502, code = "IPFS_PROVIDER_ERROR", retryable = false } = {}) {
    super(message);
    this.name = "IpfsServiceError";
    this.statusCode = statusCode;
    this.code = code;
    this.retryable = retryable;
  }
}

const decodeBaseX = (value, alphabet, bitsPerCharacter) => {
  let accumulator = 0;
  let bits = 0;
  const output = [];
  for (const character of value) {
    const digit = alphabet.indexOf(character.toLowerCase());
    if (digit < 0) return null;
    accumulator = (accumulator << bitsPerCharacter) | digit;
    bits += bitsPerCharacter;
    while (bits >= 8) {
      bits -= 8;
      output.push((accumulator >> bits) & 255);
      accumulator &= (1 << bits) - 1;
    }
  }
  if (bits > 0 && accumulator !== 0) return null;
  return Buffer.from(output);
};

const decodeBase58 = (value) => {
  let number = 0n;
  for (const character of value) {
    const digit = BASE58_ALPHABET.indexOf(character);
    if (digit < 0) return null;
    number = number * 58n + BigInt(digit);
  }
  const bytes = [];
  while (number > 0n) {
    bytes.unshift(Number(number & 255n));
    number >>= 8n;
  }
  for (const character of value) {
    if (character !== "1") break;
    bytes.unshift(0);
  }
  return Buffer.from(bytes);
};

const readVarint = (buffer, offset) => {
  let value = 0;
  let shift = 0;
  for (let index = offset; index < buffer.length && shift <= 49; index += 1) {
    const byte = buffer[index];
    value += (byte & 0x7f) * 2 ** shift;
    if ((byte & 0x80) === 0) return { value, next: index + 1 };
    shift += 7;
  }
  return null;
};

const isValidMultihash = (buffer, offset) => {
  const algorithm = readVarint(buffer, offset);
  if (!algorithm || algorithm.value < 1) return false;
  const length = readVarint(buffer, algorithm.next);
  return Boolean(length && length.value > 0 && length.next + length.value === buffer.length);
};

/** Validate CIDv0 and CIDv1 structure, including multibase and multihash. */
const validateCid = (cid) => {
  if (typeof cid !== "string" || cid.length < 10 || cid.length > 200 || cid.trim() !== cid) {
    return false;
  }
  if (cid.startsWith("Qm") && cid.length === 46) {
    const bytes = decodeBase58(cid);
    return Boolean(bytes && bytes.length === 34 && bytes[0] === 0x12 && bytes[1] === 0x20);
  }

  let bytes;
  if (cid[0] === "b" || cid[0] === "B") {
    bytes = decodeBaseX(cid.slice(1), BASE32_ALPHABET, 5);
  } else if (cid[0] === "z") {
    bytes = decodeBase58(cid.slice(1));
  } else {
    return false;
  }
  if (!bytes) return false;
  const version = readVarint(bytes, 0);
  const codec = version && readVarint(bytes, version.next);
  return Boolean(version && version.value === 1 && codec && codec.value > 0 && isValidMultihash(bytes, codec.next));
};

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const requestPinata = async (url, options, config) => {
  let lastError;
  for (let attempt = 1; attempt <= config.maxRetries; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(config.timeoutMs),
      });
      if (response.ok) return response;
      const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
      const statusCode = response.status === 401 || response.status === 403 ? 502 : retryable ? 503 : 502;
      const error = new IpfsServiceError(
        retryable ? "The IPFS provider is temporarily unavailable." : "The IPFS provider rejected the request.",
        { statusCode, code: `IPFS_HTTP_${response.status}`, retryable }
      );
      if (!retryable) throw error;
      lastError = error;
    } catch (error) {
      if (error instanceof IpfsServiceError && !error.retryable) throw error;
      lastError = error?.name === "TimeoutError"
        ? new IpfsServiceError("The IPFS provider request timed out.", { statusCode: 503, code: "IPFS_TIMEOUT", retryable: true })
        : new IpfsServiceError("The IPFS provider is unavailable.", { statusCode: 503, code: "IPFS_UNAVAILABLE", retryable: true });
    }
    if (attempt < config.maxRetries) await delay(Math.min(250 * 2 ** (attempt - 1), 2000));
  }
  throw lastError;
};

const getGatewayUrl = (cid) => {
  if (!validateCid(cid)) throw new IpfsServiceError("Invalid IPFS CID.", { statusCode: 500, code: "INVALID_CID" });
  return `${getIpfsConfig().gatewayUrl}/${encodeURIComponent(cid)}`;
};

const checkPinStatus = async (cid) => {
  if (!validateCid(cid)) throw new IpfsServiceError("Invalid IPFS CID.", { statusCode: 500, code: "INVALID_CID" });
  const config = getIpfsConfig();
  const response = await requestPinata(
    `${config.apiUrl}/data/pinList?status=pinned&hashContains=${encodeURIComponent(cid)}`,
    { headers: { Authorization: `Bearer ${config.pinataJwt}` } },
    config
  );
  const body = await response.json();
  return Array.isArray(body.rows) && body.rows.some((row) => row.ipfs_pin_hash === cid);
};

const uploadFileToIPFS = async (filePath, metadata = {}) => {
  const config = getIpfsConfig();
  const stat = await fs.promises.stat(filePath).catch(() => null);
  if (!stat?.isFile()) {
    throw new IpfsServiceError("Certificate upload file was not found.", { statusCode: 500, code: "IPFS_FILE_MISSING" });
  }

  const allowedMetadata = {
    credentialId: metadata.credentialId,
    institutionId: metadata.institutionId,
    studentNumber: metadata.studentNumber,
    qualification: metadata.qualification,
    issueDate: metadata.issueDate,
    certificateHash: metadata.certificateHash,
  };
  Object.keys(allowedMetadata).forEach((key) => allowedMetadata[key] == null && delete allowedMetadata[key]);

  const form = new FormData();
  const bytes = await fs.promises.readFile(filePath);
  form.append("file", new Blob([bytes], { type: "application/pdf" }), path.basename(filePath));
  form.append("pinataMetadata", JSON.stringify({ name: `credential-${metadata.credentialId || "pending"}.pdf`, keyvalues: allowedMetadata }));
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const response = await requestPinata(
    `${config.apiUrl}/pinning/pinFileToIPFS`,
    { method: "POST", headers: { Authorization: `Bearer ${config.pinataJwt}` }, body: form },
    config
  );
  const body = await response.json();
  const cid = body.IpfsHash;
  if (!validateCid(cid)) {
    throw new IpfsServiceError("The IPFS provider returned an invalid CID.", { statusCode: 502, code: "IPFS_INVALID_CID" });
  }
  const pinned = await checkPinStatus(cid);
  if (!pinned) {
    throw new IpfsServiceError("The uploaded certificate was not confirmed as pinned.", { statusCode: 503, code: "IPFS_NOT_PINNED", retryable: true });
  }
  return {
    cid,
    gatewayUrl: `${config.gatewayUrl}/${encodeURIComponent(cid)}`,
    provider: config.provider,
    pinned,
    uploadedAt: new Date().toISOString(),
  };
};

const unpinFile = async (cid) => {
  if (!validateCid(cid)) throw new IpfsServiceError("Invalid IPFS CID.", { statusCode: 500, code: "INVALID_CID" });
  const config = getIpfsConfig();
  await requestPinata(
    `${config.apiUrl}/pinning/unpin/${encodeURIComponent(cid)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${config.pinataJwt}` } },
    config
  );
  return { cid, unpinned: true, provider: config.provider };
};

module.exports = {
  uploadFileToIPFS,
  getGatewayUrl,
  checkPinStatus,
  unpinFile,
  validateCid,
  IpfsServiceError,
};
