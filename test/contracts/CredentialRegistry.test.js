const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CredentialRegistry", function () {
  let registry;
  let administrator;
  let institution;
  let otherInstitution;
  let outsider;
  let hash;

  beforeEach(async function () {
    [administrator, institution, otherInstitution, outsider] = await ethers.getSigners();
    registry = await ethers.deployContract("CredentialRegistry", [administrator.address]);
    await registry.waitForDeployment();
    hash = ethers.sha256(ethers.toUtf8Bytes("certificate-one"));
  });

  async function authorise(wallet = institution) {
    await registry.connect(administrator).authoriseInstitution(wallet.address);
  }

  async function issue(certificateHash = hash) {
    await authorise();
    await registry.connect(institution).issueCredential(certificateHash);
  }

  describe("deployment", function () {
    it("deploys successfully", async function () {
      expect(await registry.getAddress()).to.be.properAddress;
    });
    it("assigns administrator role correctly", async function () {
      expect(await registry.hasRole(await registry.DEFAULT_ADMIN_ROLE(), administrator.address)).to.equal(true);
    });
    it("does not assign administrator role to another wallet", async function () {
      expect(await registry.hasRole(await registry.DEFAULT_ADMIN_ROLE(), outsider.address)).to.equal(false);
    });
    it("starts unpaused", async function () {
      expect(await registry.paused()).to.equal(false);
    });
  });

  describe("institution management", function () {
    it("administrator can authorise an institution", async function () {
      await authorise();
      expect(await registry.isAuthorisedInstitution(institution.address)).to.equal(true);
    });
    it("emits InstitutionAuthorised", async function () {
      await expect(registry.authoriseInstitution(institution.address))
        .to.emit(registry, "InstitutionAuthorised")
        .withArgs(institution.address, administrator.address);
    });
    it("non-administrator cannot authorise an institution", async function () {
      await expect(registry.connect(outsider).authoriseInstitution(institution.address))
        .to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });
    it("administrator can deactivate an institution", async function () {
      await authorise();
      await registry.deactivateInstitution(institution.address);
      expect(await registry.isAuthorisedInstitution(institution.address)).to.equal(false);
    });
    it("emits InstitutionDeactivated", async function () {
      await authorise();
      await expect(registry.deactivateInstitution(institution.address))
        .to.emit(registry, "InstitutionDeactivated")
        .withArgs(institution.address, administrator.address);
    });
    it("rejects duplicate authorisation", async function () {
      await authorise();
      await expect(registry.authoriseInstitution(institution.address))
        .to.be.revertedWithCustomError(registry, "InstitutionAlreadyAuthorised");
    });
    it("rejects zero-address authorisation", async function () {
      await expect(registry.authoriseInstitution(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(registry, "ZeroAddress");
    });
    it("rejects deactivation of an unauthorised wallet", async function () {
      await expect(registry.deactivateInstitution(institution.address))
        .to.be.revertedWithCustomError(registry, "InstitutionNotAuthorised");
    });
  });

  describe("credential issuance", function () {
    it("authorised institution can issue", async function () {
      await issue();
      expect(await registry.credentialExists(hash)).to.equal(true);
    });
    it("unauthorised wallet cannot issue", async function () {
      await expect(registry.connect(outsider).issueCredential(hash))
        .to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });
    it("rejects zero certificate hash", async function () {
      await authorise();
      await expect(registry.connect(institution).issueCredential(ethers.ZeroHash))
        .to.be.revertedWithCustomError(registry, "ZeroCertificateHash");
    });
    it("rejects duplicate certificate hash", async function () {
      await issue();
      await expect(registry.connect(institution).issueCredential(hash))
        .to.be.revertedWithCustomError(registry, "CredentialAlreadyExists");
    });
    it("records the issuer wallet", async function () {
      await issue();
      expect((await registry.verifyCredential(hash)).issuer).to.equal(institution.address);
    });
    it("records a nonzero issue timestamp", async function () {
      await issue();
      expect((await registry.verifyCredential(hash)).issuedAt).to.be.greaterThan(0);
    });
    it("emits CredentialIssued", async function () {
      await authorise();
      await expect(registry.connect(institution).issueCredential(hash))
        .to.emit(registry, "CredentialIssued");
    });
    it("retrieves an active credential", async function () {
      await issue();
      const credential = await registry.verifyCredential(hash);
      expect(credential.exists).to.equal(true);
      expect(credential.revoked).to.equal(false);
      expect(credential.revokedAt).to.equal(0);
    });
  });

  describe("revocation", function () {
    it("original authorised issuer can revoke", async function () {
      await issue();
      await registry.connect(institution).revokeCredential(hash);
      expect((await registry.verifyCredential(hash)).revoked).to.equal(true);
    });
    it("unknown credential cannot be revoked", async function () {
      await authorise();
      await expect(registry.connect(institution).revokeCredential(hash))
        .to.be.revertedWithCustomError(registry, "CredentialNotFound");
    });
    it("already-revoked credential cannot be revoked again", async function () {
      await issue();
      await registry.connect(institution).revokeCredential(hash);
      await expect(registry.connect(institution).revokeCredential(hash))
        .to.be.revertedWithCustomError(registry, "CredentialAlreadyRevoked");
    });
    it("revocation persists", async function () {
      await issue();
      await registry.connect(institution).revokeCredential(hash);
      expect((await registry.verifyCredential(hash)).revoked).to.equal(true);
    });
    it("records revocation timestamp", async function () {
      await issue();
      await registry.connect(institution).revokeCredential(hash);
      expect((await registry.verifyCredential(hash)).revokedAt).to.be.greaterThan(0);
    });
    it("emits CredentialRevoked", async function () {
      await issue();
      await expect(registry.connect(institution).revokeCredential(hash))
        .to.emit(registry, "CredentialRevoked");
    });
    it("another authorised institution cannot revoke someone else's proof", async function () {
      await issue();
      await authorise(otherInstitution);
      await expect(registry.connect(otherInstitution).revokeCredential(hash))
        .to.be.revertedWithCustomError(registry, "NotCredentialIssuer");
    });
  });

  describe("pausing", function () {
    it("administrator can pause", async function () {
      await registry.pause();
      expect(await registry.paused()).to.equal(true);
    });
    it("non-administrator cannot pause", async function () {
      await expect(registry.connect(outsider).pause())
        .to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
    });
    it("issuance fails while paused", async function () {
      await authorise();
      await registry.pause();
      await expect(registry.connect(institution).issueCredential(hash))
        .to.be.revertedWithCustomError(registry, "EnforcedPause");
    });
    it("revocation fails while paused", async function () {
      await issue();
      await registry.pause();
      await expect(registry.connect(institution).revokeCredential(hash))
        .to.be.revertedWithCustomError(registry, "EnforcedPause");
    });
    it("administrator can unpause", async function () {
      await registry.pause();
      await registry.unpause();
      expect(await registry.paused()).to.equal(false);
    });
    it("issuance works after unpausing", async function () {
      await authorise();
      await registry.pause();
      await registry.unpause();
      await registry.connect(institution).issueCredential(hash);
      expect(await registry.credentialExists(hash)).to.equal(true);
    });
  });

  describe("verification", function () {
    it("unknown hash returns exists false", async function () {
      expect((await registry.verifyCredential(hash)).exists).to.equal(false);
    });
    it("active credential returns exists true and revoked false", async function () {
      await issue();
      const result = await registry.verifyCredential(hash);
      expect(result.exists).to.equal(true);
      expect(result.revoked).to.equal(false);
    });
    it("revoked credential remains queryable", async function () {
      await issue();
      await registry.connect(institution).revokeCredential(hash);
      const result = await registry.verifyCredential(hash);
      expect(result.exists).to.equal(true);
      expect(result.revoked).to.equal(true);
    });
  });
});
