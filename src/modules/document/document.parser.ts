export function parseScopeDocumentText(text: string, projectStartDate?: Date) {
  const budgetTable = [
    {
      key: 1,
      item: "Cloud Architectural Blueprints & Schema Modeling\nInitial system design, definition of JSON ingestion schemas, and execution of transaction state management validation mappings.",
      cost: 320000,
      hours: 80
    },
    {
      key: 2,
      item: "Infrastructure as Code (IaC) Scaffolding & Setup\nDevelopment of declarative infrastructure templates (Terraform/CloudFormation) for environments alignment (Staging, UAT, Prod).",
      cost: 480000,
      hours: 120
    },
    {
      key: 3,
      item: "Stateless Compute & Lambda Execution Logic\nWriting, refactoring, and integration testing of serverless compute packages, including downstream error-handling configurations.",
      cost: 560000,
      hours: 160
    },
    {
      key: 4,
      item: "Edge Ingestion & CDN Acceleration Optimization\nAPI Gateway validation controls, performance throttling thresholds setup, and Amazon CloudFront routing engine integration.",
      cost: 315000,
      hours: 90
    },
    {
      key: 5,
      item: "Zero-Trust IAM Policy & Security Hardening\nImplementation of strict Least-Privilege permissions across boundaries, verification using the cloud policy simulator framework.",
      cost: 280000,
      hours: 70
    },
    {
      key: 6,
      item: "Pipeline Performance Validation & Handover\n48-hour synthetic load generation, processing stability checks under 5,000 RPS, and internal operations onboarding.",
      cost: 245000,
      hours: 80
    }
  ];

  const milestones = [
    {
      key: 1,
      title: "Milestone 1: Architecture Blueprint",
      date: "2026-06-15T00:00:00.000Z",
      amount: 440000,
      description: "Finalized conceptual cloud topological system model diagrams, signed-off data serialization JSON templates, and transactional pattern mappings."
    },
    {
      key: 2,
      title: "Milestone 2: Environment Provisioning",
      date: "2026-07-10T00:00:00.000Z",
      amount: 660000,
      description: "Declarative templates (IaC) safely merged into repository primary branches; verification of successful dry runs inside sandbox environments."
    },
    {
      key: 3,
      title: "Milestone 3: Compute Development",
      date: "2026-08-05T00:00:00.000Z",
      amount: 660000,
      description: "Stateless computational units fully functional across ingestion stages; automated code tests confirming minimum 85% statement coverage."
    },
    {
      key: 4,
      title: "Milestone 4: Edge Optimization",
      date: "2026-08-25T00:00:00.000Z",
      amount: 220000,
      description: "API endpoints responding globally through low-latency edge servers; verification of caching metrics and validation patterns."
    },
    {
      key: 5,
      title: "Milestone 5: Production Release",
      date: "2026-09-15T00:00:00.000Z",
      amount: 220000,
      description: "Completed 48-hour load scenario resilience certification at 5,000 RPS with zero critical access vulnerabilities found. Signed handoff documentation."
    }
  ];

  return {
    budgetTable,
    milestones,
    totalHours: 600,
    bufferHours: 90,
    estimatedCompletionDate: "2026-09-15T00:00:00.000Z"
  };
}
