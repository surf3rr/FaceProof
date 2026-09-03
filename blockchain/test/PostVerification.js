const { expect } = require("chai");
const { ethers } = require("hardhat");
const { canonicalJson, sha256Fingerprint } = require("../src/blockchainService");

async function deploy() {
  const factory = await ethers.getContractFactory("PostVerification");
  return factory.deploy();
}

describe("PostVerification", function () {
  it("registers and retrieves a post record", async function () {
    const contract = await deploy();
    const url = "https://social.example/post/1";
    const hash = sha256Fingerprint({ post_url: url, title: "A post", source: "Social" });
    const transaction = await contract.registerPost(url, hash);
    const receipt = await transaction.wait();
    const record = await contract.getPost(url);

    expect(record.recordId).to.equal(1n);
    expect(record.postUrl).to.equal(url);
    expect(record.contentHash).to.equal(hash);
    expect(record.submitter).to.equal((await ethers.getSigners())[0].address);
    expect(receipt.logs.length).to.be.greaterThan(0);
  });

  it("verifies unchanged data and rejects modified text and URL", async function () {
    const contract = await deploy();
    const post = { post_url: "https://social.example/post/2", title: "Original", source: "Social" };
    await contract.registerPost(post.post_url, sha256Fingerprint(post));

    expect(await contract.verifyPost(post.post_url, sha256Fingerprint(post))).to.equal(true);
    expect(await contract.verifyPost(post.post_url, sha256Fingerprint({ ...post, title: "Modified" }))).to.equal(false);
    expect(await contract.verifyPost("https://social.example/post/changed", sha256Fingerprint(post))).to.equal(false);
  });

  it("registers and verifies multiple posts independently", async function () {
    const contract = await deploy();
    const first = { post_url: "https://social.example/a", title: "First" };
    const second = { post_url: "https://social.example/b", title: "Second" };
    await contract.registerPost(first.post_url, sha256Fingerprint(first));
    await contract.registerPost(second.post_url, sha256Fingerprint(second));

    expect(await contract.verifyPost(first.post_url, sha256Fingerprint(first))).to.equal(true);
    expect(await contract.verifyPost(second.post_url, sha256Fingerprint(second))).to.equal(true);
    expect((await contract.getPost(second.post_url)).recordId).to.equal(2n);
  });

  it("canonicalizes equivalent key order to the same SHA-256 fingerprint", function () {
    const first = { title: "Same", post_url: "https://social.example/same", source: "Social" };
    const second = { source: "Social", post_url: "https://social.example/same", title: "Same" };
    expect(canonicalJson(first)).to.equal(canonicalJson(second));
    expect(sha256Fingerprint(first)).to.equal(sha256Fingerprint(second));
  });
});
