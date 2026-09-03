const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ethers } = require("ethers");

const ABI = [
  "function registerPost(string postUrl, string contentHash) returns (uint256)",
  "function getPost(string postUrl) view returns (tuple(uint256 recordId, string postUrl, string contentHash, uint256 timestamp, address submitter))",
  "function verifyPost(string postUrl, string contentHash) view returns (bool)",
  "event PostRegistered(uint256 indexed recordId, string postUrl, string contentHash, uint256 timestamp, address indexed submitter)"
];

function canonicalPostData(postData) {
  const source = postData.canonical_payload || postData;
  const canonical = {};
  for (const key of Object.keys(source).sort()) {
    if (source[key] !== undefined && source[key] !== null) canonical[key] = source[key];
  }
  return canonical;
}

function canonicalJson(postData) {
  return JSON.stringify(canonicalPostData(postData));
}

function sha256Fingerprint(postData) {
  return crypto.createHash("sha256").update(canonicalJson(postData), "utf8").digest("hex");
}

function loadContractAddress() {
  if (process.env.POST_VERIFICATION_CONTRACT) return process.env.POST_VERIFICATION_CONTRACT;
  const deploymentPath = path.join(__dirname, "..", "deployments.local.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("Contract address unavailable. Deploy with: npm run deploy");
  }
  return JSON.parse(fs.readFileSync(deploymentPath, "utf8")).contractAddress;
}

async function createContract() {
  const provider = new ethers.JsonRpcProvider(process.env.HARDHAT_RPC_URL || "http://127.0.0.1:8545");
  const signer = process.env.HARDHAT_PRIVATE_KEY
    ? new ethers.Wallet(process.env.HARDHAT_PRIVATE_KEY, provider)
    : await provider.getSigner(0);
  return new ethers.Contract(loadContractAddress(), ABI, signer);
}

async function registerPost(postData) {
  const postUrl = postData.post_url || postData.url;
  if (!postUrl) throw new Error("Post data must include post_url");
  const fingerprint = sha256Fingerprint(postData);
  const contract = await createContract();
  const transaction = await contract.registerPost(postUrl, fingerprint);
  const receipt = await transaction.wait();
  const event = receipt.logs.map((log) => {
    try { return contract.interface.parseLog(log); } catch (_) { return null; }
  }).find((parsed) => parsed && parsed.name === "PostRegistered");

  return {
    postUrl,
    fingerprint,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    contractAddress: await contract.getAddress(),
    timestamp: event ? Number(event.args.timestamp) : Math.floor(Date.now() / 1000),
    recordId: event ? Number(event.args.recordId) : null,
    status: receipt.status === 1 ? "CONFIRMED" : "FAILED"
  };
}

async function verifyPost(postData) {
  const postUrl = postData.post_url || postData.url;
  if (!postUrl) throw new Error("Post data must include post_url");
  const recalculatedFingerprint = sha256Fingerprint(postData);
  const contract = await createContract();
  const matches = await contract.verifyPost(postUrl, recalculatedFingerprint);

  let stored = null;
  try {
    stored = await contract.getPost(postUrl);
  } catch (_) {
    // An unknown URL is a normal invalid-verification result, not a service failure.
  }

    return {
    postUrl,
    recalculatedFingerprint,
      storedFingerprint: stored ? (stored.contentHash ?? stored[2]) : null,
      recordId: stored ? Number(stored.recordId ?? stored[0]) : null,
      timestamp: stored ? Number(stored.timestamp ?? stored[3]) : null,
      submitter: stored ? (stored.submitter ?? stored[4]) : null,
    contractAddress: await contract.getAddress(),
    verified: matches,
    result: matches ? "VERIFIED" : "TAMPERED/INVALID"
  };
}

module.exports = { canonicalPostData, canonicalJson, sha256Fingerprint, registerPost, verifyPost };
