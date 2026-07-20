# Functional System Document (FSD)
## HE Inspection Application

**Version:** 2.0  
**Date:** 2026-07-20  
**Status:** Updated to Match Current Application  
**Based On:** Current `he-inspection` implementation, schema, routes, and stores

---

## 1. System Overview

### 1.1 Purpose
This document describes the current functional behavior of the `he-inspection` application as implemented today. It reflects the actual React + Supabase solution used for heavy equipment inspection workflows, rather than the earlier future-state concept.

### 1.2 Product Summary
The application is an authenticated web application for:

- managing heavy equipment records
- managing inspection templates
- executing template-driven inspections
- capturing findings, notes, and media evidence
- tracking inspection defects
- reviewing inspection history and reports

### 1.3 Current Functional Boundaries
The system currently supports:

- authentication and protected navigation
- organization-aware inspection data
- equipment CRUD-style management
- inspection template/section/question structure
- active template loading during new inspection flow
- live persistence of inspection runs and answers to Supabase
- media upload to Supabase Storage
- defect listing and update flows
- report/detail viewing for completed inspections

The system does not yet fully implement:

- robust offline queueing with IndexedDB/service worker orchestration
- batch synchronization flows
- automated maintenance ticketing
- QR scanning-driven equipment start flow
- GPS capture in the active UI
- digital signature entry in the active UI

---

## 2. Current Architecture

### 2.1 Container View

