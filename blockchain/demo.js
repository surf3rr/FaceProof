const fs = require("fs");
const path = require("path");
const { registerPost, verifyPost } = require("./src/blockchainService");

async function main() {
  const resultPath = process.argv[2] || path.join("..", "output", "result.json");
  if (!fs.existsSync(resultPath)) {
    throw new Error(`Part 2 output not found: ${resultPath}. Run 'python app.py --dry-run --image samples/demo_face.jpg' first.`);
  }
  const pipelineResult = JSON.parse(fs.readFileSync(resultPath, "utf8"));
  if (!pipelineResult.match || !pipelineResult.canonical_payload) {
    throw new Error("Part 2 output has no matched post. Blockchain registration requires a genuine match.");
  }

  const postData = pipelineResult.canonical_payload;
  console.log("========================================");
  console.log("BLOCKCHAIN POST VERIFICATION");
  console.log("========================================\n");
  console.log(`Post URL:\n${postData.post_url}\n`);

  const registration = await registerPost(postData);
  console.log(`SHA-256:\n${registration.fingerprint}\n`);
  console.log("Registering on local Hardhat blockchain...\n");
  console.log(`Contract:   ${registration.contractAddress}`);
  console.log(`Transaction: ${registration.transactionHash}`);
  console.log(`Block:       ${registration.blockNumber}`);
  console.log(`Status:      ${registration.status}`);
  console.log(`Timestamp:   ${registration.timestamp}\n`);

  const verification = await verifyPost(postData);
  console.log("----------------------------------------");
  console.log("VERIFICATION");
  console.log("----------------------------------------\n");
  console.log(`Recalculated SHA-256:\n${verification.recalculatedFingerprint}`);
  console.log(`Stored SHA-256:\n${verification.storedFingerprint}`);
  console.log(`\nResult: ${verification.result}\n`);

  const tamperedPost = { ...postData, title: `${postData.title || ""} [tampered]` };
  const tampered = await verifyPost(tamperedPost);
  console.log("----------------------------------------");
  console.log("TAMPER TEST");
  console.log("----------------------------------------\n");
  console.log(`Modified post detected: ${tampered.result}`);
}

main().catch((error) => {
  console.error(`Demo failed: ${error.message}`);
  process.exitCode = 1;
});
