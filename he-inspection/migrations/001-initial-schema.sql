-- =============================================================================
-- CAT793 Inspection App — Initial Schema
-- Schema: poc_he_inspection
-- Description: Complete schema for heavy equipment daily pre-shift inspections
-- =============================================================================

-- Set the search path for this session
SET search_path TO poc_he_inspection;

-- =============================================================================
-- 1. CREATE ALL TABLES
-- =============================================================================

-- 1.1 Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL,
    settings    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.2 Sites
CREATE TABLE IF NOT EXISTS sites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    timezone    VARCHAR(50) NOT NULL DEFAULT 'UTC',
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.3 Users
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    site_id     UUID REFERENCES sites(id) ON DELETE SET NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    role        VARCHAR(20) NOT NULL CHECK (role IN ('inspector','supervisor','manager','admin')),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.4 Equipment
CREATE TABLE IF NOT EXISTS equipment (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    equipment_type  VARCHAR(50) NOT NULL DEFAULT 'CAT793',
    vin             VARCHAR(100) UNIQUE NOT NULL,
    fleet_number    VARCHAR(50),
    model           VARCHAR(100),
    make            VARCHAR(100) NOT NULL DEFAULT 'Caterpillar',
    year            INTEGER,
    hours           NUMERIC(10,1) NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','down','maintenance','decommissioned')),
    qr_code         TEXT,
    photo_url       TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.5 Inspection Templates
CREATE TABLE IF NOT EXISTS inspection_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    equipment_type  VARCHAR(50) NOT NULL DEFAULT 'CAT793',
    version         INTEGER NOT NULL DEFAULT 1,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, name, version)
);

-- 1.6 Template Sections
CREATE TABLE IF NOT EXISTS template_sections (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES inspection_templates(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.7 Template Questions
CREATE TABLE IF NOT EXISTS template_questions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id      UUID NOT NULL REFERENCES template_sections(id) ON DELETE CASCADE,
    question_text   TEXT NOT NULL,
    answer_type     VARCHAR(20) NOT NULL
                    CHECK (answer_type IN ('boolean','numeric','text','multi_select','photo_required')),
    options         JSONB,
    required        BOOLEAN NOT NULL DEFAULT true,
    has_media       BOOLEAN NOT NULL DEFAULT false,
    hint_text       TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.8 Inspection Runs
CREATE TABLE IF NOT EXISTS inspection_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id    UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    template_id     UUID NOT NULL REFERENCES inspection_templates(id) ON DELETE CASCADE,
    inspector_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress','completed','synced','archived')),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    odometer_hours  NUMERIC(10,1),
    notes           TEXT,
    signature       TEXT,
    client_id       UUID,
    started_offline BOOLEAN NOT NULL DEFAULT false,
    synced_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.9 Inspection Answers
CREATE TABLE IF NOT EXISTS inspection_answers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id   UUID NOT NULL REFERENCES inspection_runs(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES template_questions(id) ON DELETE CASCADE,
    answer_type     VARCHAR(20),
    boolean_value   BOOLEAN,
    numeric_value   NUMERIC(12,2),
    numeric_unit    VARCHAR(20),
    text_value      TEXT,
    multi_values    JSONB,
    flagged         BOOLEAN NOT NULL DEFAULT false,
    severity        VARCHAR(10) CHECK (severity IN ('low','medium','high','critical')),
    voice_note      TEXT,
    is_na           BOOLEAN NOT NULL DEFAULT false,
    answered_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (inspection_id, question_id)
);

-- 1.10 Inspection Media
CREATE TABLE IF NOT EXISTS inspection_media (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id   UUID NOT NULL REFERENCES inspection_runs(id) ON DELETE CASCADE,
    answer_id       UUID REFERENCES inspection_answers(id) ON DELETE SET NULL,
    file_path       TEXT NOT NULL,
    mime_type       VARCHAR(50),
    file_size_bytes INTEGER,
    gps_lat         NUMERIC(10,7),
    gps_lng         NUMERIC(10,7),
    captured_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    description     TEXT,
    is_synced       BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.11 Inspection Defects
CREATE TABLE IF NOT EXISTS inspection_defects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id   UUID NOT NULL REFERENCES inspection_runs(id) ON DELETE CASCADE,
    answer_id       UUID REFERENCES inspection_answers(id) ON DELETE SET NULL,
    equipment_id    UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    severity        VARCHAR(10) NOT NULL DEFAULT 'medium'
                    CHECK (severity IN ('low','medium','high','critical')),
    status          VARCHAR(20) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','in_progress','resolved','closed')),
    assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
    tag_out         BOOLEAN NOT NULL DEFAULT false,
    resolved_at     TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1.12 Sync Log
CREATE TABLE IF NOT EXISTS sync_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id           VARCHAR(255) NOT NULL,
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ,
    inspections_synced  INTEGER NOT NULL DEFAULT 0,
    media_synced        INTEGER NOT NULL DEFAULT 0,
    errors              JSONB NOT NULL DEFAULT '[]',
    status              VARCHAR(50) NOT NULL DEFAULT 'in_progress'
);

-- 1.13 Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id   UUID,
    changes     JSONB,
    ip_address  INET,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. UPDATED_AT TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_sites_updated_at
    BEFORE UPDATE ON sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_equipment_updated_at
    BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_inspection_templates_updated_at
    BEFORE UPDATE ON inspection_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_template_questions_updated_at
    BEFORE UPDATE ON template_questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_inspection_runs_updated_at
    BEFORE UPDATE ON inspection_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_inspection_answers_updated_at
    BEFORE UPDATE ON inspection_answers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_inspection_defects_updated_at
    BEFORE UPDATE ON inspection_defects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 3. ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- 3.1 Equipment
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY equipment_org_isolation ON equipment
    FOR ALL
    USING (org_id = (auth.jwt() ->> 'org_id')::UUID)
    WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- 3.2 Inspection Runs (org_id via equipment)
ALTER TABLE inspection_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY inspection_runs_org_isolation ON inspection_runs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM equipment e
            WHERE e.id = inspection_runs.equipment_id
            AND e.org_id = (auth.jwt() ->> 'org_id')::UUID
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM equipment e
            WHERE e.id = inspection_runs.equipment_id
            AND e.org_id = (auth.jwt() ->> 'org_id')::UUID
        )
    );

