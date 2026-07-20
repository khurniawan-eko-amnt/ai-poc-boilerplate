# Detailed User Flows
## HE Inspection Application

**Version:** 2.0  
**Date:** 2026-07-20  
**Status:** Updated to Match Current Application

> Mermaid diagrams below reflect the current implemented `he-inspection` flow, route structure, and interaction model.

---

## 1. Login and Protected Access Flow

```mermaid
sequenceDiagram
    actor U as User
    participant A as App
    participant AS as Auth Store
    participant SA as Supabase Auth
    participant R as Router

    U->>A: Open application
    A->>AS: initialize()
    AS->>SA: Check current session

    alt Session exists
        SA-->>AS: Authenticated user
        AS-->>A: initialized + user loaded
        A->>R: Navigate to /dashboard
        R-->>U: Show protected app
    else No session
        SA-->>AS: No authenticated user
        AS-->>A: initialized + no user
        A->>R: Navigate to /login
        R-->>U: Show login page
    end
```

---

## 2. Equipment to New Inspection Flow

```mermaid
sequenceDiagram
    actor I as Inspector
    participant EL as Equipment List / Detail
    participant NI as NewInspectionPage
    participant IS as Inspection Store
    participant DB as Supabase DB

    I->>EL: Open equipment record
    I->>EL: Tap "Start Inspection"
    EL->>NI: Navigate to /inspections/new/:equipmentId

    NI->>IS: loadTemplate()
    IS->>DB: Load active inspection template
    DB-->>IS: Template + sections + questions
    IS-->>NI: activeTemplate ready

    NI->>IS: startInspection(equipmentId, templateId)
    IS->>DB: Insert inspection_runs row
    DB-->>IS: New inspection_run
    IS-->>NI: currentInspection created

    NI-->>I: Show first question
```

---

## 3. Inspection Question Flow — OK Path

```mermaid
sequenceDiagram
    actor I as Inspector
    participant NI as NewInspectionPage
    participant IS as Inspection Store
    participant DB as Supabase DB

    NI-->>I: Show current question
    I->>NI: Tap "Ya — OK"
    NI->>IS: saveAnswer(questionId, boolean=true, flagged=false)
    IS->>DB: Insert or update inspection_answers
    DB-->>IS: Answer saved
    IS-->>NI: Save success
    NI->>NI: Advance to next question
    NI-->>I: Show next question
```

---

## 4. Inspection Question Flow — Finding Path

```mermaid
sequenceDiagram
    actor I as Inspector
    participant NI as NewInspectionPage
    participant IS as Inspection Store
    participant ST as Browser Speech API
    participant SS as Supabase Storage
    participant DB as Supabase DB

    NI-->>I: Show current question

    opt Capture voice note
        I->>NI: Tap Voice
        NI->>ST: Start speech recognition
        ST-->>NI: Transcript text
        NI->>IS: Background save text_value
        IS->>DB: Insert/update answer draft
    end

    opt Capture photo or video
        I->>NI: Tap Photo/Video
        NI->>IS: uploadMedia(file, inspectionId, null)
        IS->>SS: Upload file
        SS-->>IS: Storage upload success
        IS->>DB: Insert inspection_media row
        DB-->>IS: media id
        IS-->>NI: Local media list updated
    end

    I->>NI: Edit finding text if needed
    I->>NI: Select severity (low / medium / high)
    NI-->>I: Show confirmation modal
    I->>NI: Confirm save

    NI->>IS: saveAnswer(questionId, boolean=false, flagged=true, severity, text_value)
    IS->>DB: Insert/update inspection_answers
    DB-->>IS: answer id returned
    NI->>DB: Link uploaded media rows to answer_id
    DB-->>NI: Media linked

    NI-->>I: Show success toast
    NI->>NI: Advance to next question
    NI-->>I: Show next question
```

---

## 5. Inspection Pause Flow

```mermaid
sequenceDiagram
    actor I as Inspector
    participant NI as NewInspectionPage
    participant R as Router
    participant DB as Supabase DB

    I->>NI: Open three-dot menu
    I->>NI: Tap "Jeda Inspeksi"
    NI-->>I: Show info toast
    NI->>R: Navigate back to equipment detail

    Note over DB: Current inspection_run and saved answers remain stored as in_progress
```

---

## 6. Inspection Completion Flow

