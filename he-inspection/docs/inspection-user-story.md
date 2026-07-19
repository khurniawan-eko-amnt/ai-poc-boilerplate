# HE Inspection — User Story & Functional Specification

> **App:** he-inspection (Heavy Equipment Inspection)
> **Domain:** CAT793 Haul Truck Inspection During Refueling
> **Context:** Mining — Gold/Copper Open Pit
> **Target:** 10-minute refueling window per truck
> **Schema:** `poc_he_inspection` (self-hosted Supabase on VM)
> **Version:** v2 — Revised Process

---

## 1. Business Context

### 1.1 The Refueling Window

- Each haul truck has **~10 minutes** of downtime during refueling
- The inspection **must complete within this window** — the truck rolls back to the pit immediately
- Every second wasted on poor UI = lost production
- Net time for inspector: ~8 minutes (start/stop overhead)

### 1.2 Environment Constraints

| Factor | Implication |
|--------|-------------|
| Dust, vibration, rain, extreme heat | Touch-friendly large buttons, high contrast UI |
| Gloves worn | No small text inputs, no precision taps |
| Network can be spotty (pit, ramp) | Save must be reliable; minimal round-trips |
| No desk/table nearby | One-handed portrait mode |
| Operator may be impatient | Rapid flow, clear progress, undo confidence |

### 1.3 Roles

| Role | Description |
|------|-------------|
| **Inspector** | Field technician performing the walk-around inspection |
| **Supervisor** | Reviews open defects, assigns repair work |
| **Maintenance** | Receives defect reports, performs repairs |
| **Manager** | Sees aggregated dashboard of fleet health |

---

## 2. User Story: Full Inspection Flow

### Story 2.1 — Select Equipment

```
As an inspector
I want to search for a haul truck by fleet number or VIN
So that I can quickly find the equipment being refueled and start inspecting
```

**Acceptance:**
- Search box filters in real-time by fleet number, VIN, make, model
- Status filter tabs: All / Active / Down / Maintenance
- Each row shows: fleet number, VIN, make+model, year, hours, status
- Clicking a row navigates to Equipment Detail page with Start Inspection button
- Empty state shows helpful prompt to add equipment

### Story 2.2 — Start Inspection

```
As an inspector
I want to start an inspection on my selected equipment
So that a new inspection run is logged and I can record my findings
```

**Acceptance:**
- **"Start Inspection"** button on Equipment Detail page
- On click:
  1. `INSERT INTO inspection_runs` with `status: 'in_progress'`
  2. `inspector_id` = current logged-in user (must match `poc_he_inspection.users`)
  3. `equipment_id` = selected equipment
  4. `template_id` = active template for CAT793
  5. `client_id` = generated UUID for idempotency
- If DB insert fails → show error toast, **do not** silently skip
- On success → immediately navigate to the inspection questionnaire page
- **Guard:** If no active template exists → show clear message "No inspection template configured. Contact supervisor."

### Story 2.3 — Answer Questions (OK / No Finding)

```
As an inspector
I want to quickly mark a checklist item as "OK"
So that I can move to the next question without wasting time
```

**Acceptance:**
- Large green **"✓ Ya — OK (Tidak Ada Temuan)"** button takes ~60% of visible space
- On click:
  1. `saveAnswer()` with `{boolean_value: true, flagged: false, text_value: null}`
  2. Answer is **awaited** — must succeed or show error
  3. On success → auto-advance to next question
- Progress bar updates immediately
- If save fails → show error toast with "Retry" option, **do not** advance

### Story 2.4 — Report Finding (Voice + Photo/Video + Defect Level)

```
As an inspector
When I find a defect during inspection
I want to describe it by voice, capture photo/video evidence, and assign a severity level
So that maintenance can understand and act on the issue
```

**This is the core inspection flow.** The order is strict:

#### Step A — Voice Description
1. Inspector clicks **Voice** button (orange microphone icon)
2. Web Speech API starts in `id-ID` with continuous listening mode
3. Button turns red with "Stop" label, pulsing indicator visible
4. As inspector speaks, **realtime interim text** appears below textarea
5. On speech final result → textarea is filled with the transcript
6. `text_value` is saved **in background** (non-blocking) to `inspection_answers`
7. Inspector can manually edit transcript in textarea
8. Inspector clicks **Stop** when done

