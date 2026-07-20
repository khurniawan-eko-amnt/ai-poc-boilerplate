# Business Requirements Document (BRD)
## HE Inspection Application

**Version:** 2.0  
**Date:** 2026-07-20  
**Status:** Updated to Match Current Application  
**Scope:** `he-inspection` current implemented product

---

## 1. Executive Summary

### 1.1 Vision
Provide a practical digital inspection workflow for heavy equipment inspections, centered on CAT793 daily pre-shift checks, so inspectors can record outcomes faster, attach evidence directly in the field, and give supervisors a clearer operational view of equipment condition.

### 1.2 Current Business Problem
The business requires a replacement for fragmented inspection recording processes that are slow to complete, difficult to review, and inconsistent across teams. The current application is intended to solve these operational issues:

- **Inspection recording is inconsistent** when findings are captured in ad hoc notes or non-standard forms.
- **Operational defects are harder to follow up** when there is no structured link between inspection answers, media evidence, and defect records.
- **Supervisors need faster visibility** into equipment condition, open defects, and recent inspections.
- **Manual reporting slows response time** when inspection outcomes are not immediately available in a shared system.
- **Template changes are difficult to govern** without a configurable inspection template structure.
- **Multi-site organizational access must remain controlled** so each organization only sees its own data.

### 1.3 Business Goals

| Goal | Outcome Sought | Current Product Alignment |
|---|---|---|
| Standardize inspections | Use one structured CAT793 inspection process | Implemented through template/section/question model |
| Reduce inspection friction | Make question answering fast for inspectors | Implemented through tap-first flow with auto-advance |
| Improve evidence capture | Attach visual and written findings to questions | Implemented through media upload and finding text |
| Improve supervisory visibility | Surface inspections, defects, and reports in-app | Implemented through dashboard, lists, and report pages |
| Improve traceability | Link equipment, inspections, answers, media, and defects | Implemented in current schema and UI flows |
| Protect tenant data | Restrict access by organization | Implemented through Supabase RLS policies |

---

## 2. Product Context

### 2.1 Current Product Definition
`he-inspection` is a web-based inspection application built for authenticated users to manage equipment, execute template-driven inspections, capture findings, review defects, and view completed inspection reports.

### 2.2 Current Product Boundaries
The current application supports:

- user authentication
- equipment management
- inspection template management
- inspection execution
- answer persistence per question
- media upload for inspection evidence
- defect tracking
- inspection history and report viewing
- organization-isolated data access

The current application does **not** yet fully implement the broader future-state concepts previously documented, such as comprehensive offline-first sync, external maintenance system integration, predictive analytics, or automated ticketing.

---

## 3. Users and Stakeholders

### 3.1 Primary User: Inspector

| Attribute | Detail |
|---|---|
| Role | Performs daily equipment inspections |
| Primary need | Fast capture of pass/fail outcomes and findings |
| Typical tasks | Start inspection, answer questions, attach evidence, complete inspection |
| Pain points addressed | Repetitive manual entry, poor traceability, scattered evidence |
| Key product value | Guided flow, quick OK action, voice-assisted notes, photo/video capture |

### 3.2 Secondary User: Supervisor

| Attribute | Detail |
|---|---|
| Role | Reviews inspection outcomes and open issues |
| Primary need | Visibility into recent inspections and defects |
| Typical tasks | Monitor defects, review inspection details, confirm status progression |
| Key product value | Faster review of inspection outcomes and linked defect records |

### 3.3 Tertiary User: Manager / Admin

| Attribute | Detail |
|---|---|
| Role | Maintains templates, equipment records, and organizational setup |
| Primary need | Control system structure and inspection content |
| Typical tasks | Maintain equipment, edit templates, oversee usage |
| Key product value | Configurable template model and controlled organization data |

---

## 4. Business Requirements

### BR-1 Authentication and Controlled Access
The system must require authenticated access before users can reach operational screens.

