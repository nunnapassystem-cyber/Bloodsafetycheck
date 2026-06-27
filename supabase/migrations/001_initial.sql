CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS transfusion_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ward_id         TEXT NOT NULL,
  wristband_id    TEXT NOT NULL,
  blood_bag_id    TEXT NOT NULL,
  blood_component TEXT NOT NULL CHECK (blood_component IN ('PRC','FFP','Platelet','WB')),
  blood_group_bag TEXT NOT NULL,
  match_result    TEXT NOT NULL CHECK (match_result IN ('PASS','FAIL')),
  alert_reason    TEXT,
  nurse_1_name    TEXT NOT NULL,
  nurse_2_name    TEXT NOT NULL,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE transfusion_logs ENABLE ROW LEVEL SECURITY;

-- Ward staff see only their ward
CREATE POLICY "ward_isolation" ON transfusion_logs
  FOR ALL USING (ward_id = auth.jwt() ->> 'ward_id');

-- Admin sees all wards (evaluated after ward_isolation, additive)
CREATE POLICY "admin_all" ON transfusion_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
