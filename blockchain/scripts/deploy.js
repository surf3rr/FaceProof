const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const PostVerification = await hre.ethers.getContractFactory("PostVerification");
  const contract = await PostVerification.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const deployment = {
    contractAddress: address,
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString()
  };
  fs.writeFileSync(
    path.join(__dirname, "..", "deployments.local.json"),
    JSON.stringify(deployment, null, 2) + "\n",
    "utf8"
  );
  console.log(`Contract deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