**Supported today**
- Login and registration pages
- Protected routes for operational pages
- Role model in data schema: `inspector`, `supervisor`, `manager`, `admin`

### BR-2 Organization-Isolated Data
The system must isolate inspection data by organization.

**Supported today**
- Organization-aware schema
- Row-level security policies on equipment, inspections, answers, media, defects, templates

### BR-3 Equipment Registry
The business must be able to maintain a list of equipment available for inspection.

**Supported today**
- Equipment list
- Equipment detail page
- Equipment create/edit flow
- Equipment metadata including type, VIN, fleet number, make, model, year, hours, and status

### BR-4 Template-Driven Inspection
Inspection content must be configurable through templates rather than hardcoded in the UI.

**Supported today**
- Inspection templates
- Template sections
- Template questions
- Active template loading at inspection start

### BR-5 Guided Inspection Execution
Inspectors must be able to run a structured inspection from a selected piece of equipment.

**Supported today**
- Start inspection from equipment
- Create inspection run
- Navigate section by section and question by question
- Progress indicator and answered count

### BR-6 Fast “No Finding” Recording
Inspectors must be able to quickly mark a checkpoint as acceptable.

**Supported today**
- One-tap “Ya — OK” action
- Automatic save and auto-advance to the next question

### BR-7 Finding Capture
Inspectors must be able to record non-conforming findings against a question.

**Supported today**
- Text finding entry
- Severity selection: `low`, `medium`, `high`
- Question answer flagged as a defect-type finding
- Confirmation before finalizing the finding flow

### BR-8 Evidence Capture
Inspectors must be able to attach media evidence to inspections.

**Supported today**
- Photo upload
- Video upload
- Media linked to inspection and later associated to the saved answer
- Supabase Storage-backed file handling

### BR-9 Voice-Assisted Notes
Inspectors should be able to dictate findings when browser capability allows.

**Supported today**
- Browser SpeechRecognition integration
- Indonesian recognition locale (`id-ID`)
- HTTPS/browser support dependency

### BR-10 Inspection Completion and Review
Completed inspections must be reviewable after submission.

**Supported today**
- Complete inspection action
- Inspection detail page
- Inspection report page
- Inspection list/history pages

### BR-11 Defect Tracking
The business must be able to track defects separately from raw answers.

**Supported today**
- Dedicated defect records
- Defect severity and status
- Defect list page
- Defect update flow

---

## 5. Current Functional Scope

### 5.1 In Scope
The following are in current scope for `he-inspection`:

- authenticated access
- dashboard access after login
- equipment list, detail, and create/edit
- template list and template edit screens
- active template loading for new inspections
- inspection run creation
- question-by-question inspection workflow
- tap-to-pass question handling
- finding description entry
- browser-based voice transcription for finding input
- photo/video upload during inspection
- defect creation through flagged inspection answers
- inspection completion
- inspection list and inspection detail
- inspection report viewing
- profile page
- organization-based data separation

### 5.2 Out of Current Scope
The following are not part of the current implemented scope, even if fields or placeholders exist in the schema:

- full offline-first inspection completion with local queue and background sync
- service-worker-driven batch synchronization
- QR scanning workflow for equipment selection
- GPS tagging in active UI
- digital signature capture in active UI
- automatic maintenance ticket creation
- push notifications
- predictive maintenance analytics
- cross-system integration with SAP/CMMS
- manager analytics dashboard beyond current operational views
- tag-out workflow in the active inspection screen

---

## 6. Current Inspection Business Flow

### 6.1 High-Level Workflow
1. User logs in.
2. User opens equipment record.
3. User starts a new inspection for that equipment.
4. System loads the active inspection template.
5. For each question:
   - mark **OK** and auto-advance, or
   - capture a finding with text/voice/media and severity, then confirm and advance.
6. User completes the inspection.
7. Completed inspection becomes available in inspection detail and report views.
8. Related defects can be reviewed and updated separately.

