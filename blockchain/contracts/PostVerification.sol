// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PostVerification {
    struct PostRecord {
        uint256 recordId;
        string postUrl;
        string contentHash;
        uint256 timestamp;
        address submitter;
    }

    uint256 private nextRecordId = 1;
    mapping(string => PostRecord) private records;

    event PostRegistered(
        uint256 indexed recordId,
        string postUrl,
        string contentHash,
        uint256 timestamp,
        address indexed submitter
    );

    function registerPost(
        string calldata postUrl,
        string calldata contentHash
    ) external returns (uint256 recordId) {
        require(bytes(postUrl).length > 0, "Post URL is required");
        require(bytes(contentHash).length > 0, "Content hash is required");

        recordId = nextRecordId++;
        uint256 registeredAt = block.timestamp;
        records[postUrl] = PostRecord(
            recordId,
            postUrl,
            contentHash,
            registeredAt,
            msg.sender
        );

        emit PostRegistered(recordId, postUrl, contentHash, registeredAt, msg.sender);
    }

    function getPost(string calldata postUrl)
        external
        view
        returns (PostRecord memory)
    {
        require(records[postUrl].recordId != 0, "Post is not registered");
        return records[postUrl];
    }

    function verifyPost(
        string calldata postUrl,
        string calldata contentHash
    ) external view returns (bool) {
        PostRecord memory record = records[postUrl];
        return record.recordId != 0 && keccak256(bytes(record.contentHash)) == keccak256(bytes(contentHash));
    }
}