#### Step B — Photo / Video Evidence
1. After (or instead of) voice, inspector can capture photo/video
2. Buttons: **Video** (purple) | **Photo** (sky blue) | **Voice** (orange)
3. Photo/Video opens native device camera with `capture="environment"`
4. On capture:
   - File is **held locally** in a `localMedia` array — NOT uploaded yet
   - **Thumbnail** appears below the finding textarea immediately (optimistic UI)
   - Thumbnail shows file type icon (image/video) + size hint
5. Multiple photos/videos can be taken for the same finding
6. All evidence is visible as thumbnails with camera icon overlay

#### Step C — Select Defect Level
1. After all evidence captured → inspector selects defect level
2. Three large buttons:
   - 🟦 **Rendah** (Low) — blue
   - 🟨 **Sedang** (Medium) — yellow
   - 🟥 **Tinggi** (High) — red
3. Clicking a level button shows a **confirmation popup**:

```
╔══════════════════════════════════════╗
║    📸 Konfirmasi Temuan              ║
║                                      ║
║    Defect ditemukan pada:            ║
║    [question_text]                   ║
║    Tingkat: [Rendah/Sedang/Tinggi]   ║
║    Media: [N] foto/video             ║
║    Catatan: [finding text preview]   ║
║                                      ║
║      [Batal]    [Ya, Simpan]         ║
╚══════════════════════════════════════╝
```

#### Step D — Save & Process (On Confirmation)
1. Inspector clicks **"Ya, Simpan"**
2. App does **all of the following** before advancing:
   - ✅ `saveAnswer()` — save the answer record with `flagged: true`, `severity: level`, `text_value`
   - ✅ Get the returned answer `id`
   - ✅ Upload all `localMedia` to Supabase Storage (bucket: `poc-he-inspection`)
   - ✅ For each uploaded file, `INSERT INTO inspection_media` with `answer_id` correctly set
   - ✅ Update `inspection_answers` media_count or store media IDs
   - ✅ Show success toast
3. If any step fails → show error toast with retry, **do not advance**
4. On success → auto-advance to next question
5. `localMedia` array is cleared for the next question

**Visual flow for a defect question:**
```
┌─────────────────────────────────────┐
│ Section: Rantai — Q5 sort_order    │
│                                     │
│ "Apakah rantai roda dalam           │
│  kondisi baik?"                     │
│                                     │
│ ┌─ Finding Textarea ──────────────┐ │
│ │ Ada retak di sambungan rantai   │ │
│ │ sepanjang 5cm. Bunyi berisik.   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [🎥 Video] [🎤 Voice] [📷 Photo]   │
│                                     │
│ Bukti yang diambil (3):             │
│ [IMG] [IMG] [VID]                   │
│                                     │
│ Pilih tingkat kerusakan:            │
│ ┌──────┐ ┌───────┐ ┌──────┐       │
│ │Rendah│ │Sedang │ │Tinggi│       │
│ └──────┘ └───────┘ └──────┘       │
└─────────────────────────────────────┘
     │ Next / Submit buttons below
```

### Story 2.5 — Three-Dot Menu (Pause / Finish)

```
As an inspector
I want to pause or finish the current inspection from any question
So that I can handle urgent situations or leave the inspection incomplete
```

**Acceptance:**
- Three-dot vertical menu (⋮) always visible at **top-right** of the question page
- Menu items:

| Item | Action |
|------|--------|
| ⏸️ **Pause Inspection** | Navigation back to Equipment Detail page. `inspection_runs.status` stays `in_progress`. Next time inspector starts inspection on the same equipment → **resume** (load unanswered questions) or warn "unfinished inspection exists" |
| ⏹️ **Finish Inspection** | Same as reaching the last question submit — `completeInspection()` called, status → `completed`, navigates to report page |
| ❌ **Cancel** | Close the menu |

- "Pause Inspection" shows confirmation: "Inspection will be saved. You can continue later."
- "Finish Inspection" shows confirmation: "Submit all answers and finish?"

### Story 2.6 — Complete Inspection

```
As an inspector
When I reach the last question
I want to submit all answers and finalize the inspection
So that the inspection run is recorded as complete
```

**Acceptance:**
- On the last question → show **"Submit"** button in orange with Send icon
- Click → confirmation dialog: "Semua {N} pertanyaan telah dijawab. Akhiri inspeksi?"
- Confirm → `completeInspection()`:
  - `UPDATE inspection_runs SET status='completed', completed_at=NOW()`
- On success → navigate to Inspection Report page
- On failure → error toast, no navigation
- Report page shows: run info, all Q&A, flagged items summary, all media

### Story 2.7 — View Inspection Report