### 6.2 Current Question Handling Pattern
The implemented inspection UX uses two main paths:

- **OK path**
  - answer saved as acceptable
  - question auto-advances

- **Finding path**
  - optional photo/video capture
  - optional voice dictation
  - finding text entry
  - severity selection
  - confirmation modal
  - save flagged answer and link media
  - advance to next question

This is the current core business interaction and should be treated as the source of truth for documentation.

---

## 7. Data and Recordkeeping Requirements

| Requirement | Current Status |
|---|---|
| Store equipment master data | Implemented |
| Store inspection runs | Implemented |
| Store one answer per question per inspection | Implemented |
| Store media evidence | Implemented |
| Store separate defect records | Implemented |
| Store audit-oriented timestamps | Implemented across core tables |
| Store sync-related metadata | Present in schema; not fully active in UI workflow |
| Store organization ownership | Implemented |

---

## 8. Success Measures

These measures reflect intended operational value for the current product, not yet an automated KPI dashboard.

| Measure | Target Direction |
|---|---|
| Faster completion of routine checks | Reduce taps and text entry for normal inspections |
| Better inspection consistency | All inspections use approved template content |
| Better evidence completeness | Findings increasingly include note and/or media evidence |
| Better follow-up visibility | Supervisors can review inspections and defects from the app |
| Better traceability | Equipment, inspections, answers, media, and defects remain linked |
| Secure tenant separation | No cross-organization data exposure |

---

## 9. Constraints and Assumptions

### 9.1 Constraints

| ID | Constraint | Current Impact |
|---|---|---|
| C1 | Browser capability affects voice input | Speech recognition depends on supported browser and secure context |
| C2 | Current app primarily persists directly to backend | Continuous connectivity is more reliable than disconnected operation |
| C3 | Product is currently a web app | Behavior depends on browser/device support for media and voice |
| C4 | Data isolation is mandatory | RLS and org context must be preserved |
| C5 | Template-driven model must remain flexible | Changes to question structure should not require UI redesign |

### 9.2 Assumptions

| ID | Assumption | Notes |
|---|---|---|
| A1 | CAT793 remains the main initial equipment focus | Reflected in seeded template and product terminology |
| A2 | Inspectors have authenticated user accounts | Required for inspection ownership |
| A3 | Organizations manage their own equipment and templates | Reflected in org/site model |
| A4 | Connectivity is normally available during use | Current implementation favors online persistence |
| A5 | Additional future capabilities may be added later | Offline sync, integrations, and advanced workflows remain future scope |

---

## 10. Risks and Considerations

| Risk | Effect | Current Mitigation |
|---|---|---|
| Browser voice support varies | Voice feature may not work consistently across devices | Manual text entry remains available |
| Weak connectivity during inspection | Save/upload actions may fail | Current UI surfaces failure and allows retry |
| Template quality affects inspection quality | Poor questions reduce business value | Template management remains configurable |
| Media capture may slow workflows | Larger files increase upload friction | Media is optional for many questions |
| Scope drift toward future-state features | Docs become inaccurate again | Separate current-state documentation from future enhancements |

---

## 11. Future Enhancement Areas

The following remain valid future opportunities but are not current requirements for implemented behavior:

- stronger offline-first workflow with local queue and reliable sync
- QR-based equipment identification
- GPS and location evidence
- digital signatures in active inspection completion
- critical/tag-out workflow from the inspection screen
- automated maintenance ticket creation
- dashboard analytics and trends
- multi-equipment expansion beyond CAT793
- integration with maintenance and enterprise systems

---

## 12. Summary

The current `he-inspection` application is a template-driven heavy equipment inspection system focused on authenticated inspection execution, evidence capture, defect tracking, and report review. The primary business requirement is no longer to describe a future platform vision, but to accurately support the current operational product and its implemented workflow.

This BRD is aligned to the current application state and should be used as the baseline for related functional and flow documentation.