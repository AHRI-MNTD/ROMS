import type { Domain } from "./types";

/**
 * DOMAIN_CATALOG — extracted verbatim from research-operations-domains-and-sub-functions.html
 * 10 domains × 5 sub-functions × 5 tasks = 250 tasks total.
 */
export const DOMAIN_CATALOG: readonly Domain[] = [
  {
    id: 1,
    slug: "biospecimen",
    emoji: "🧬",
    name: "Biospecimen & Biorepository",
    subfunctions: [
      {
        name: "Sample Collection & Intake",
        tasks: [
          "Design and implement sample collection protocols aligned with study SOPs",
          "Register incoming samples with unique accession IDs and metadata",
          "Capture participant demographics, collection date/time, site, and collector",
          "Perform initial quality assessment at point of intake",
          "Generate chain-of-custody documentation from collection to storage",
        ],
      },
      {
        name: "Processing & Preparation",
        tasks: [
          "Centrifuge whole blood and separate plasma, serum, and buffy coat fractions",
          "Perform aliquoting to defined volumes per study protocol",
          "Execute fixation (FFPE, snap-freeze) and nucleic acid extraction workflows",
          "Label aliquots with barcoded identifiers and record processing timestamps",
          "Log any deviations from standard processing procedures",
        ],
      },
      {
        name: "Cryopreservation & Cold-Chain",
        tasks: [
          "Assign samples to appropriate storage temperature (−80°C, −196°C LN₂, +4°C)",
          "Manage freezer rack/box/position mapping with real-time inventory tracking",
          "Monitor continuous temperature logs via IoT sensors and alert thresholds",
          "Document and investigate any temperature excursion incidents (CAPA)",
          "Coordinate cold-chain logistics for inter-site sample transfers and shipments",
        ],
      },
      {
        name: "Retrieval & Dispensing",
        tasks: [
          "Process sample retrieval requests against approved study allocations",
          "Update inventory records upon dispensing and record remaining volume",
          "Maintain chain-of-custody log for each retrieval event",
          "Flag low-volume or depleted aliquots for review",
          "Enforce restricted access controls for sensitive or limited samples",
        ],
      },
      {
        name: "Disposal & Long-term Planning",
        tasks: [
          "Execute sample destruction per study protocol and regulatory requirements",
          "Generate destruction certificates with witness co-sign",
          "Plan biorepository capacity for projected long-term storage needs",
          "Apply biobank quality standards: ISBER, IARC, H3Africa guidelines",
          "Conduct periodic inventory audits and reconcile physical vs. system records",
        ],
      },
    ],
  },
  {
    id: 2,
    slug: "inventory",
    emoji: "📦",
    name: "Lab Inventory & Supply Chain",
    subfunctions: [
      {
        name: "Stock Management",
        tasks: [
          "Maintain real-time inventory of all consumables, reagents, and kits",
          "Set minimum stock thresholds and automate reorder triggers",
          "Apply FIFO (First In, First Out) rotation to minimise expiry waste",
          "Track batch and lot numbers for full traceability",
          "Monitor expiry dates and flag items approaching end-of-life",
        ],
      },
      {
        name: "Equipment & Instruments",
        tasks: [
          "Maintain a register of all laboratory equipment and instruments",
          "Record serial numbers, purchase dates, warranty, and location",
          "Schedule and log preventive maintenance and service visits",
          "Manage calibration records and certificates",
          "Track instrument qualification status (IQ/OQ/PQ)",
        ],
      },
      {
        name: "Procurement & Vendors",
        tasks: [
          "Manage approved supplier and vendor lists with contact and pricing data",
          "Create, route, and approve purchase orders per procurement policy",
          "Confirm goods receipt and match against delivery notes and invoices",
          "Manage vendor performance reviews and contract renewals",
          "Handle cold-chain supply logistics for temperature-sensitive reagents",
        ],
      },
      {
        name: "Waste Management",
        tasks: [
          "Classify waste streams: biohazardous, chemical, sharps, general",
          "Record waste volumes, disposal dates, and authorised disposal contractors",
          "Ensure compliance with local biosafety and environmental regulations",
          "Maintain waste manifests and disposal certificates",
          "Train staff on correct segregation and disposal procedures",
        ],
      },
      {
        name: "Budget & Cost Allocation",
        tasks: [
          "Assign supply costs to specific studies and cost centres",
          "Track consumables spend against approved study budgets",
          "Generate monthly expenditure reports per study or department",
          "Identify cost-saving opportunities through bulk procurement analysis",
          "Reconcile invoices against purchase orders and goods receipt notes",
        ],
      },
    ],
  },
  {
    id: 3,
    slug: "qms",
    emoji: "📄",
    name: "SOPs & Quality Management",
    subfunctions: [
      {
        name: "SOP Authoring & Control",
        tasks: [
          "Draft new SOPs using standardised templates with required metadata",
          "Route SOPs through defined review, approval, and sign-off workflows",
          "Version-control all documents and archive superseded versions",
          "Manage controlled copy distribution to authorised staff",
          "Enforce document change control procedures for all amendments",
        ],
      },
      {
        name: "Training & Acknowledgment",
        tasks: [
          "Assign SOPs to relevant staff roles upon issue or revision",
          "Track and record staff training completion and read-acknowledgments",
          "Generate training gap reports by role or department",
          "Link training records to competency assessments",
          "Send automated reminders for overdue training items",
        ],
      },
      {
        name: "Audits & CAPA",
        tasks: [
          "Plan and execute internal quality audits against defined schedules",
          "Record audit findings, observations, and non-conformances",
          "Issue CAPA (Corrective and Preventive Action) plans with owners and deadlines",
          "Track CAPA implementation progress and verify effectiveness",
          "Prepare for external audits by regulatory bodies, funders, and accreditors",
        ],
      },
      {
        name: "Incident & Deviation Reporting",
        tasks: [
          "Log non-conformances, deviations, and near-miss events",
          "Conduct root cause analysis for significant incidents",
          "Escalate critical deviations to QA management and relevant stakeholders",
          "Implement corrective actions and document outcomes",
          "Trend incident data for quality improvement initiatives",
        ],
      },
      {
        name: "QMS & Accreditation",
        tasks: [
          "Implement and maintain a Quality Management System (ISO 15189 / ISO 17025)",
          "Align laboratory practices with GLP, GCP, and applicable regulatory standards",
          "Manage risk registers and update risk assessments periodically",
          "Maintain accreditation status and respond to accreditation body findings",
          "Report quality KPIs to laboratory management and governance committees",
        ],
      },
    ],
  },
  {
    id: 4,
    slug: "lab-workflow",
    emoji: "🧪",
    name: "Lab Workflow & Experiments",
    subfunctions: [
      {
        name: "Protocol Design & Tracking",
        tasks: [
          "Register experimental protocols linked to approved study documents",
          "Define and document sample-to-assay workflow steps and decision points",
          "Version-control protocols and track amendments with change rationale",
          "Assign protocols to specific instruments, staff, and timelines",
          "Monitor protocol adherence and flag deviations in real time",
        ],
      },
      {
        name: "Instrument Scheduling",
        tasks: [
          "Manage shared instrument booking calendars across studies and teams",
          "Record instrument usage logs with operator, run details, and duration",
          "Coordinate instrument downtime for maintenance and calibration",
          "Alert users to scheduling conflicts or instrument unavailability",
          "Track instrument utilisation rates for capacity planning",
        ],
      },
      {
        name: "Result Capture & QC",
        tasks: [
          "Capture raw data outputs from plate readers, sequencers, analysers, and imaging systems",
          "Apply quality control checks: positive/negative controls, blanks, replicates",
          "Flag out-of-specification results for review and re-analysis",
          "Link results to samples, assay runs, and operators for full traceability",
          "Archive raw data files with metadata in compliant storage systems",
        ],
      },
      {
        name: "Batch & Run Management",
        tasks: [
          "Plan and schedule batch processing runs to optimise throughput",
          "Track batch composition, reagent lot numbers, and instrument settings",
          "Monitor turnaround times against agreed service level targets",
          "Generate batch run reports and escalate delays to study teams",
          "Manage repeat runs and document justification for repeat testing",
        ],
      },
      {
        name: "Assay Validation",
        tasks: [
          "Design and execute assay validation and method verification studies",
          "Document validation parameters: sensitivity, specificity, linearity, precision",
          "Generate validation reports for regulatory and accreditation submissions",
          "Manage inter-laboratory comparison and external quality assurance (EQA) schemes",
          "Integrate laboratory automation and robotics workflows into validated processes",
        ],
      },
    ],
  },
  {
    id: 5,
    slug: "data-management",
    emoji: "📊",
    name: "Research Data Management",
    subfunctions: [
      {
        name: "Data Capture & EDC",
        tasks: [
          "Design case report forms (CRFs) aligned with the study protocol",
          "Configure and administer electronic data capture (EDC) systems such as REDCap",
          "Implement electronic lab notebooks (ELN) for raw data capture",
          "Enforce ALCOA+ principles: Attributable, Legible, Contemporaneous, Original, Accurate",
          "Manage user access, roles, and permissions within EDC platforms",
        ],
      },
      {
        name: "Data Validation & Cleaning",
        tasks: [
          "Build and apply edit checks and validation rules within the EDC system",
          "Generate data query listings and route queries to study site staff",
          "Track query resolution status and enforce response timelines",
          "Perform manual data review and cross-field consistency checks",
          "Document all data corrections with audit trail entries",
        ],
      },
      {
        name: "Standards & Compliance",
        tasks: [
          "Apply CDISC standards: CDASH for data collection, SDTM for submission, ADaM for analysis",
          "Ensure compliance with data privacy regulations (GDPR, POPIA, HIPAA)",
          "Manage participant consent records linked to data use permissions",
          "Implement 21 CFR Part 11 / EU Annex 11 controls for electronic records",
          "Prepare data governance documentation for regulatory submissions",
        ],
      },
      {
        name: "Statistical Analysis",
        tasks: [
          "Develop and version-control statistical analysis plans (SAPs)",
          "Perform database lock procedures prior to unblinding and analysis",
          "Execute statistical programming for primary and secondary endpoints",
          "Generate analysis datasets (ADaM) and output tables, listings, and figures",
          "Document all analytical decisions and deviations from the SAP",
        ],
      },
      {
        name: "Data Sharing & Archiving",
        tasks: [
          "Prepare data packages for transfer to sponsors, funders, or regulatory authorities",
          "Deposit datasets in approved repositories following FAIR principles",
          "Archive study databases, documentation, and audit trails per retention schedules",
          "Implement data de-identification procedures for secondary use datasets",
          "Manage data sharing agreements and access request workflows",
        ],
      },
    ],
  },
  {
    id: 6,
    slug: "infrastructure",
    emoji: "📡",
    name: "Infrastructure & IT Services",
    subfunctions: [
      {
        name: "Platform Administration",
        tasks: [
          "Administer LIMS, ELN, EDC, and ROMS platforms including user provisioning",
          "Manage system configurations, upgrades, and patch deployments",
          "Maintain integration pipelines between laboratory systems (HL7, FHIR, REST APIs)",
          "Monitor system uptime, performance, and availability metrics",
          "Provide first- and second-line IT support to research staff",
        ],
      },
      {
        name: "Data Security",
        tasks: [
          "Implement role-based access control (RBAC) across all research platforms",
          "Manage data encryption at rest and in transit",
          "Execute regular backup schedules and verify restoration procedures",
          "Conduct vulnerability assessments and penetration testing",
          "Respond to and document information security incidents",
        ],
      },
      {
        name: "HPC & Bioinformatics",
        tasks: [
          "Provision and manage high-performance computing (HPC) infrastructure",
          "Deploy and maintain bioinformatics analysis pipelines",
          "Manage software environments, containerisation (Docker, Singularity), and versioning",
          "Allocate compute resources across research projects and users",
          "Support researchers with data transfer to and from HPC environments",
        ],
      },
      {
        name: "Monitoring & Biosafety Systems",
        tasks: [
          "Deploy and manage IoT-based cold-chain temperature monitoring infrastructure",
          "Configure alert thresholds and escalation protocols for environmental excursions",
          "Monitor biosafety and containment systems for BSL-2/3 laboratories",
          "Maintain audit logs for facility access control systems",
          "Conduct periodic testing of monitoring system failover and redundancy",
        ],
      },
      {
        name: "Disaster Recovery & Continuity",
        tasks: [
          "Develop and maintain disaster recovery and business continuity plans",
          "Conduct scheduled DR tests and document outcomes and remediation actions",
          "Manage instrument qualification records: IQ, OQ, and PQ documentation",
          "Ensure regulatory compliance for electronic systems (21 CFR Part 11, GDPR)",
          "Provide IT training and onboarding for new research staff and system users",
        ],
      },
    ],
  },
  {
    id: 7,
    slug: "hr",
    emoji: "👤",
    name: "HR & Staff Operations",
    subfunctions: [
      {
        name: "Recruitment & Onboarding",
        tasks: [
          "Manage job postings, applicant tracking, and interview scheduling",
          "Process employment contracts, background checks, and credentialing",
          "Coordinate new staff onboarding including IT access, lab inductions, and safety training",
          "Assign role-based access permissions in research systems upon joining",
          "Manage offboarding procedures including access revocation and equipment return",
        ],
      },
      {
        name: "Training & Competency",
        tasks: [
          "Conduct competency assessments for all laboratory and clinical staff roles",
          "Maintain certification records for GCP, GLP, biosafety, and regulatory training",
          "Manage CPD (continuing professional development) plans and records",
          "Track training compliance rates and escalate gaps to line managers",
          "Coordinate external training courses, workshops, and conference attendance",
        ],
      },
      {
        name: "Scheduling & Capacity",
        tasks: [
          "Manage staff rosters, shift schedules, and on-call arrangements",
          "Plan workforce capacity against study timelines and workload forecasts",
          "Manage delegation and acting-up arrangements during absences",
          "Record leave requests, approvals, and balance management",
          "Generate capacity reports to support resource allocation decisions",
        ],
      },
      {
        name: "Performance Management",
        tasks: [
          "Set individual performance objectives aligned to team and organisational goals",
          "Conduct mid-year and annual performance review processes",
          "Document performance improvement plans where required",
          "Record disciplinary and grievance proceedings per HR policy",
          "Report workforce metrics to institutional HR and management",
        ],
      },
      {
        name: "Health & Safety Records",
        tasks: [
          "Maintain occupational health records including vaccination and medical surveillance",
          "Manage visitor and student researcher registration and access",
          "Track completion of mandatory health and safety training",
          "Record work-related injuries, exposures, and near-miss incidents",
          "Coordinate periodic occupational health assessments for at-risk staff",
        ],
      },
    ],
  },
  {
    id: 8,
    slug: "finance",
    emoji: "💰",
    name: "Finance & Grant Management",
    subfunctions: [
      {
        name: "Pre-Award Management",
        tasks: [
          "Support grant writing with budget development and justification",
          "Manage submission of funding applications to donors and agencies",
          "Track application status and liaise with funding bodies during review",
          "Review award terms and conditions prior to acceptance",
          "Set up approved grants in the institutional financial management system",
        ],
      },
      {
        name: "Post-Award Monitoring",
        tasks: [
          "Monitor grant expenditure against approved budgets in real time",
          "Perform regular budget reforecasting and variance analysis",
          "Allocate direct and indirect research costs to appropriate grant codes",
          "Manage budget modifications and no-cost extension requests",
          "Produce monthly financial dashboards for PIs and management",
        ],
      },
      {
        name: "Funder Reporting",
        tasks: [
          "Prepare and submit financial reports to funders on required schedules",
          "Compile progress and milestone reports aligned to grant agreements",
          "Coordinate financial audits requested by funders or oversight bodies",
          "Manage financial documentation for donor site visits and reviews",
          "Ensure compliance with funder-specific financial policies and procurement rules",
        ],
      },
      {
        name: "Sub-Awards & Contracts",
        tasks: [
          "Issue and manage sub-award agreements with partner institutions",
          "Monitor sub-awardee financial reporting and compliance",
          "Process sub-awardee invoices and manage payment schedules",
          "Conduct risk assessments and capacity reviews for new sub-awardees",
          "Manage contract renewals, amendments, and close-out procedures",
        ],
      },
      {
        name: "Compliance & Close-Out",
        tasks: [
          "Ensure compliance with foreign funding regulations (currency controls, FCPA)",
          "Manage cost recovery and indirect cost (overhead) rate applications",
          "Execute grant close-out: final financial reconciliation and reporting",
          "Archive grant financial records per institutional and funder retention policies",
          "Coordinate study financial close-out with regulatory and ethics wind-down",
        ],
      },
    ],
  },
  {
    id: 9,
    slug: "participant",
    emoji: "👥",
    name: "Participant & Community Engagement",
    subfunctions: [
      {
        name: "Recruitment & Screening",
        tasks: [
          "Develop and execute participant recruitment strategies per protocol",
          "Screen potential participants against eligibility criteria",
          "Maintain recruitment logs and enrolment tracking dashboards",
          "Report enrolment rates and projections to study management teams",
          "Manage referral networks and community outreach for participant identification",
        ],
      },
      {
        name: "Informed Consent",
        tasks: [
          "Conduct initial informed consent processes using approved consent forms",
          "Document consent with participant signature, date, and witness details",
          "Manage re-consent processes when protocol amendments affect participants",
          "Record and action participant consent withdrawal requests",
          "Implement special consent procedures for vulnerable populations (children, pregnant women)",
        ],
      },
      {
        name: "Scheduling & Retention",
        tasks: [
          "Schedule participant study visits, procedures, and follow-up appointments",
          "Send visit reminders and manage appointment rescheduling",
          "Track missed visits and implement retention strategies",
          "Manage long-term follow-up cohort scheduling and contact maintenance",
          "Record participant reimbursements and compensation payments",
        ],
      },
      {
        name: "Community Advisory Boards",
        tasks: [
          "Constitute and manage Community Advisory Board (CAB) membership",
          "Coordinate CAB meeting schedules, agendas, and minute-taking",
          "Present study progress updates and emerging findings to the CAB",
          "Incorporate CAB feedback into study conduct and communication materials",
          "Manage CAB member compensation, training, and engagement activities",
        ],
      },
      {
        name: "Privacy & Vulnerable Groups",
        tasks: [
          "Implement participant data de-identification and pseudonymisation procedures",
          "Manage data access restrictions for sensitive participant information",
          "Apply additional protections for vulnerable population subgroups",
          "Communicate community benefit outcomes to stakeholders",
          "Ensure participant privacy compliance with GDPR, POPIA, and applicable local laws",
        ],
      },
    ],
  },
  {
    id: 10,
    slug: "regulatory",
    emoji: "🛡️",
    name: "Regulatory, Ethics & Compliance",
    subfunctions: [
      {
        name: "Ethics Submissions",
        tasks: [
          "Prepare and submit new study applications to IRB/IEC/Research Ethics Committees",
          "Manage continuing review submissions and annual renewals",
          "Submit protocol amendment applications and track approval status",
          "Respond to ethics committee queries and requests for additional information",
          "Maintain records of all ethics correspondence and approvals",
        ],
      },
      {
        name: "Regulatory Affairs",
        tasks: [
          "Manage regulatory authority interactions (FDA, EMA, NAFDAC, ERCA, etc.)",
          "Submit clinical trial registrations to ClinicalTrials.gov, PACTR, and ISRCTN",
          "Prepare regulatory submissions, dossiers, and briefing documents",
          "Track regulatory approval timelines and respond to authority queries",
          "Manage import/export permits for biological materials and investigational products",
        ],
      },
      {
        name: "GCP & Compliance",
        tasks: [
          "Implement and monitor ICH-GCP compliance across all clinical research activities",
          "Conduct GCP compliance assessments and training for site staff",
          "Apply 21 CFR Part 11 / EU Annex 11 controls for electronic records and signatures",
          "Manage risk-based monitoring plans and oversight of study conduct",
          "Oversee dual-use research of concern (DURC) review and oversight processes",
        ],
      },
      {
        name: "Adverse Event Reporting",
        tasks: [
          "Record and manage adverse event (AE) and serious adverse event (SAE) reports",
          "Assess SAE causality and expectedness per investigator brochure",
          "Submit expedited safety reports to ethics committees and regulatory authorities",
          "Manage pharmacovigilance data collection and aggregate safety reporting",
          "Coordinate safety data reviews with the Data Safety Monitoring Board (DSMB)",
        ],
      },
      {
        name: "Inspection Readiness & TMF",
        tasks: [
          "Maintain the Trial Master File (TMF) in a state of continuous inspection readiness",
          "Conduct periodic TMF quality reviews and completeness assessments",
          "Prepare site and sponsor files for regulatory inspections and audits",
          "Train staff on inspection readiness procedures and documentation standards",
          "Manage archiving and retention of regulatory and trial documentation",
        ],
      },
    ],
  },
] as const;