```mermaid
sequenceDiagram
    actor I as Inspector
    participant NI as NewInspectionPage
    participant IS as Inspection Store
    participant DB as Supabase DB
    participant R as Router

    alt Finish from menu
        I->>NI: Open menu and tap "Selesaikan Inspeksi"
    else Finish from last question
        I->>NI: Tap "Kirim"
    end

    NI->>IS: completeInspection()
    IS->>DB: Update inspection_runs set status='completed', completed_at=now()
    DB-->>IS: Update success
    IS-->>NI: currentInspection updated
    NI-->>I: Success toast
    NI->>R: Navigate to /inspections/:id/report
```

---

## 7. Inspection Review and Report Flow

```mermaid
sequenceDiagram
    actor U as User
    participant IL as InspectionsListPage
    participant ID as InspectionDetailPage
    participant IS as Inspection Store
    participant DB as Supabase DB
    participant RP as InspectionReportPage

    U->>IL: Open inspection history
    IL->>IS: loadInspections()
    IS->>DB: Query inspection_runs
    DB-->>IS: Recent inspections
    IS-->>IL: Show list

    U->>IL: Select one inspection
    IL->>ID: Navigate to /inspections/:id
    ID->>IS: loadInspection(inspectionId)
    IS->>DB: Load run, answers, media
    DB-->>IS: Inspection dataset
    IS-->>ID: Inspection detail available

    U->>ID: Open report
    ID->>RP: Navigate to /inspections/:id/report
    RP-->>U: Show inspection report view
```

---

## 8. Defect Review and Update Flow

```mermaid
sequenceDiagram
    actor S as Supervisor
    participant DP as DefectsPage
    participant IS as Inspection Store
    participant DB as Supabase DB

    S->>DP: Open defects page
    DP->>IS: loadDefects()
    IS->>DB: Query inspection_defects
    DB-->>IS: Latest defects
    IS-->>DP: Show defect list

    S->>DP: Select defect to resolve/update
    DP->>IS: updateDefect(defectId, updates)
    IS->>DB: Update inspection_defects
    DB-->>IS: Update success
    IS->>IS: Reload defects
    IS-->>DP: Refresh list
```

---

## 9. Template Loading and Editing Flow

```mermaid
sequenceDiagram
    actor M as Manager/Admin
    participant TP as TemplatesPage
    participant TE as TemplateEditPage
    participant DB as Supabase DB

    M->>TP: Open templates page
    TP->>DB: Load inspection_templates
    DB-->>TP: Template list
    TP-->>M: Show available templates

    M->>TP: Select template to edit
    TP->>TE: Navigate to /templates/:id/edit
    TE->>DB: Load template, sections, questions
    DB-->>TE: Full template structure
    TE-->>M: Show editable template detail
```

---

## 10. Equipment Management Flow

```mermaid
sequenceDiagram
    actor M as Manager/Admin
    participant EL as EquipmentListPage
    participant EF as EquipmentFormPage
    participant DB as Supabase DB

    M->>EL: Open equipment page
    EL->>DB: Query equipment list
    DB-->>EL: Equipment rows
    EL-->>M: Show equipment list

    M->>EL: Tap add/edit equipment
    EL->>EF: Navigate to equipment form
    M->>EF: Enter equipment details
    EF->>DB: Insert/update equipment row
    DB-->>EF: Save success
    EF-->>M: Show confirmation
```

---

## 11. End-to-End Current Inspection Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Login
    Login --> Dashboard: authenticated

    Dashboard --> EquipmentList
    EquipmentList --> EquipmentDetail
    EquipmentDetail --> NewInspection: start inspection

    state NewInspection {
        [*] --> LoadTemplate
        LoadTemplate --> CreateInspectionRun
        CreateInspectionRun --> AskQuestion

        AskQuestion --> AskQuestion: OK path save + next
        AskQuestion --> CaptureFinding: finding path
        CaptureFinding --> ConfirmFinding
        ConfirmFinding --> AskQuestion: save + next

        AskQuestion --> Paused: menu pause
        AskQuestion --> Completed: finish from menu or final submit
        Paused --> [*]
        Completed --> [*]
    }

    NewInspection --> ReportView: completed
    Dashboard --> InspectionsList
    InspectionsList --> InspectionDetail
    InspectionDetail --> ReportView

    Dashboard --> DefectsPage
    Dashboard --> TemplatesPage
    Dashboard --> ProfilePage
```

---

## 12. Current vs Future-State Note

These flows describe the **current implemented application**. They intentionally do not model the previously documented future-state items such as:

- full offline queue and sync engine
- QR-first inspection start
- automatic maintenance ticketing
- critical tag-out flow from the inspection page
- background template synchronization
- digital signature completion flow

Those items should only be documented again when they are actively implemented.