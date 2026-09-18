const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { resolveContractAddress, validateResolvedContract, getBlockchainConfig } = require("../backend/config/blockchain");
const original = { ...process.env };
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "zsvp-runtime-"));
const deploymentPath = path.join(directory, "CredentialRegistry.json");
const address = "0x0000000000000000000000000000000000000001";
const otherAddress = "0x0000000000000000000000000000000000000002";
const metadata = { network: "localhost", chainId: 31337, contractAddress: address };
const local = { network: "localhost", chainId: 31337, deploymentPath };
test.beforeEach(() => {
  fs.writeFileSync(deploymentPath, JSON.stringify(metadata));
  Object.assign(process.env, { BLOCKCHAIN_ENABLED: "true", BLOCKCHAIN_NETWORK: "localhost", BLOCKCHAIN_RPC_URL: "http://blockchain:8545", BLOCKCHAIN_CHAIN_ID: "31337", LOCAL_DEPLOYMENT_PATH: deploymentPath });
  delete process.env.CONTRACT_ADDRESS;
  delete process.env.DEPLOYER_PRIVATE_KEY;
});
test.afterEach(() => { process.env = { ...original }; });
test.after(() => fs.rmSync(directory, { recursive: true, force: true }));

test("local runtime resolves metadata without an environment address or signer", () => {
  const config = getBlockchainConfig({ requireSigner: false });
  assert.equal(config.contractAddress, address);
  assert.equal(config.privateKey, null);
});
test("current local metadata wins over stale environment and is reread", () => {
  process.env.CONTRACT_ADDRESS = otherAddress;
  assert.equal(getBlockchainConfig({ requireSigner: false }).contractAddress, address);
  fs.writeFileSync(deploymentPath, JSON.stringify({ ...metadata, contractAddress: otherAddress }));
  assert.equal(getBlockchainConfig({ requireSigner: false }).contractAddress, otherAddress);
});
test("external networks use their explicit address without local metadata", () => {
  fs.unlinkSync(deploymentPath);
  assert.equal(resolveContractAddress({ network: "sepolia", chainId: 11155111, contractAddress: otherAddress, deploymentPath }), otherAddress);
});
test("missing local metadata fails closed rather than using a stale environment address", () => {
  fs.unlinkSync(deploymentPath);
  assert.throws(() => resolveContractAddress({ ...local, contractAddress: otherAddress }), /metadata is missing/);
});
for (const [label, value] of [
  ["invalid JSON", "{"], ["null metadata", "null"],
  ["wrong chain", JSON.stringify({ ...metadata, chainId: 1 })],
  ["wrong network", JSON.stringify({ ...metadata, network: "sepolia" })],
  ["bad address", JSON.stringify({ ...metadata, contractAddress: "invalid" })],
  ["zero address", JSON.stringify({ ...metadata, contractAddress: "0x" + "0".repeat(40) })],
]) test(`${label} is a controlled configuration failure`, () => {
  fs.writeFileSync(deploymentPath, value);
  assert.throws(() => resolveContractAddress(local), { code: "BLOCKCHAIN_CONFIGURATION_ERROR" });
});
test("bytecode validation checks the resolved address and expected chain", async () => {
  let requested;
  await validateResolvedContract({ chainId: 31337, contractAddress: address }, {
    getNetwork: async () => ({ chainId: 31337n }),
    getCode: async value => { requested = value; return "0x6000"; },
  });
  assert.equal(requested, address);
});
test("missing bytecode and wrong chain fail closed", async () => {
  const config = { chainId: 31337, contractAddress: address };
  await assert.rejects(validateResolvedContract(config, { getNetwork: async () => ({ chainId: 31337n }), getCode: async () => "0x" }), { reason: "contract_missing" });
  await assert.rejects(validateResolvedContract(config, { getNetwork: async () => ({ chainId: 1n }), getCode: async () => { throw new Error("must not run"); } }), { reason: "wrong_chain" });
});
test("RPC errors cannot expose their URL or credentials", async () => {
  await assert.rejects(validateResolvedContract({ chainId: 31337, contractAddress: address }, { getNetwork: async () => { throw new Error("sensitive upstream detail"); } }), error => error.code === "BLOCKCHAIN_CONFIGURATION_ERROR" && !error.message.includes("sensitive"));
});
test("local configuration requires no private key; external writes fail closed", () => {
  assert.equal(getBlockchainConfig({ requireSigner: false }).contractAddress, address);
  assert.equal(getBlockchainConfig().privateKey, null);
  Object.assign(process.env, { BLOCKCHAIN_NETWORK: "sepolia", BLOCKCHAIN_CHAIN_ID: "11155111", BLOCKCHAIN_RPC_URL: "https://rpc.example.test", CONTRACT_ADDRESS: address });
  assert.throws(() => getBlockchainConfig(), error => error.code === "BLOCKCHAIN_CONFIGURATION_ERROR" && error.message.includes("DEPLOYER_PRIVATE_KEY"));
});

