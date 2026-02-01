-- ERC-8004 On-Chain Identity Support
-- Add fields for linking ClawdNet agents to on-chain ERC-8004 identities

-- Add ERC-8004 on-chain identity fields to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS erc8004_token_id BIGINT; -- On-chain tokenId (agentId in ERC-8004)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS erc8004_registry TEXT; -- Format: "eip155:chainId:address"
ALTER TABLE agents ADD COLUMN IF NOT EXISTS erc8004_domain TEXT; -- The registered domain (e.g., "myagent.clawdnet.xyz")
ALTER TABLE agents ADD COLUMN IF NOT EXISTS erc8004_claimed_at TIMESTAMP; -- When on-chain identity was claimed
ALTER TABLE agents ADD COLUMN IF NOT EXISTS erc8004_metadata_uri TEXT; -- IPFS/HTTPS URI to registration file

-- Add ERC-8004 on-chain reputation sync tracking
ALTER TABLE agents ADD COLUMN IF NOT EXISTS erc8004_reputation_synced_at TIMESTAMP; -- Last reputation sync
ALTER TABLE agents ADD COLUMN IF NOT EXISTS erc8004_reputation_tx_hash TEXT; -- Last sync tx hash

-- Add index for looking up by on-chain identity
CREATE INDEX IF NOT EXISTS agents_erc8004_token_idx ON agents(erc8004_token_id) WHERE erc8004_token_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS agents_erc8004_domain_idx ON agents(erc8004_domain) WHERE erc8004_domain IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS agents_erc8004_registry_token_idx 
  ON agents(erc8004_registry, erc8004_token_id) 
  WHERE erc8004_registry IS NOT NULL AND erc8004_token_id IS NOT NULL;

-- Table to store on-chain feedback references (for synced reviews)
CREATE TABLE IF NOT EXISTS erc8004_feedback_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ClawdNet references
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  
  -- On-chain references
  chain_id INTEGER NOT NULL,
  registry_address TEXT NOT NULL,
  erc8004_agent_id BIGINT NOT NULL, -- On-chain tokenId
  feedback_index BIGINT NOT NULL, -- On-chain feedback index
  client_address TEXT NOT NULL, -- Wallet that submitted feedback
  
  -- Transaction details
  tx_hash TEXT NOT NULL,
  block_number BIGINT,
  
  -- Metadata
  value INTEGER NOT NULL, -- The feedback value (e.g., 1-100)
  value_decimals INTEGER DEFAULT 0,
  tag1 TEXT,
  tag2 TEXT,
  
  synced_at TIMESTAMP DEFAULT now() NOT NULL,
  
  CONSTRAINT erc8004_feedback_unique UNIQUE (chain_id, registry_address, erc8004_agent_id, feedback_index)
);

CREATE INDEX IF NOT EXISTS erc8004_feedback_agent_idx ON erc8004_feedback_sync(agent_id);
CREATE INDEX IF NOT EXISTS erc8004_feedback_review_idx ON erc8004_feedback_sync(review_id);

-- Enable RLS
ALTER TABLE erc8004_feedback_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erc8004_feedback_service_all" ON erc8004_feedback_sync
    FOR ALL USING (current_setting('role') = 'service_role');

-- Add comments for documentation
COMMENT ON COLUMN agents.erc8004_token_id IS 'On-chain ERC-8004 agentId (tokenId in the NFT registry)';
COMMENT ON COLUMN agents.erc8004_registry IS 'Registry identifier in format eip155:chainId:contractAddress';
COMMENT ON COLUMN agents.erc8004_domain IS 'Registered domain pointing to registration file';
COMMENT ON COLUMN agents.erc8004_claimed_at IS 'Timestamp when on-chain identity was claimed';
COMMENT ON COLUMN agents.erc8004_metadata_uri IS 'URI (IPFS/HTTPS) to the ERC-8004 registration file';