```
As a supervisor/manager
I want to view a completed inspection report
So that I can review findings, defects, and evidence
```

**Acceptance:**
- Report shows: template name, equipment info, date/time, inspector name
- Sections expandable with all questions and answers
- Flagged items highlighted with severity color
- Media thumbnails expandable to full view
- "View Report" button on Inspection Detail page
- Print-friendly layout for paper filing

---

## 3. Data Model (Revised)

### 3.1 Core Tables

```
inspection_runs           inspection_answers    inspection_media
┌─────────────────┐       ┌────────────────┐    ┌──────────────────┐
│ id (PK)         │──┐    │ id (PK)        │    │ id (PK)          │
│ equipment_id    │  │    │ inspection_id  │◄───│ inspection_id    │
│ template_id     │  ├───►│ question_id    │    │ answer_id (FK) ◄─┤
│ inspector_id    │  │    │ answer_type    │    │ file_path        │
│ status          │  │    │ boolean_value  │    │ mime_type        │
│ started_at      │  │    │ text_value     │    │ file_size_bytes  │
│ completed_at    │  │    │ flagged        │    │ captured_at      │
│ client_id       │  │    │ severity       │    │ description      │
│ started_offline │  │    │ is_na          │    └──────────────────┘
└─────────────────┘  │    │ answered_at    │
                     │    │ updated_at     │       inspection_defects
                     │    └────────────────┘    ┌──────────────────┐
                     │                          │ id (PK)          │
                     │     inspection_templates │ inspection_id ◄──┤
                     │     ┌──────────────────┐ │ answer_id ◄──────┤
                     │     │ id (PK)          │ │ equipment_id     │
                     ├────►│ org_id           │ │ title            │
                     │     │ name             │ │ description      │
                     │     │ equipment_type   │ │ severity         │
                     │     │ version          │ │ status           │
                     │     │ is_active        │ │ tag_out          │
                     │     └──────────────────┘ │ assigned_to      │
                     │          │               │ resolved_at      │
                     │     template_sections    └──────────────────┘
                     │     ┌──────────────────┐
                     │     │ id (PK)          │
                     ├────►│ template_id      │
                     │     │ name             │
                     │     │ sort_order       │
                     │     └──────────────────┘
                     │          │
                     │     template_questions
                     │     ┌──────────────────┐
                     └────►│ id (PK)          │
                           │ section_id       │
                           │ question_text    │
                           │ answer_type      │
                           │ options (JSONB)  │
                           │ required         │
                           │ has_media        │
                           │ hint_text        │
                           │ sort_order       │
                           └──────────────────┘
```

### 3.2 Key Relationships

- `inspection_runs.template_id` → `inspection_templates.id`
- `inspection_runs.equipment_id` → `equipment.id`
- `inspection_runs.inspector_id` → `users.id`
- `inspection_answers.inspection_id` → `inspection_runs.id` (CASCADE delete)
- `inspection_answers.question_id` → `template_questions.id`
- `inspection_media.inspection_id` → `inspection_runs.id` (CASCADE delete)
- `inspection_media.answer_id` → `inspection_answers.id` (SET NULL on delete)
- `inspection_defects.inspection_id` → `inspection_runs.id` (CASCADE delete)
- `inspection_defects.answer_id` → `inspection_answers.id` (SET NULL on delete)

### 3.3 New / Modified Fields

| Table | Field | Type | Purpose |
|-------|-------|------|---------|
| `inspection_answers` | `voice_transcript_raw` | `TEXT` | Original speech-to-text output before user edits |
| `inspection_answers` | `media_ids` | `UUID[]` | Array of linked media IDs for quick lookup |
| `inspection_answers` | `answered_at` | `TIMESTAMPTZ` | Already exists, ensure default is `now()` |

---

## 4. UI Component Tree

