-- Add Stripe Connect support to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS payout_enabled BOOLEAN DEFAULT false;

-- Add indexes for Stripe lookups
CREATE INDEX IF NOT EXISTS agents_stripe_account_idx ON agents(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- Extend payments table for Stripe and escrow
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS escrow_status TEXT DEFAULT NULL; -- 'held', 'released', 'refunded'
ALTER TABLE payments ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS task_id TEXT; -- Reference to task if payment is for a task
ALTER TABLE payments ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(18, 6) DEFAULT 0; -- Platform fee amount
ALTER TABLE payments ADD COLUMN IF NOT EXISTS net_amount DECIMAL(18, 6); -- Amount after platform fee

-- Indexes for payment lookups
CREATE INDEX IF NOT EXISTS payments_stripe_pi_idx ON payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_escrow_idx ON payments(escrow_status) WHERE escrow_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_task_idx ON payments(task_id) WHERE task_id IS NOT NULL;

-- Create tasks table for escrow flow
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Parties
  requester_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  requester_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  provider_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL NOT NULL,
  
  -- Task details
  skill_id TEXT NOT NULL,
  description TEXT,
  input_data JSONB,
  output_data JSONB,
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, failed, cancelled
  
  -- Payment
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  agreed_price DECIMAL(18, 6) NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Timing
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  deadline TIMESTAMP
);

CREATE INDEX IF NOT EXISTS tasks_requester_user_idx ON tasks(requester_user_id);
CREATE INDEX IF NOT EXISTS tasks_provider_agent_idx ON tasks(provider_agent_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);

-- Enable RLS on tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_service_all" ON tasks
    FOR ALL USING (current_setting('role') = 'service_role');

-- Function to update agent revenue on payment completion
CREATE OR REPLACE FUNCTION update_agent_revenue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.to_agent_id IS NOT NULL THEN
    UPDATE agent_stats 
    SET 
      total_revenue = total_revenue + COALESCE(NEW.net_amount, NEW.amount),
      total_transactions = total_transactions + 1,
      successful_transactions = successful_transactions + 1,
      updated_at = now()
    WHERE agent_id = NEW.to_agent_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for revenue updates
DROP TRIGGER IF EXISTS payment_completed_trigger ON payments;
CREATE TRIGGER payment_completed_trigger
  AFTER UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_revenue();
