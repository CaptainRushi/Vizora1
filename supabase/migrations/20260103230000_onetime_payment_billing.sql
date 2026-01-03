-- ONE-TIME PAYMENT BILLING SYSTEM
-- No subscriptions, no auto-renew, no webhooks
-- Every payment = fixed 30-day validity

-- 1. Update billing_plans to include validity_days
alter table billing_plans add column if not exists validity_days int not null default 30;

-- Update existing plans with validity
update billing_plans set validity_days = 0 where id = 'free';
update billing_plans set validity_days = 30 where id = 'pro';
update billing_plans set validity_days = 30 where id = 'teams';
update billing_plans set validity_days = 30 where id = 'business';

-- 2. Create payments table (payment log)
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  plan_id text references billing_plans(id),
  razorpay_order_id text,
  razorpay_payment_id text,
  amount int not null,
  status text not null check (status in ('created', 'paid', 'failed')) default 'created',
  created_at timestamptz default now()
);

-- Index for faster lookups
create index if not exists idx_payments_workspace on payments(workspace_id);
create index if not exists idx_payments_order on payments(razorpay_order_id);

-- Enable RLS
alter table payments enable row level security;

-- Workspace owners can view their payment history
create policy "Workspace owners view payments" on payments
  for select using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

-- 3. Update workspace_billing to use expiry-based model
alter table workspace_billing add column if not exists start_at timestamptz;
alter table workspace_billing add column if not exists expires_at timestamptz;
alter table workspace_billing add column if not exists last_payment_id uuid references payments(id);

-- Drop old columns if they exist
alter table workspace_billing drop column if exists current_period_start;
alter table workspace_billing drop column if exists current_period_end;

-- Update status constraint to match new model
alter table workspace_billing drop constraint if exists workspace_billing_status_check;
alter table workspace_billing add constraint workspace_billing_status_check 
  check (status in ('active', 'expired'));

-- 4. Function to check if plan is expired
create or replace function is_plan_expired(ws_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  expiry timestamptz;
begin
  select expires_at into expiry
  from workspace_billing
  where workspace_id = ws_id;
  
  if expiry is null then
    return true;
  end if;
  
  return expiry < now();
end;
$$;

-- 5. Initialize free workspaces with no expiry
update workspace_billing 
set 
  status = 'active',
  start_at = now(),
  expires_at = null  -- Free never expires
where plan_id = 'free' and expires_at is null;

-- 6. Create view for active plans (with expiry check)
create or replace view workspace_active_plans as
select 
  wb.workspace_id,
  case 
    when wb.expires_at is null then wb.plan_id  -- Free plan
    when wb.expires_at > now() then wb.plan_id  -- Paid plan still valid
    else 'free'  -- Expired, fallback to free
  end as active_plan_id,
  wb.expires_at,
  case
    when wb.expires_at is null then false
    when wb.expires_at > now() then false
    else true
  end as is_expired,
  bp.*
from workspace_billing wb
join billing_plans bp on bp.id = (
  case 
    when wb.expires_at is null then wb.plan_id
    when wb.expires_at > now() then wb.plan_id
    else 'free'
  end
);

-- Grant access to the view
grant select on workspace_active_plans to authenticated, anon;