```
App
├── LoginPage
│   ├── SignInForm
│   └── SignUpForm (optional)
├── DashboardPage
│   ├── StatsCards (4: Active, Down, Today, Open Defects)
│   └── RecentInspectionsList
├── EquipmentListPage
│   ├── SearchBar
│   ├── FilterTabs (All/Active/Down/Maintenance/Decommissioned)
│   └── EquipmentTable (clickable rows)
├── EquipmentDetailPage
│   ├── EquipmentInfoCard
│   ├── TabBar (Inspections / Open Defects)
│   ├── InspectionsTab
│   └── DefectsTab
├── NewInspectionPage ⭐ ← Main flow
│   ├── Header
│   │   ├── CloseButton (X) — navigates away
│   │   ├── ProgressBar + Count
│   │   ├── SectionTabs (scrollable)
│   │   └── ThreeDotMenu (⋮)
│   │       ├── PauseInspection
│   │       └── FinishInspection
│   ├── QuestionArea
│   │   ├── SectionLabel + QuestionNumber
│   │   ├── QuestionText (h2)
│   │   ├── HintText (optional, italic)
│   │   │
│   │   ├── [OK Button] — visible when no defect flagged
│   │   │
│   │   ├── MediaCaptureBar
│   │   │   ├── VideoButton
│   │   │   ├── VoiceButton (toggles recording)
│   │   │   └── PhotoButton
│   │   │
│   │   ├── FindingTextarea (voice transcript target)
│   │   ├── InterimOverlay (realtime STT feedback)
│   │   │
│   │   ├── MediaThumbnailsRow (local + stored)
│   │   │
│   │   └── DefectLevelButtons (3: Rendah/Sedang/Tinggi)
│   │
│   ├── DefectConfirmationPopup (modal)
│   │   ├── Summary: question, level, media count, text preview
│   │   ├── Cancel button
│   │   └── Confirm button → triggers save + upload + advance
│   │
│   └── BottomNav
│       ├── PrevButton (←)
│       ├── NextButton (→) or SubmitButton (last question)
│       └── SubmitConfirmation (modal on last Q)
│
├── InspectionDetailPage
│   ├── BackButton
│   ├── InspectionInfoCard
│   ├── CompleteInspectionButton (if in_progress)
│   ├── Sections (collapsible, all expanded by default)
│   │   └── Questions with answers + media
│   ├── FlaggedItemsSummary
│   └── ViewReportButton
│
├── InspectionReportPage
│   ├── PrintHeader
│   ├── AllQuestionsPrintable
│   └── DefectsSummary
│
├── TemplatesPage
│   └── TemplateCards with question counts
├── DefectsPage
│   └── DefectCards with severity/status filters
└── SettingsPage
```

---

## 5. Error Handling & Reliability

### 5.1 Save Reliability

| Operation | Strategy |
|-----------|----------|
| `saveAnswer()` on OK click | **Awaited.** Error → toast + retry, no advance |
| `saveAnswer()` on voice transcript | Background (fire-and-forget). Transcript persists locally in textarea |
| `saveAnswer()` on defect confirmation | **Awaited.** Error → toast + retry, no advance |
| Media upload on confirmation | **Awaited sequentially.** Each file upload → INSERT media with answer_id. All-or-nothing? No — partial success is acceptable (partial upload is better than nothing) |
| `completeInspection()` | **Awaited.** Error → toast + retry, no navigation |

### 5.2 User Feedback

| State | UI |
|-------|-----|
| Saving answer | Inline spinner on the button clicked |
| Upload successful | Brief green toast "Tersimpan" |
| Upload failed | Red toast with retry button |
| Network offline | Small banner at top: "Offline — perubahan akan disimpan" (future enhancement) |
| Defect confirmation pending | Modal blocks interaction |
| Submit complete | Success toast → auto-navigate to report |

### 5.3 Idempotency

- `client_id` on `inspection_runs` prevents duplicate inspection creation on retry
- `UNIQUE(inspection_id, question_id)` on `inspection_answers` prevents duplicate answers (upsert pattern: INSERT → ON CONFLICT UPDATE)

---

## 6. Performance Targets

| Metric | Target | Why |
|--------|--------|-----|
| Template load time | < 1s (even with 50+ questions) | Inspector waits for questionnaire |
| Answer save round-trip | < 500ms | Auto-advance feels instant |
| Media upload (1 photo) | < 3s on 4G | Confirmation → advance latency |
| Full inspection (50 Qs, 0 defects) | < 5 min | Fits within 8-min usable window |
| Full inspection (50 Qs, 5 defects) | < 8 min | Upper bound of refueling window |

---

## 7. Future Considerations

| Feature | Priority | Notes |
|---------|----------|-------|
| Offline queue with IndexedDB sync | Medium | Required for deep pit areas with no signal |
| QR code scan on equipment | Medium | Faster than typing fleet number |
| Auto-create `inspection_defects` on flagged answer | Medium | Currently creates on-demand |
| Multi-language (English toggle) | Low | Primary users are Indonesian-speaking |
| Signature capture on completion | Low | Legal requirement in some mines |
| Push notification to supervisor on critical defect | Low | Real-time alerting |
| Photo annotation (draw circles, arrows on image) | Low | Pinpoint defect location |