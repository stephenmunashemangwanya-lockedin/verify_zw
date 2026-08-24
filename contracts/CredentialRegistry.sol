// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title CredentialRegistry
 * @notice Stores only SHA-256 certificate proofs and lifecycle timestamps.
 * @dev Application metadata and documents remain in PostgreSQL/IPFS. The
 *      default administrator controls institution roles and emergency pause;
 *      each institution may revoke only proofs it originally issued.
 */
contract CredentialRegistry is AccessControl, Pausable {
    bytes32 public constant INSTITUTION_ROLE = keccak256("INSTITUTION_ROLE");

    struct Credential {
        address issuer;
        uint64 issuedAt;
        uint64 revokedAt;
        bool exists;
        bool revoked;
    }

    mapping(bytes32 certificateHash => Credential) private credentials;

    error ZeroAddress();
    error ZeroCertificateHash();
    error InstitutionAlreadyAuthorised(address institution);
    error InstitutionNotAuthorised(address institution);
    error CredentialAlreadyExists(bytes32 certificateHash);
    error CredentialNotFound(bytes32 certificateHash);
    error CredentialAlreadyRevoked(bytes32 certificateHash);
    error NotCredentialIssuer(address caller, address issuer);

    event InstitutionAuthorised(address indexed institution, address indexed authorisedBy);
    event InstitutionDeactivated(address indexed institution, address indexed deactivatedBy);
    event CredentialIssued(bytes32 indexed certificateHash, address indexed issuer, uint256 issuedAt);
    event CredentialRevoked(bytes32 indexed certificateHash, address indexed revokedBy, uint256 revokedAt);

    /** @param administrator Initial holder of DEFAULT_ADMIN_ROLE. */
    constructor(address administrator) {
        if (administrator == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, administrator);
    }

    /** Authorise an active institution wallet to issue credential proofs. */
    function authoriseInstitution(address institutionWallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (institutionWallet == address(0)) revert ZeroAddress();
        if (hasRole(INSTITUTION_ROLE, institutionWallet)) {
            revert InstitutionAlreadyAuthorised(institutionWallet);
        }
        _grantRole(INSTITUTION_ROLE, institutionWallet);
        emit InstitutionAuthorised(institutionWallet, msg.sender);
    }

    /** Remove issuance and revocation authority from an institution wallet. */
    function deactivateInstitution(address institutionWallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!hasRole(INSTITUTION_ROLE, institutionWallet)) {
            revert InstitutionNotAuthorised(institutionWallet);
        }
        _revokeRole(INSTITUTION_ROLE, institutionWallet);
        emit InstitutionDeactivated(institutionWallet, msg.sender);
    }

    /** Return whether a wallet currently holds the institution role. */
    function isAuthorisedInstitution(address wallet) external view returns (bool) {
        return hasRole(INSTITUTION_ROLE, wallet);
    }

    /** Register one immutable SHA-256 digest as a credential proof. */
    function issueCredential(bytes32 certificateHash) external onlyRole(INSTITUTION_ROLE) whenNotPaused {
        if (certificateHash == bytes32(0)) revert ZeroCertificateHash();
        if (credentials[certificateHash].exists) revert CredentialAlreadyExists(certificateHash);

        uint64 timestamp = uint64(block.timestamp);
        credentials[certificateHash] = Credential({
            issuer: msg.sender,
            issuedAt: timestamp,
            revokedAt: 0,
            exists: true,
            revoked: false
        });
        emit CredentialIssued(certificateHash, msg.sender, timestamp);
    }

    /** Revoke a proof. Only its original, currently authorised issuer may act. */
    function revokeCredential(bytes32 certificateHash) external onlyRole(INSTITUTION_ROLE) whenNotPaused {
        Credential storage credential = credentials[certificateHash];
        if (!credential.exists) revert CredentialNotFound(certificateHash);
        if (credential.revoked) revert CredentialAlreadyRevoked(certificateHash);
        if (credential.issuer != msg.sender) revert NotCredentialIssuer(msg.sender, credential.issuer);

        credential.revoked = true;
        credential.revokedAt = uint64(block.timestamp);
        emit CredentialRevoked(certificateHash, msg.sender, credential.revokedAt);
    }

    /** Retrieve proof state without exposing any off-chain personal metadata. */
    function verifyCredential(bytes32 certificateHash)
        external
        view
        returns (bool exists, bool revoked, address issuer, uint64 issuedAt, uint64 revokedAt)
    {
        Credential memory credential = credentials[certificateHash];
        return (
            credential.exists,
            credential.revoked,
            credential.issuer,
            credential.issuedAt,
            credential.revokedAt
        );
    }

    /** Return whether the digest has ever been issued, including if revoked. */
    function credentialExists(bytes32 certificateHash) external view returns (bool) {
        return credentials[certificateHash].exists;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