```text
┌──────────────────────────────────────────────────────────────┐
│                     User Browser Session                     │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ React + TypeScript + Vite Frontend                    │  │
│  │                                                        │  │
│  │ - React Router routes                                  │  │
│  │ - Zustand stores                                       │  │
│  │ - TanStack Query provider                              │  │
│  │ - Browser speech recognition                           │  │
│  │ - Browser file capture/upload                          │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               │ Supabase client SDK
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                         Supabase                             │
│  ┌────────────────────┐  ┌───────────────────────────────┐  │
│  │ Supabase Auth      │  │ Postgres (poc_he_inspection)  │  │
│  └────────────────────┘  └───────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Supabase Storage bucket: `poc-he-inspection`          │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Current Technology Stack

| Layer | Technology | Current Role |
|---|---|---|
| Frontend | React + TypeScript + Vite | Main application UI |
| Routing | React Router | Protected/public route handling |
| State | Zustand | Auth, settings, inspection, toast, debug state |
| Server state wrapper | TanStack Query | Query provider configured at app root |
| Backend platform | Supabase | Auth, Postgres access, storage |
| Database | PostgreSQL (`poc_he_inspection` schema) | Operational data store |
| Storage | Supabase Storage | Inspection media upload |
| Voice input | Browser SpeechRecognition API | Voice-assisted finding entry |
| UI styling | Tailwind-style utility classes | App presentation layer |

---

## 3. Route and Module Structure

### 3.1 Current Routes

| Route | Page | Purpose |
|---|---|---|
| `/login` | LoginPage | User authentication |
| `/register` | RegisterPage | User registration |
| `/dashboard` | DashboardPage | Landing page after login |
| `/equipment` | EquipmentListPage | List available equipment |
| `/equipment/new` | EquipmentFormPage | Create/edit equipment |
| `/equipment/:id` | EquipmentDetailPage | Equipment detail and related actions |
| `/inspections` | InspectionsListPage | Inspection history list |
| `/inspections/new/:equipmentId` | NewInspectionPage | Start and conduct inspection |
| `/inspections/:id` | InspectionDetailPage | Review inspection answers and sections |
| `/inspections/:id/report` | InspectionReportPage | Inspection report view |
| `/defects` | DefectsPage | Defect list and resolution workflow |
| `/templates` | TemplatesPage | Template list |
| `/templates/:id/edit` | TemplateEditPage | Template editing |
| `/profile` | ProfilePage | User profile |

### 3.2 Access Model
- `/login` and `/register` are public routes
- all operational routes are wrapped in `ProtectedRoute`
- if not authenticated, the user is redirected to `/login`
- if already authenticated, access to public auth routes redirects to `/dashboard`

---

## 4. Core Functional Modules

### 4.1 Authentication Module
The authentication module manages session-based access to the application.

**Current behavior**
- app initializes auth state on startup
- loading state prevents route flicker
- unauthenticated users cannot access inspection pages
- authenticated users are redirected into the main app

**Key functional outcomes**
- protected operational access
- current user availability for inspection ownership
- role field available in user model for future role-based expansion

### 4.2 Equipment Management Module
The equipment module provides the operational starting point for inspection activities.

**Current behavior**
- list equipment ordered by fleet number
- view equipment details
- create/update equipment records
- store equipment metadata such as:
  - equipment type
  - VIN
  - fleet number
  - make/model/year
  - hours
  - status
  - notes
  - image/QR fields in data model

**Primary business use**
- identify the unit to inspect
- maintain active fleet records
- link all inspection activity to a specific equipment record

### 4.3 Template Management Module
The template module defines the structure of an inspection.

**Current behavior**
- system loads the active template if no explicit template id is supplied
- template contains ordered sections
- each section contains ordered questions
- template editing pages exist in current app routes

**Template building blocks**
- inspection template
- template section
- template question

**Question attributes**
- question text
- answer type
- required flag
- media requirement capability
- hint text
- sort order
- selectable options for multi-value questions

### 4.4 Inspection Execution Module
The inspection execution module drives the main operational workflow.

**Current behavior**
- inspection starts from equipment context
- active template is loaded
- inspection run is created in `inspection_runs`
- UI presents one question at a time
- progress and answered counts are shown
- user can move between sections/questions
- user can pause by leaving the page
- user can complete from menu or final submit

### 4.5 Answer Capture Module
Answers are stored per question per inspection.

**Current behavior**
- one answer record per `inspection_id + question_id`
- save operation updates existing answer or inserts a new answer
- answers persist directly to Supabase
- current UI supports:
  - boolean pass path
  - flagged finding path
  - text notes
  - severity assignment
  - optional voice note text persistence behavior through transcript saves

### 4.6 Media Module
The media module supports visual evidence capture.

**Current behavior**
- photo and video file selection/capture from browser
- upload to Supabase Storage bucket `poc-he-inspection`
- record created in `inspection_media`
- during defect flow, media is uploaded first and later linked to answer id
- media can be displayed in inspection context using public URLs

### 4.7 Defect Module
The defect module provides follow-up records separate from raw answers.

**Current behavior**
- defect list can be loaded from `inspection_defects`
- defects can be created and updated
- defect fields include:
  - title
  - description
  - severity
  - status
  - assigned user
  - tag-out flag
  - resolution fields

**Current UI alignment**
- active new inspection screen flags findings through answer severity
- dedicated defect management exists separately in the app
- full critical/tag-out flow is not yet active in the inspection screen UI

### 4.8 Reporting and Review Module
The review module allows inspection outcomes to be revisited.

**Current behavior**
- inspection list shows recent inspections
- inspection detail loads run, answers, and media
- report route exists for post-completion review
- completed inspection redirects to report page

---

## 5. Current Inspection Workflow

### 5.1 Inspection Start
When the user starts a new inspection:

1. Equipment is identified from the route parameter.
2. The system loads the active inspection template.
3. If no current inspection exists, the app creates a new `inspection_run`.
4. The run is stored with:
   - `equipment_id`
   - `template_id`
   - `inspector_id`
   - `status = in_progress`
   - generated `client_id`
   - `started_offline` based on browser online state

### 5.2 Per-Question Flow
Each question currently uses two main paths.

#### Path A: OK / No Finding
1. User taps **Ya — OK (Tidak Ada Temuan)**.
2. System saves answer as:
   - `answer_type = boolean`
   - `boolean_value = true`
   - `flagged = false`
3. System auto-advances to the next question.

#### Path B: Finding / Defect-like Observation
1. User optionally captures photo or video.
2. User optionally dictates voice notes.
3. User can edit finding text in textarea.
4. User selects severity:
   - `low`
   - `medium`
   - `high`
5. System shows confirmation modal.
6. On confirm:
   - answer saved as failed/flagged
   - finding text persisted
   - media records linked to the answer
7. System advances to the next question.

### 5.3 Pause and Resume
- user can pause from the three-dot menu
- current implementation handles pause by leaving the inspection screen
- the in-progress inspection remains stored in backend data
- explicit resume orchestration is limited and depends on the broader page flow rather than a dedicated resume queue mechanism

### 5.4 Completion
Completion can occur in two ways:
- from the last-question submit button
- from the inspection menu action

On completion:
- `inspection_runs.status` becomes `completed`
- `completed_at` is set
- user is redirected to `/inspections/:id/report`

---

## 6. Data Model

### 6.1 Core Types

| Type | Purpose |
|---|---|
| `Organization` | Tenant root record |
| `Site` | Site-level grouping |
| `User` | Authenticated application user |
| `Equipment` | Inspectable asset |
| `InspectionTemplate` | Root inspection checklist definition |
| `TemplateSection` | Ordered section inside template |
| `TemplateQuestion` | Ordered question inside section |
| `InspectionRun` | One execution of an inspection |
| `InspectionAnswer` | One saved answer for one question in one run |
| `InspectionMedia` | Uploaded inspection evidence |
| `InspectionDefect` | Operational defect record |
| `Upload` | Generic file upload record shape |

### 6.2 Enumerations

| Enum | Values |
|---|---|
| `UserRole` | `inspector`, `supervisor`, `manager`, `admin` |
| `EquipmentStatus` | `active`, `down`, `maintenance`, `decommissioned` |
| `AnswerType` | `boolean`, `numeric`, `text`, `multi_select`, `photo_required` |
| `InspectionStatus` | `in_progress`, `completed`, `synced`, `archived` |
| `DefectSeverity` | `low`, `medium`, `high`, `critical` |
| `DefectStatus` | `open`, `in_progress`, `resolved`, `closed` |

### 6.3 Implemented Database Tables

| Table | Functional Role |
|---|---|
| `organizations` | Tenant root |
| `sites` | Site structure |
| `users` | App user directory |
| `equipment` | Equipment registry |
| `inspection_templates` | Inspection template root |
| `template_sections` | Ordered section hierarchy |
| `template_questions` | Question definitions |
| `inspection_runs` | Inspection session records |
| `inspection_answers` | Answer records |
| `inspection_media` | Media evidence metadata |
| `inspection_defects` | Defect records |
| `sync_log` | Sync tracking placeholder/current support table |
| `audit_logs` | Audit event structure |

---

## 7. Seeded Inspection Template Structure

The initial schema seeds one active CAT793 daily pre-shift template.

### 7.1 Current Seeded Sections
1. Engine
2. Tires
3. Brakes
4. Hydraulics
5. Frame & Structure
6. Electrical
7. Suspension & Steering
8. Cooling System
9. Exhaust System
10. Safety Systems

### 7.2 Current Question Count
- 10 sections
- 6 questions per section
- **60 total questions**

### 7.3 Question Design Characteristics
The seeded questions currently use:
- boolean checks
- numeric readings
- optional media-oriented questions
- hint text for inspector guidance
- required flags

---

## 8. Data Persistence Behavior

### 8.1 Equipment Loading
`loadEquipment()`:
- reads from `equipment`
- orders by `fleet_number`
- stores results in Zustand state

### 8.2 Template Loading
`loadTemplate()`:
- loads active template if template id is absent
- loads template root
- loads ordered sections
- loads ordered questions for each section
- stores the complete nested structure in `activeTemplate`

### 8.3 Inspection Creation
`startInspection()`:
- resolves current user id
- inserts into `inspection_runs`
- marks `started_offline` with `!navigator.onLine`
- stores returned inspection in `currentInspection`

### 8.4 Answer Saving
`saveAnswer()`:
- checks whether answer already exists for question
- updates existing answer or inserts a new one
- maintains in-memory map keyed by `question_id`

### 8.5 Inspection Loading
`loadInspection()`:
- loads inspection run
- loads related answers
- loads related media
- reconstructs answer map
- reloads related template

### 8.6 Media Upload
`uploadMedia()`:
- uploads binary file to Supabase Storage
- inserts metadata row into `inspection_media`
- returns created media id

### 8.7 Defect Loading and Update
- `loadDefects()` retrieves latest defects
- `createDefect()` inserts new defect record
- `updateDefect()` updates defect record and reloads list

---

## 9. Security and Access Model

### 9.1 Authentication
- Supabase Auth supplies identity/session
- app auth store initializes user context
- protected routes block unauthenticated users

### 9.2 Tenant Isolation
Row-level security is enabled for:
- equipment
- inspection runs
- inspection answers
- inspection media
- inspection defects
- inspection templates
- template sections
- template questions

### 9.3 Current Isolation Rule Pattern
Most access rules trace `org_id` from:
- direct table ownership, or
- upstream ownership through equipment or templates

This ensures users only operate within their organization context.

---

## 10. Current Limitations and Non-Implemented Areas

### 10.1 Offline Behavior
The schema and types include sync-related fields such as:
- `started_offline`
- `synced_at`
- `is_synced`
- `sync_log`

However, the current implemented application does not yet provide the full offline-first architecture previously documented.

### 10.2 Voice Limitations
Voice input currently depends on:
- supported browser engine
- secure context (`HTTPS`) or localhost
- browser-provided speech recognition behavior

It is not an on-device offline STT implementation.

### 10.3 Defect Severity in Active Inspection UI
Although the broader type model supports `critical`, the current new inspection page exposes:
- `low`
- `medium`
- `high`

### 10.4 Tag-Out Flow
The database supports `tag_out` on defects, but the active new inspection screen does not currently implement the full tag-out operational path.

---

## 11. Functional Requirements by Module

| ID | Requirement | Current Status |
|---|---|---|
| FR-1 | User must authenticate before accessing operational screens | Implemented |
| FR-2 | User must be redirected based on auth state | Implemented |
| FR-3 | System must list equipment records | Implemented |
| FR-4 | System must allow equipment creation/editing | Implemented |
| FR-5 | System must load active inspection template | Implemented |
| FR-6 | System must create an inspection run for selected equipment | Implemented |
| FR-7 | System must save one answer per question per inspection | Implemented |
| FR-8 | System must support quick OK path for compliant answers | Implemented |
| FR-9 | System must support flagged finding capture with severity | Implemented |
| FR-10 | System must support media upload during inspection | Implemented |
| FR-11 | System must support browser-based voice finding entry | Implemented |
| FR-12 | System must show inspection progress | Implemented |
| FR-13 | System must allow inspection completion | Implemented |
| FR-14 | System must list and update defects | Implemented |
| FR-15 | System must allow inspection detail/report review | Implemented |
| FR-16 | System should support robust offline queue and later sync | Not fully implemented |
| FR-17 | System should support QR-driven equipment selection | Not implemented in active flow |
| FR-18 | System should support tag-out workflow during inspection | Partially modeled, not active in current UI |

---

## 12. Summary

The current `he-inspection` system is a Supabase-backed React application that already implements the core heavy equipment inspection lifecycle: authenticated access, equipment management, template-driven inspection execution, answer persistence, evidence capture, defect tracking, and report review.

This FSD is the functional baseline for the current product state and should be used in place of the previous future-state architecture description.