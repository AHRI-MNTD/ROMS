import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

interface GuidelineSection {
  id: string;
  title: string;
  plainText: string;
  content: React.ReactNode;
  icon?: string;
}

const GUIDELINE_SECTIONS: GuidelineSection[] = [
  {
    id: "intro",
    title: "Introduction",
    plainText: "Every organization performs numerous activities on a daily basis ranging from administrative tasks and equipment operation to service delivery and quality assurance To ensure that these activities are carried out consistently and correctly organizations develop Standard Operating Procedures SOPs An SOP is a documented set of instructions that describes how a specific task or process should be performed It provides employees with clear guidance on what to do how to do it who is responsible and what records must be maintained SOPs are fundamental tools for maintaining quality efficiency safety and consistency within an organization They transform organizational knowledge into written instructions that can be followed by all employees regardless of their experience level By establishing a standardized approach to work SOPs minimize variations in performance reduce errors and ensure that activities are conducted according to approved requirements",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p>Every organization performs numerous activities on a daily basis, ranging from administrative tasks and equipment operation to service delivery and quality assurance. To ensure that these activities are carried out consistently and correctly, organizations develop Standard Operating Procedures (SOPs).</p>
        <p>An SOP is a documented set of instructions that describes how a specific task or process should be performed. It provides employees with clear guidance on what to do, how to do it, who is responsible, and what records must be maintained.</p>
        <p>SOPs are fundamental tools for maintaining quality, efficiency, safety, and consistency within an organization. They transform organizational knowledge into written instructions that can be followed by all employees, regardless of their experience level. By establishing a standardized approach to work, SOPs minimize variations in performance, reduce errors, and ensure that activities are conducted according to approved requirements.</p>
      </div>
    )
  },
  {
    id: "purpose",
    title: "Purpose of SOPs",
    plainText: "The primary purpose of an SOP is to ensure that tasks are performed in a uniform and controlled manner When procedures are documented and followed consistently organizations can achieve reliable outcomes improve productivity and maintain compliance with quality standards SOPs help organizations to standardize routine and critical activities ensure consistency among different employees reduce operational errors and risks improve quality and reliability of results facilitate employee training and orientation clarify responsibilities and accountability preserve organizational knowledge support auditing monitoring and continuous improvement",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p>The primary purpose of an SOP is to ensure that tasks are performed in a uniform and controlled manner. When procedures are documented and followed consistently, organizations can achieve reliable outcomes, improve productivity, and maintain compliance with quality standards.</p>
        <div style={{ background: "var(--color-primary-soft)", borderLeft: "4px solid var(--color-primary)", padding: "14px", borderRadius: "0 8px 8px 0", marginTop: 8 }}>
          <strong style={{ display: "block", marginBottom: 6, color: "var(--color-primary)" }}>SOPs help organizations to:</strong>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            <li>Standardize routine and critical activities.</li>
            <li>Ensure consistency among different employees.</li>
            <li>Reduce operational errors and risks.</li>
            <li>Improve quality and reliability of results.</li>
            <li>Facilitate employee training and orientation.</li>
            <li>Clarify responsibilities and accountability.</li>
            <li>Preserve organizational knowledge.</li>
            <li>Support auditing, monitoring, and continuous improvement.</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: "characteristics",
    title: "Characteristics of an Effective SOP",
    plainText: "A well-developed SOP should possess several important characteristics Clarity Instructions should be written in simple and understandable language Accuracy Procedures should reflect the actual process being performed Completeness All necessary steps responsibilities and requirements should be included Consistency Similar activities should follow a uniform structure and format Accessibility SOPs should be available to all personnel who need to use them Currency SOPs should be reviewed and updated regularly to reflect changes in procedures equipment or regulations",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p>A well-developed SOP should possess several important characteristics:</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
          {[
            { title: "Clarity ", desc: "Instructions should be written in simple and understandable language." },
            { title: "Accuracy ", desc: "Procedures should reflect the actual process being performed." },
            { title: "Completeness ", desc: "All necessary steps, responsibilities, and requirements should be included." },
            { title: "Consistency ", desc: "Similar activities should follow a uniform structure and format." },
            { title: "Accessibility ", desc: "SOPs should be available to all personnel who need to use them." },
            { title: "Currency ", desc: "SOPs should be reviewed and updated regularly to reflect changes in procedures, equipment, or regulations." }
          ].map(item => (
            <div key={item.title} style={{ padding: "12px", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)" }}>
              <strong style={{ color: "var(--color-primary)", display: "block", marginBottom: 4 }}>{item.title}</strong>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-muted)", lineHeight: "1.4" }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: "types",
    title: "Types of SOPs",
    plainText: "Organizations often classify SOPs into three major categories depending on their purpose and content 1 Procedure SOPs Procedure SOPs describe operational and administrative processes They explain the sequence of activities that employees must follow to complete a specific task or workflow Examples include Document control procedures Inventory management procedures Staff induction procedures Customer service procedures Record management procedures These SOPs typically define objectives responsibilities workflow steps required documents forms and reporting requirements 2 Equipment SOPs Equipment SOPs provide detailed instructions for operating maintaining calibrating and troubleshooting equipment Typical contents include Equipment description Safety precautions Startup procedures Calibration procedures Maintenance requirements Operational instructions Problem-solving guidelines Equipment SOPs help ensure that equipment functions correctly and safely while extending its operational lifespan 3 Analysis SOPs Analysis SOPs describe analytical testing or examination procedures They provide detailed guidance on sample handling reagents quality control analysis methods result interpretation and reporting These SOPs generally include Principle of analysis Sample requirements Equipment and materials Reagents and chemicals Quality control procedures Step-by-step analytical methods Result processing and reporting Analysis SOPs ensure that analytical procedures are performed accurately and consistently leading to reliable and reproducible results",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p>Organizations often classify SOPs into three major categories depending on their purpose and content.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: 14, borderLeft: "4px solid var(--color-primary)", background: "var(--color-surface-2)", borderRadius: "0 8px 8px 0" }}>
            <strong style={{ fontSize: "14px", color: "var(--color-primary)" }}>1. Procedure SOPs</strong>
            <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "var(--color-text-muted)" }}>
              Procedure SOPs describe operational and administrative processes. They explain the sequence of activities that employees must follow to complete a specific task or workflow.
            </p>
            <div style={{ marginTop: 8, fontSize: "12px" }}>
              <strong>Examples:</strong> Document control, Inventory management, Staff induction, Customer service, and Record management.
            </div>
          </div>
          <div style={{ padding: 14, borderLeft: "4px solid #10b981", background: "var(--color-surface-2)", borderRadius: "0 8px 8px 0" }}>
            <strong style={{ fontSize: "14px", color: "#10b981" }}>2. Equipment SOPs</strong>
            <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "var(--color-text-muted)" }}>
              Equipment SOPs provide detailed instructions for operating, maintaining, calibrating, and troubleshooting equipment.
            </p>
            <div style={{ marginTop: 8, fontSize: "12px" }}>
              <strong>Typical contents:</strong> Equipment description, Safety precautions, Startup procedures, Calibration procedures, Maintenance requirements, Operational instructions, and Problem-solving guidelines.
            </div>
          </div>
          <div style={{ padding: 14, borderLeft: "4px solid #f59e0b", background: "var(--color-surface-2)", borderRadius: "0 8px 8px 0" }}>
            <strong style={{ fontSize: "14px", color: "#f59e0b" }}>3. Analysis SOPs</strong>
            <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "var(--color-text-muted)" }}>
              Analysis SOPs describe analytical, testing, or examination procedures. They provide detailed guidance on sample handling, reagents, quality control, analysis methods, result interpretation, and reporting.
            </p>
            <div style={{ marginTop: 8, fontSize: "12px" }}>
              <strong>Typical contents:</strong> Principle of analysis, Sample requirements, Equipment and materials, Reagents and chemicals, Quality control procedures, Step-by-step analytical methods, and Result processing/reporting.
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "process",
    title: "SOP Development Process",
    plainText: "Developing an SOP is a systematic process that involves multiple stakeholders Step 1 Identification of Need An employee or department identifies the need for a new SOP or the revision of an existing one Step 2 Assignment of Responsibilities Appropriate personnel are assigned responsibilities for writing reviewing and approving the document Step 3 Drafting the SOP The author prepares the SOP using the appropriate framework and format The document should be based on technical expertise and practical experience Step 4 Review and Verification The draft SOP is reviewed by users and subject-matter experts to ensure technical accuracy practicality and compliance with quality requirements Step 5 Approval Authorized management personnel review and formally approve the SOP before implementation Step 6 Distribution and Implementation The approved SOP is distributed to relevant personnel who receive training on its content and application Step 7 Review and Revision SOPs are periodically reviewed and revised whenever procedures equipment regulations or organizational requirements change",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p>Developing an SOP is a systematic process that involves multiple stakeholders.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { step: "Step 1", title: "Identification of Need", desc: "An employee or department identifies the need for a new SOP or the revision of an existing one." },
            { step: "Step 2", title: "Assignment of Responsibilities", desc: "Appropriate personnel are assigned responsibilities for writing, reviewing, and approving the document." },
            { step: "Step 3", title: "Drafting the SOP", desc: "The author prepares the SOP using the appropriate framework and format. The document should be based on technical expertise and practical experience." },
            { step: "Step 4", title: "Review and Verification", desc: "The draft SOP is reviewed by users and subject-matter experts to ensure technical accuracy, practicality, and compliance with quality requirements." },
            { step: "Step 5", title: "Approval", desc: "Authorized management personnel review and formally approve the SOP before implementation." },
            { step: "Step 6", title: "Distribution and Implementation", desc: "The approved SOP is distributed to relevant personnel, who receive training on its content and application." },
            { step: "Step 7", title: "Review and Revision", desc: "SOPs are periodically reviewed and revised whenever procedures, equipment, regulations, or organizational requirements change." }
          ].map(item => (
            <div key={item.step} style={{ display: "flex", gap: 12, padding: "8px 12px", background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "4px" }}>
              <span style={{ fontWeight: 800, color: "var(--color-primary)", minWidth: "55px", fontSize: "13px" }}>{item.step}</span>
              <div style={{ fontSize: "13px" }}>
                <strong>{item.title}</strong>: <span style={{ color: "var(--color-text-muted)" }}>{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: "structure",
    title: "Structure of an SOP",
    plainText: "Although SOP formats may vary among organizations a standard SOP commonly contains the following sections Title Objectives and Scope Abbreviations and Definitions Responsibilities and Accountabilities Procedure or Method Related Documents Related Forms References Attachments or Annexes This structured approach ensures consistency and makes SOPs easier to understand and use",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p>Although SOP formats may vary among organizations, a standard SOP commonly contains the following sections:</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0" }}>
          {[
            "Title", "Objectives and Scope", "Abbreviations and Definitions",
            "Responsibilities and Accountabilities", "Procedure or Method",
            "Related Documents", "Related Forms", "References", "Attachments or Annexes"
          ].map(sec => (
            <span key={sec} style={{ padding: "6px 12px", background: "var(--color-primary-soft)", color: "var(--color-primary)", borderRadius: "20px", fontSize: "11px", fontWeight: "bold" }}>
              {sec}
            </span>
          ))}
        </div>
        <p>This structured approach ensures consistency and makes SOPs easier to understand and use.</p>
      </div>
    )
  },
  {
    id: "benefits",
    title: "Benefits of SOPs",
    plainText: "The implementation of SOPs provides numerous benefits to organizations Improved Quality Standardized procedures reduce variation and improve the quality of outputs and services Enhanced Efficiency Employees spend less time determining how tasks should be performed because instructions are readily available Reduced Errors Clear guidance minimizes mistakes and operational risks Better Training New employees can quickly learn procedures through documented instructions Increased Accountability Clearly defined responsibilities make it easier to identify and monitor performance Regulatory Compliance SOPs help organizations comply with internal policies industry standards and regulatory requirements Knowledge Retention Critical organizational knowledge remains available even when experienced employees leave the organization",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p>The implementation of SOPs provides numerous benefits to organizations:</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { t: "Improved Quality", d: "Standardized procedures reduce variation and improve the quality of outputs and services." },
            { t: "Enhanced Efficiency", d: "Employees spend less time determining how tasks should be performed because instructions are readily available." },
            { t: "Reduced Errors", d: "Clear guidance minimizes mistakes and operational risks." },
            { t: "Better Training", d: "New employees can quickly learn procedures through documented instructions." },
            { t: "Increased Accountability", d: "Clearly defined responsibilities make it easier to identify and monitor performance." },
            { t: "Regulatory Compliance", d: "SOPs help organizations comply with internal policies, industry standards, and regulatory requirements." },
            { t: "Knowledge Retention", d: "Critical organizational knowledge remains available even when experienced employees leave the organization." }
          ].map(item => (
            <div key={item.t} style={{ padding: 12, background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: "var(--radius)" }}>
              <strong style={{ color: "var(--color-primary)", display: "block", marginBottom: 2 }}>{item.t}</strong>
              <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{item.d}</span>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: "conclusion",
    title: "Conclusion",
    plainText: "Standard Operating Procedures are essential management and quality tools that ensure tasks are performed consistently efficiently and safely They provide employees with clear instructions define responsibilities and establish standardized methods for carrying out organizational activities Through proper development implementation and continuous review SOPs contribute significantly to operational excellence quality improvement employee competency and organizational success By documenting best practices and promoting uniformity SOPs serve as the foundation for effective and reliable organizational performance",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p>Standard Operating Procedures are essential management and quality tools that ensure tasks are performed consistently, efficiently, and safely. They provide employees with clear instructions, define responsibilities, and establish standardized methods for carrying out organizational activities.</p>
        <p>Through proper development, implementation, and continuous review, SOPs contribute significantly to operational excellence, quality improvement, employee competency, and organizational success. By documenting best practices and promoting uniformity, SOPs serve as the foundation for effective and reliable organizational performance.</p>
      </div>
    )
  },
  {
    id: "questions",
    title: "Discussion Questions",
    plainText: "What is a Standard Operating Procedure SOP Why are SOPs important in an organization What are the three main types of SOPs How does an Equipment SOP differ from an Analysis SOP What are the key steps involved in developing an SOP What are the major components of a standard SOP How do SOPs contribute to quality improvement and employee training",
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p>Think about these questions to evaluate your understanding of Standard Operating Procedures:</p>
        <ol style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          <li>What is a Standard Operating Procedure (SOP)?</li>
          <li>Why are SOPs important in an organization?</li>
          <li>What are the three main types of SOPs?</li>
          <li>How does an Equipment SOP differ from an Analysis SOP?</li>
          <li>What are the key steps involved in developing an SOP?</li>
          <li>What are the major components of a standard SOP?</li>
          <li>How do SOPs contribute to quality improvement and employee training?</li>
        </ol>
      </div>
    )
  }
];