-- 3.3 Inspection Answers (org_id via inspection_runs → equipment)
ALTER TABLE inspection_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY inspection_answers_org_isolation ON inspection_answers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM inspection_runs ir
            JOIN equipment e ON e.id = ir.equipment_id
            WHERE ir.id = inspection_answers.inspection_id
            AND e.org_id = (auth.jwt() ->> 'org_id')::UUID
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM inspection_runs ir
            JOIN equipment e ON e.id = ir.equipment_id
            WHERE ir.id = inspection_answers.inspection_id
            AND e.org_id = (auth.jwt() ->> 'org_id')::UUID
        )
    );

-- 3.4 Inspection Media (org_id via inspection_runs → equipment)
ALTER TABLE inspection_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY inspection_media_org_isolation ON inspection_media
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM inspection_runs ir
            JOIN equipment e ON e.id = ir.equipment_id
            WHERE ir.id = inspection_media.inspection_id
            AND e.org_id = (auth.jwt() ->> 'org_id')::UUID
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM inspection_runs ir
            JOIN equipment e ON e.id = ir.equipment_id
            WHERE ir.id = inspection_media.inspection_id
            AND e.org_id = (auth.jwt() ->> 'org_id')::UUID
        )
    );

-- 3.5 Inspection Defects (org_id via equipment directly, or via inspection_runs)
ALTER TABLE inspection_defects ENABLE ROW LEVEL SECURITY;

CREATE POLICY inspection_defects_org_isolation ON inspection_defects
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM equipment e
            WHERE e.id = inspection_defects.equipment_id
            AND e.org_id = (auth.jwt() ->> 'org_id')::UUID
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM equipment e
            WHERE e.id = inspection_defects.equipment_id
            AND e.org_id = (auth.jwt() ->> 'org_id')::UUID
        )
    );

-- 3.6 Inspection Templates
ALTER TABLE inspection_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY inspection_templates_org_isolation ON inspection_templates
    FOR ALL
    USING (org_id = (auth.jwt() ->> 'org_id')::UUID)
    WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::UUID);

-- 3.7 Template Sections (org_id via inspection_templates)
ALTER TABLE template_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY template_sections_org_isolation ON template_sections
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM inspection_templates it
            WHERE it.id = template_sections.template_id
            AND it.org_id = (auth.jwt() ->> 'org_id')::UUID
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM inspection_templates it
            WHERE it.id = template_sections.template_id
            AND it.org_id = (auth.jwt() ->> 'org_id')::UUID
        )
    );