test("readiness uses metadata without signer and fails on missing contract", async () => {
  const { blockchainHealth } = require("../backend/services/healthService");
  let requested;
  const dependencies = {
    provider: { getNetwork: async () => ({ chainId: 31337n }), getCode: async value => { requested = value; return "0x6000"; } },
    contract: { credentialExists: async () => false },
  };
  assert.equal((await blockchainHealth(dependencies)).status, "healthy");
  assert.equal(requested, address);
  dependencies.provider.getCode = async () => "0x";
  assert.equal((await blockchainHealth(dependencies)).status, "contract_missing");
  fs.unlinkSync(deploymentPath);
  assert.equal((await blockchainHealth(dependencies)).status, "misconfigured");
});

test("authorization, issuance, revocation and reads share metadata resolution", async () => {
  const ethersPath = require.resolve("ethers");
  const actualEthers = require(ethersPath);
  const servicePath = require.resolve("../backend/services/blockchainService");
  const signerPath = require.resolve("../backend/config/blockchainSigner");

  const existingService = require.cache[servicePath];
  const existingSignerModule = require.cache[signerPath];

  const calls = [];

  let authorised = false;
  let exists = false;
  let revoked = false;
  let credentialIssuer = null;
  let adminRoleAvailable = true;

  const makeTransaction = (from) => ({
    hash: "0x" + "a".repeat(64),
    from,
    wait: async () => ({
      status: 1,
      blockNumber: 1,
    }),
  });

  class Signer {
    constructor(value = address) {
      this.address = actualEthers.isAddress(value)
        ? actualEthers.getAddress(value)
        : address;
    }

    async getAddress() {
      return this.address;
    }
  }

  class Provider {
    async listAccounts() {
      return [
        {
          getAddress: async () => address,
        },
        {
          getAddress: async () => otherAddress,
        },
      ];
    }

    async getSigner(value) {
      calls.push(["rpcSigner", value]);
      return new Signer(value);
    }

    async getNetwork() {
      return {
        chainId: 31337n,
      };
    }

    async getCode(value) {
      calls.push(["bytecode", value]);
      return "0x6000";
    }
  }

  class Registry {
    constructor(contractAddress, _abi, runner) {
      calls.push(["contract", contractAddress]);
      this.runner = runner;
    }

    async DEFAULT_ADMIN_ROLE() {
      return "0x" + "0".repeat(64);
    }

    async hasRole(_role, candidate) {
      return (
        adminRoleAvailable &&
        candidate === address
      );
    }

    async paused() {
      return false;
    }

    async isAuthorisedInstitution(wallet) {
      return (
        authorised &&
        wallet === otherAddress
      );
    }

    async authoriseInstitution(wallet) {
      calls.push([
        "authorise",
        wallet,
      ]);

      authorised = true;

      const from =
        await this.runner.getAddress();

      return makeTransaction(from);
    }

    async verifyCredential() {
      return {
        exists,
        revoked,
        issuer:
          credentialIssuer ||
          otherAddress,
        issuedAt: exists ? 1n : 0n,
        revokedAt: revoked
          ? 2n
          : 0n,
      };
    }

    async issueCredential() {
      const from =
        await this.runner.getAddress();

      calls.push([
        "issue",
        from,
      ]);

      exists = true;
      revoked = false;
      credentialIssuer = from;

      return makeTransaction(from);
    }

    async revokeCredential() {
      const from =
        await this.runner.getAddress();

      calls.push([
        "revoke",
        from,
      ]);

      revoked = true;

      return makeTransaction(from);
    }
  }

  require.cache[ethersPath].exports = {
    ...actualEthers,
    JsonRpcProvider: Provider,
    Wallet: Signer,
    Contract: Registry,
  };

  delete require.cache[servicePath];
  delete require.cache[signerPath];

  try {
    const service = require(
      servicePath
    );

    /*
     * Platform administrator authorises the institution wallet.
     */
    const authorisationResult =
      await service.authoriseInstitution(
        otherAddress
      );

    assert.equal(
      authorisationResult.confirmed,
      true
    );

    assert.equal(
      authorisationResult.issuerWallet,
      address
    );

    assert.equal(
      authorisationResult.walletAddress,
      otherAddress
    );

    /*
     * Credential issuance must be signed by the institution wallet,
     * not by the platform administrator.
     */
    const issuanceResult =
      await service.issueCredentialOnChain(
        "b".repeat(64),
        {
          expectedInstitutionWallet:
            otherAddress,
        }
      );

    assert.equal(
      issuanceResult.confirmed,
      true
    );

    assert.equal(
      issuanceResult.issuerWallet,
      otherAddress
    );

    /*
     * Credential revocation must also be signed by the institution
     * wallet that originally issued the credential.
     */
    const revocationResult =
      await service.revokeCredentialOnChain(
        "b".repeat(64),
        {
          expectedInstitutionWallet:
            otherAddress,
        }
      );

    assert.equal(
      revocationResult.confirmed,
      true
    );

    assert.equal(
      revocationResult.issuerWallet,
      otherAddress
    );

    /*
     * Read the resulting on-chain credential state.
     */
    const verification =
      await service.verifyCredentialOnChain(
        "b".repeat(64)
      );

    assert.equal(
      verification.exists,
      true
    );

    assert.equal(
      verification.revoked,
      true
    );

    assert.equal(
      verification.issuer,
      otherAddress
    );

    /*
     * Confirm that both the administrator signer and institution
     * signer were resolved through the local RPC.
     */
    assert.ok(
      calls.some(
        ([kind, value]) =>
          kind === "rpcSigner" &&
          value === address
      )
    );

    assert.ok(
      calls.some(
        ([kind, value]) =>
          kind === "rpcSigner" &&
          value === otherAddress
      )
    );

    /*
     * Confirm the correct institution wallet was authorised.
     */
    assert.ok(
      calls.some(
        ([kind, value]) =>
          kind === "authorise" &&
          value === otherAddress
      )
    );

    /*
     * Confirm issuance used the institution wallet.
     */
    assert.ok(
      calls.some(
        ([kind, value]) =>
          kind === "issue" &&
          value === otherAddress
      )
    );

    /*
     * Confirm revocation used the same institution wallet.
     */
    assert.ok(
      calls.some(
        ([kind, value]) =>
          kind === "revoke" &&
          value === otherAddress
      )
    );

    /*
     * Contract resolution must continue to use the deployment
     * metadata address.
     */
    assert.ok(
      calls
        .filter(
          ([kind]) =>
            kind === "contract" ||
            kind === "bytecode"
        )
        .every(
          ([, value]) =>
            value === address
        )
    );

    const {
      resolveBlockchainSigner,
    } = require(
      "../backend/config/blockchainSigner"
    );

    const localConfig =
      getBlockchainConfig();

    /*
     * Local signing must fail closed when no account has the
     * administrator role.
     */
    adminRoleAvailable = false;

    await assert.rejects(
      resolveBlockchainSigner(
        localConfig,
        new Provider()
      ),
      /No unlocked local RPC account/
    );

    /*
     * A signer must never be resolved from the wrong chain.
     */
    await assert.rejects(
      resolveBlockchainSigner(
        localConfig,
        {
          getNetwork: async () => ({
            chainId: 1n,
          }),
        }
      ),
      /chain 31337/
    );

    /*
     * External networks require an explicit administrator key.
     */
    const external = {
      ...localConfig,
      network: "sepolia",
      chainId: 11155111,
      privateKey: null,
    };

    const noRpcFallback = {
      getSigner: () => {
        throw new Error(
          "External RPC fallback forbidden"
        );
      },

      listAccounts: () => {
        throw new Error(
          "External account discovery forbidden"
        );
      },
    };

    await assert.rejects(
      resolveBlockchainSigner(
        external,
        noRpcFallback
      ),
      /requires a valid DEPLOYER_PRIVATE_KEY|requires DEPLOYER_PRIVATE_KEY/
    );

    /*
     * A valid external administrator private key creates a signer.
     */
    assert.ok(
      (
        await resolveBlockchainSigner(
          {
            ...external,
            privateKey:
              "0x" +
              "1".repeat(64),
          },
          noRpcFallback
        )
      ) instanceof Signer
    );
  } finally {
    /*
     * Restore the original ethers module and cached application
     * modules so this test cannot contaminate other tests.
     */
    require.cache[ethersPath].exports =
      actualEthers;

    if (existingService) {
      require.cache[servicePath] =
        existingService;
    } else {
      delete require.cache[
        servicePath
      ];
    }

    if (existingSignerModule) {
      require.cache[signerPath] =
        existingSignerModule;
    } else {
      delete require.cache[
        signerPath
      ];
    }
  }
});