export default function SOPGuidelinesPage() {
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden", fontFamily: "var(--font-body)", background: "var(--color-bg)" }}>
      {/* Title block */}
      <div
        style={{
          padding: "14px 24px",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase", display: "block" }}>
              QMS Resources
            </span>
            <h1 style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-text)", margin: 0, letterSpacing: "-0.01em" }}>
              Standard Operating Procedures (SOPs) Reference Guidelines
            </h1>
          </div>
        </div>

        <button
          onClick={() => navigate("/domains/qms/sop-authoring-control")}
          style={{
            padding: "6px 14px",
            fontSize: "12px",
            fontWeight: 700,
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            border: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.15s ease",
            outline: "none"
          }}
        >
          <span>← Back to SOPs</span>
        </button>
      </div>

      {/* Main content pane - Single scrollable container */}
      <div style={{ flex: 1, padding: "32px 40px", overflowY: "auto", background: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: "100%", maxWidth: "900px", display: "flex", flexDirection: "column", gap: 40 }}>
          {GUIDELINE_SECTIONS.map((sec) => (
            <div key={sec.id} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ borderBottom: "2px solid var(--color-border)", paddingBottom: 12 }}>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "var(--color-primary)", margin: 0 }}>
                  {sec.title}
                </h3>
              </div>
              <div style={{ color: "var(--color-text)", fontSize: "14px", lineHeight: "1.7" }}>
                {sec.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