-- 3.8 Template Questions (org_id via template_sections → inspection_templates)
ALTER TABLE template_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY template_questions_org_isolation ON template_questions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM template_sections ts
            JOIN inspection_templates it ON it.id = ts.template_id
            WHERE ts.id = template_questions.section_id
            AND it.org_id = (auth.jwt() ->> 'org_id')::UUID
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM template_sections ts
            JOIN inspection_templates it ON it.id = ts.template_id
            WHERE ts.id = template_questions.section_id
            AND it.org_id = (auth.jwt() ->> 'org_id')::UUID
        )
    );

-- =============================================================================
-- 4. SEED DATA — Default Organization + CAT793 Daily Pre-Shift Template
-- =============================================================================

-- 4.1 Create the default organization
INSERT INTO organizations (id, name, slug, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default Organization',
    'default-org',
    '{"timezone": "UTC", "inspection_frequency": "daily"}'
);

-- 4.2 Create the CAT793 Daily Pre-Shift template
WITH template AS (
    INSERT INTO inspection_templates (id, org_id, name, description, equipment_type, version, is_active)
    VALUES (
        '00000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000001',
        'CAT793 Daily Pre-Shift Inspection',
        'Comprehensive daily pre-shift inspection checklist for CAT 793 heavy equipment. Covers all critical safety and operational systems per OEM and MSHA standards.',
        'CAT793',
        1,
        true
    )
    RETURNING id
)
-- 4.3 Create 10 sections
, s1 AS (INSERT INTO template_sections (id, template_id, name, description, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000101', (SELECT id FROM template), 'Engine', 'Engine systems — oil level, coolant, belts, leaks, air intake, starting performance', 1)
    RETURNING id)
, s2 AS (INSERT INTO template_sections (id, template_id, name, description, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000102', (SELECT id FROM template), 'Tires', 'Tires and rims — condition, pressure, tread wear, heat damage', 2)
    RETURNING id)
, s3 AS (INSERT INTO template_sections (id, template_id, name, description, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000103', (SELECT id FROM template), 'Brakes', 'Braking systems — service brakes, parking brake, retarder, air pressure, pedal feel', 3)
    RETURNING id)
, s4 AS (INSERT INTO template_sections (id, template_id, name, description, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000104', (SELECT id FROM template), 'Hydraulics', 'Hydraulic systems — hoist, steering, implement, fluid levels, leaks, cylinder seals', 4)
    RETURNING id)
, s5 AS (INSERT INTO template_sections (id, template_id, name, description, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000105', (SELECT id FROM template), 'Frame & Structure', 'Frame integrity, welds, cracks, structural damage, attachment points, ROPS/FOPS', 5)
    RETURNING id)
, s6 AS (INSERT INTO template_sections (id, template_id, name, description, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000106', (SELECT id FROM template), 'Electrical', 'Electrical systems — battery, alternator, lights, gauges, wiring, alarms, cameras', 6)
    RETURNING id)
, s7 AS (INSERT INTO template_sections (id, template_id, name, description, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000107', (SELECT id FROM template), 'Suspension & Steering', 'Suspension accumulators, steering linkage, tie rods, king pins, wheel bearings', 7)
    RETURNING id)
, s8 AS (INSERT INTO template_sections (id, template_id, name, description, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000108', (SELECT id FROM template), 'Cooling System', 'Radiator, coolant level and condition, fan, belts, hoses, shutters, heat exchanger', 8)
    RETURNING id)
, s9 AS (INSERT INTO template_sections (id, template_id, name, description, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000109', (SELECT id FROM template), 'Exhaust System', 'Exhaust manifold, muffler, turbocharger, pipes, heat shields, emission components', 9)
    RETURNING id)
, s10 AS (INSERT INTO template_sections (id, template_id, name, description, sort_order) VALUES
    ('00000000-0000-0000-0000-000000000110', (SELECT id FROM template), 'Safety Systems', 'Fire extinguisher, emergency stop, backup alarm, mirrors, seat belt, horn, gauges, cab condition', 10)
    RETURNING id)
-- 4.4 Insert all 60 questions (6 per section)
, questions_insert AS (
INSERT INTO template_questions (section_id, question_text, answer_type, options, required, has_media, hint_text, sort_order)
VALUES
-- ===== SECTION 1: ENGINE (Q1–Q6) =====
((SELECT s1),
 'Check engine oil level — is it within the operating range on the dipstick?',
 'boolean', NULL, true, false, 'Verify engine is level and cooled down. Oil level must be between L and F marks.', 1),

((SELECT s1,
 'Are there any visible engine oil, fuel, or coolant leaks?',
 'boolean', NULL, true, true, 'Inspect under and around engine compartment. Pay attention to gaskets, hoses, and seals.', 2),

((SELECT s1,
 'Record engine coolant temperature at startup (cold reading).',
 'numeric', '{"unit": "°F", "min": 40, "max": 220}', true, false, 'Read from cab gauge or engine display. Normal cold reading: 60–100°F.', 3),

((SELECT s1,
 'Inspect fan and alternator belts — are they in good condition with proper tension?',
 'boolean', NULL, true, true, 'Check for cracks, fraying, glazing, or looseness. Deflection should be 1/2–3/4 inch.', 4),

((SELECT s1,
 'Does the engine start without excessive cranking or unusual noises?',
 'boolean', NULL, true, false, 'Should start within 5 seconds. Listen for knocking, ticking, or grinding.', 5),

((SELECT s1,
 'Inspect air intake system — is the air filter restriction indicator within normal range?',
 'boolean', NULL, true, true, 'Check mechanical or electronic restriction indicator. Service if in red zone.', 6),

-- ===== SECTION 2: TIRES (Q7–Q12) =====
(s2,
 'Are all tires inflated to the correct pressure range?',
 'boolean', NULL, true, false, 'Check tire pressure monitoring system (TPMS) or manual gauge. Refer to OEM spec.', 1),

(s2,
 'Inspect tire tread depth — is tread above the minimum wear threshold?',
 'boolean', NULL, true, true, 'Minimum tread depth: 1/4 inch for front tires, 1/8 inch for rear. Check wear indicators.', 2),

(s2,
 'Are there any cuts, cracks, bulges, or foreign objects in the tire sidewalls or tread?',
 'boolean', NULL, true, true, 'Inspect entire circumference. Any sidewall damage >1 inch requires replacement.', 3),

(s2,
 'Inspect rims and wheels — are there signs of cracks, damage, or loose lug nuts?',
 'boolean', NULL, true, true, 'Check all lug nuts for torque, look for rim cracks or deformation.', 4),

(s2,
 'Record front left tire pressure.',
 'numeric', '{"unit": "PSI", "min": 30, "max": 150}', false, false, 'Use calibrated gauge. Record cold tire pressure.', 5),

(s2,
 'Are tires free of signs of overheating or chemical damage?',
 'boolean', NULL, true, true, 'Look for blueing, dry rot, or chemical degradation on sidewalls.', 6),

-- ===== SECTION 3: BRAKES (Q13–Q18) =====
(s3,
 'Is the parking brake functioning correctly (holds the machine on a grade)?',
 'boolean', NULL, true, false, 'Engage parking brake on a slight incline. Machine must not roll.', 1),

(s3,
 'Are the service brakes responsive with no excessive pedal travel or sponginess?',
 'boolean', NULL, true, false, 'Pedal should feel firm. Travel should not exceed 2/3 of full stroke.', 2),

(s3,
 'Record primary air system pressure (if applicable).',
 'numeric', '{"unit": "PSI", "min": 60, "max": 150}', false, false, 'Normal operating range: 100–130 PSI. Check dash gauge.', 3),

(s3,
 'Does the brake system warning light and alarm activate correctly on low pressure?',
 'boolean', NULL, true, false, 'With engine off, pump brake pedal. Warning should activate below 60 PSI.', 4),

(s3,
 'Inspect brake lines and connections for leaks or damage.',
 'boolean', NULL, true, true, 'Check all visible lines, fittings, and connections. Look for fluid or air leaks.', 5),

(s3,
 'Test the retarder/engine brake — does it engage and provide deceleration?',
 'boolean', NULL, true, false, 'Test at low speed in a safe area. Listen for unusual engagement noises.', 6),

-- ===== SECTION 4: HYDRAULICS (Q19–Q24) =====
(s4,
 'Check hydraulic fluid level — is it within the operating range?',
 'boolean', NULL, true, false, 'Check sight glass or dipstick with machine on level ground and hydraulics cycled.', 1),

(s4,
 'Are there any visible hydraulic fluid leaks from cylinders, hoses, or fittings?',
 'boolean', NULL, true, true, 'Inspect all hydraulic lines, cylinder seals, and connections. Note any drips or puddles.', 2),

(s4,
 'Does the hoist/implement system operate smoothly without hesitation or drift?',
 'boolean', NULL, true, false, 'Cycle hoist fully up and down. Check for smooth operation and excessive drift when holding.', 3),

(s4,
 'Inspect hydraulic hoses for abrasion, chafing, or bulging.',
 'boolean', NULL, true, true, 'Pay attention to hose routing where hoses rub against each other or frame members.', 4),

(s4,
 'Check hydraulic cylinder seals — are there signs of external leakage?',
 'boolean', NULL, true, true, 'Inspect rod seals on all cylinders. Oil film is normal, dripping is not.', 5),

(s4,
 'Record hydraulic system operating temperature after warm-up.',
 'numeric', '{"unit": "°F", "min": 80, "max": 220}', false, false, 'Normal operating temp: 120–180°F. Check dash gauge or system display.', 6),

-- ===== SECTION 5: FRAME & STRUCTURE (Q25–Q30) =====
(s5,
 'Inspect main frame rails — are there any visible cracks or deformation?',
 'boolean', NULL, true, true, 'Focus on stress points: near suspension mounts, hitch area, and cross-member welds.', 1),

(s5,
 'Inspect body/cargo area for cracks, damage, or excessive wear.',
 'boolean', NULL, true, true, 'Check floor, sidewalls, and body mounts. Note any damage or weld cracks.', 2),

(s5,
 'Check ROPS/FOPS structure — is it secure with no cracks or damage?',
 'boolean', NULL, true, true, 'Roll-over and Falling Object Protective Structures must be intact. No cracks, bends, or missing hardware.', 3),

(s5,
 'Are all access steps, handrails, and walkways secure and free of damage?',
 'boolean', NULL, true, true, 'Check mounting bolts, welds, and anti-slip surfaces. Report any loose or damaged components.', 4),

(s5,
 'Inspect hitch and towing attachment points for cracks or wear.',
 'boolean', NULL, true, true, 'Pivot pin, bushing, and retaining hardware must be in good condition with no excessive play.', 5),

(s5,
 'Are there any loose or missing bolts on structural components?',
 'boolean', NULL, true, true, 'Check major bolted joints: engine mounts, transmission mounts, suspension attachments.', 6),

-- ===== SECTION 6: ELECTRICAL (Q31–Q36) =====
(s6,
 'Check battery connections and terminals — are they clean, tight, and corrosion-free?',
 'boolean', NULL, true, true, 'Check both positive and negative terminals. Corrosion appears as white/green powder.', 1),

(s6,
 'Record battery voltage with engine off.',
 'numeric', '{"unit": "V", "min": 10.5, "max": 13.5}', false, false, '12V system: 12.4–12.7V is normal. Below 12.2V indicates low charge.', 2),

(s6,
 'Do all headlights, taillights, and work lights function correctly?',
 'boolean', NULL, true, true, 'Walk-around check. Test high/low beams, brake lights, turn signals, and work lights.', 3),

(s6,
 'Are all dashboard warning lights and gauges functioning on startup (bulb test)?',
 'boolean', NULL, true, true, 'All warning lights should illuminate briefly on startup, then clear. Note any that stay on.', 4),

(s6,
 'Inspect wiring harnesses for chafing, loose connections, or exposed wires.',
 'boolean', NULL, true, true, 'Focus on areas where harnesses move or pass near sharp edges, heat sources, or pinch points.', 5),

(s6,
 'Do backup camera and/or side cameras display correctly?',
 'boolean', NULL, false, true, 'Check all camera feeds for clarity and proper orientation.', 6),

-- ===== SECTION 7: SUSPENSION & STEERING (Q37–Q42) =====
(s7,
 'Check steering system — is there excessive play in the steering wheel?',
 'boolean', NULL, true, false, 'Free play should not exceed 2–3 inches on a 20-inch wheel with engine running.', 1),

(s7,
 'Inspect suspension accumulators for leaks or damage.',
 'boolean', NULL, true, true, 'Check for oil residue around accumulator fittings and bladders.', 2),

(s7,
 'Check tie rod ends and steering linkage for wear or looseness.',
 'boolean', NULL, true, true, 'With wheels on ground, have someone rock steering wheel while you inspect linkage for play.', 3),

(s7,
 'Does the machine track straight without pulling to one side?',
 'boolean', NULL, true, false, 'Test on a flat, straight surface. Release steering momentarily — should continue straight.', 4),

(s7,
 'Inspect king pins and bushings for wear or excessive movement.',
 'boolean', NULL, true, true, 'Jack front axle and check for vertical and horizontal play at king pin.', 5),

(s7,
 'Check wheel bearings for play or unusual noise during rotation.',
 'boolean', NULL, true, false, 'Spin each wheel (jacked) and listen for grinding. Check axial play with pry bar.', 6),

-- ===== SECTION 8: COOLING SYSTEM (Q43–Q48) =====
(s8,
 'Check coolant level in recovery tank — is it between MIN and MAX marks?',
 'boolean', NULL, true, false, 'Check only when engine is cool. Never remove radiator cap when hot without safety procedures.', 1),

(s8,
 'Inspect radiator and heat exchanger cores for debris, blockage, or damage.',
 'boolean', NULL, true, true, 'Check for bent fins, debris buildup, or coolant residue on core surfaces.', 2),

(s8,
 'Are all coolant hoses in good condition with no soft spots, cracks, or leaks?',
 'boolean', NULL, true, true, 'Squeeze hoses when cool — they should feel firm. Check clamps for tightness.', 3),

(s8,
 'Does the cooling fan engage and cycle properly?',
 'boolean', NULL, true, false, 'Watch fan during warm-up. It should engage at operating temp and cycle as needed.', 4),

(s8,
 'Check fan shroud and fan blades for cracks or damage.',
 'boolean', NULL, true, true, 'Inspect all blades for cracks or missing pieces. Check shroud for secure mounting.', 5),

(s8,
 'Record engine operating temperature at normal operating conditions.',
 'numeric', '{"unit": "°F", "min": 140, "max": 230}', true, false, 'Normal operating range: 160–210°F. Record after 10+ minutes of operation.', 6),

-- ===== SECTION 9: EXHAUST SYSTEM (Q49–Q54) =====
(s9,
 'Inspect exhaust manifold and turbocharger for leaks or damage.',
 'boolean', NULL, true, true, 'Look for soot traces indicating exhaust leaks. Check manifold for cracks.', 1),

(s9,
 'Are exhaust pipes and muffler securely mounted with no holes or severe corrosion?',
 'boolean', NULL, true, true, 'Check hangers, brackets, and exhaust pipe integrity. Replace if rusted through.', 2),

(s9,
 'Check heat shields — are they in place and secure?',
 'boolean', NULL, true, true, 'All heat shields near wiring, hoses, and body panels must be present and tight.', 3),

(s9,
 'Is the exhaust color normal with no excessive black, white, or blue smoke?',
 'boolean', NULL, true, true, 'Light grey/blue at cold start is normal. Persistent heavy smoke requires investigation.', 4),

(s9,
 'Inspect DPF/diesel emissions after-treatment system for warning indicators.',
 'boolean', NULL, false, false, 'Check dash for DPF regen or emissions warning lights. Note any active faults.', 5),

(s9,
 'Check turbocharger boost pressure at full load (if gauge available).',
 'numeric', '{"unit": "PSI", "min": 0, "max": 40}', false, false, 'Typical max boost: 15–35 PSI depending on engine. Note at governed RPM under load.', 6),

-- ===== SECTION 10: SAFETY SYSTEMS (Q55–Q60) =====
((SELECT s10,
 'Is the fire extinguisher present, charged, and within its inspection date?',
 'boolean', NULL, true, true, 'Check gauge in green zone. Verify monthly inspection tag is current. Min 10 lbs ABC rated.', 1),

((SELECT s10,
 'Does the emergency stop / engine shut-off function correctly?',
 'boolean', NULL, true, false, 'Test emergency stop button or lever. Engine should shut down immediately.', 2),

((SELECT s10,
 'Is the backup alarm functioning when the machine reverses?',
 'boolean', NULL, true, false, 'Verify audible reversing alarm engages when transmission is put in reverse.', 3),

((SELECT s10,
 'Are all mirrors present, clean, and properly adjusted?',
 'boolean', NULL, true, true, 'Check rearview and side mirrors for cracks, proper adjustment, and secure mounting.', 4),

((SELECT s10,
 'Is the seat belt present, undamaged, and functioning (locks and retracts)?',
 'boolean', NULL, true, true, 'Pull belt fully out and let retract. Buckle and tug to verify locking mechanism works.', 5),

((SELECT s10,
 'Is the horn working and audible?',
 'boolean', NULL, true, false, 'Test horn from operator station. Must be clearly audible from outside the cab.', 6)
)
SELECT 1