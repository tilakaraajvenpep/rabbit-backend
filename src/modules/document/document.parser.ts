export function parseScopeDocumentText(text: string, projectStartDate?: Date) {
  const getFallbackBudget = () => [
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

  const getFallbackMilestones = () => [
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

  if (!text || text.trim().length === 0) {
    return {
      budgetTable: getFallbackBudget(),
      milestones: getFallbackMilestones(),
      totalHours: 600,
      bufferHours: 90,
      estimatedCompletionDate: "2026-09-15T00:00:00.000Z"
    };
  }

  const budgetTable: any[] = [];
  const milestones: any[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let budgetKey = 1;
  let milestoneKey = 1;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Skip header lines and total lines
    if (lowerLine.includes('total') || lowerLine.includes('summary') || lowerLine.includes('description') || lowerLine.includes('cost (inr)') || lowerLine.includes('total hours')) {
      continue;
    }

    // Match budget lines
    // Strategy B: Description followed by Hours (1-3 digits) and Cost (5+ chars including digits/commas/dots)
    // Example: Hardware Prototyping & Enclosure Engineering 140 ₹4,90,000.00
    const matchB = line.match(/^(.+?)\s+(\d{1,3})\s+[\$₹£€]?\s*([\d,]+(?:\.\d+)?)\s*$/i);
    if (matchB && !lowerLine.includes('milestone')) {
      const item = matchB[1].replace(/^\s*[-*•\d\.]*\s*/, '').trim();
      const hours = parseFloat(matchB[2]);
      const cost = parseFloat(matchB[3].replace(/,/g, ''));
      if (item && !isNaN(hours) && !isNaN(cost) && cost >= 1000) {
        budgetTable.push({
          key: budgetKey++,
          item,
          cost,
          hours
        });
        continue;
      }
    }

    // Strategy C: Description followed by Cost (5+ chars) and Hours (1-3 digits)
    // Example: Hardware Prototyping & Enclosure Engineering ₹4,90,000.00 140
    const matchC = line.match(/^(.+?)\s+[\$₹£€]?\s*([\d,]+(?:\.\d+)?)\s+(\d{1,3})\s*$/i);
    if (matchC && !lowerLine.includes('milestone')) {
      const item = matchC[1].replace(/^\s*[-*•\d\.]*\s*/, '').trim();
      const cost = parseFloat(matchC[2].replace(/,/g, ''));
      const hours = parseFloat(matchC[3]);
      if (item && !isNaN(hours) && !isNaN(cost) && cost >= 1000) {
        budgetTable.push({
          key: budgetKey++,
          item,
          cost,
          hours
        });
        continue;
      }
    }

    // Strategy A1: Match with Colons / Hyphens and explicit hours
    // Example: - UI/UX Mockups & Design Phase: $120,000 - 80 hours
    const budgetMatch1 = line.match(/^\s*[-*•\d\.]*\s*([^:\-–—\n]+)[:\-–—]\s*[\$₹£€]?\s*([\d,]+(?:\.\d+)?)\s*[\-–—\s,]+\s*([\d,]+(?:\.\d+)?)\s*(?:hours|hrs|hour|hr)/i);
    if (budgetMatch1 && !lowerLine.includes('milestone')) {
      const item = budgetMatch1[1].trim();
      const cost = parseFloat(budgetMatch1[2].replace(/,/g, ''));
      const hours = parseFloat(budgetMatch1[3].replace(/,/g, ''));
      if (item && !isNaN(hours) && !isNaN(cost)) {
        budgetTable.push({
          key: budgetKey++,
          item,
          cost,
          hours
        });
        continue;
      }
    }

    // Strategy A2: Match with Colons / Hyphens and explicit hours swapped
    const budgetMatch2 = line.match(/^\s*[-*•\d\.]*\s*([^:\-–—\n]+)[:\-–—]\s*([\d,]+(?:\.\d+)?)\s*(?:hours|hrs|hour|hr)\s*[\-–—\s,]+\s*[\$₹£€]?\s*([\d,]+(?:\.\d+)?)/i);
    if (budgetMatch2 && !lowerLine.includes('milestone')) {
      const item = budgetMatch2[1].trim();
      const hours = parseFloat(budgetMatch2[2].replace(/,/g, ''));
      const cost = parseFloat(budgetMatch2[3].replace(/,/g, ''));
      if (item && !isNaN(hours) && !isNaN(cost)) {
        budgetTable.push({
          key: budgetKey++,
          item,
          cost,
          hours
        });
        continue;
      }
    }

    // Match milestone lines
    // Strategy M1: Split on spaces around dash
    // Example: - Milestone 1: UX Sign-off - Jan 15, 2026 - $50,000 - Complete mockup designs
    if (lowerLine.includes('milestone')) {
      const cleanLine = line.replace(/^\s*[-*•]\s*/, '').trim();
      const parts = cleanLine.split(/\s+[-–—]\s+/);
      if (parts.length >= 3) {
        const title = parts[0].trim();
        const dateStr = parts[1].trim();
        const amountStr = parts[2].trim().replace(/[\$₹£€,]/g, '');
        const amount = parseFloat(amountStr) || 0;
        const description = parts[3] ? parts[3].trim() : title;

        let parsedDate: string | null = null;
        try {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            parsedDate = d.toISOString();
          }
        } catch {
          // ignore
        }

        milestones.push({
          key: milestoneKey++,
          title,
          date: parsedDate,
          amount,
          description
        });
        continue;
      }

      // Strategy M2: Match milestone name, date, and amount without hyphens
      // Example: Milestone 1 UX Sign-off Jan 15, 2026 $50,000
      const milestoneMatch = cleanLine.match(/^(milestone\s*\d+[^:\-–—\n]*)\s+([A-Za-z]{3}\s+\d{1,2},\s*\d{4})\s+[\$₹£€]?\s*([\d,]+)(?:\s+(.+))?/i);
      if (milestoneMatch) {
        const title = milestoneMatch[1].trim();
        const dateStr = milestoneMatch[2].trim();
        const amount = parseFloat(milestoneMatch[3].replace(/,/g, '')) || 0;
        const description = milestoneMatch[4] ? milestoneMatch[4].trim() : title;

        let parsedDate: string | null = null;
        try {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            parsedDate = d.toISOString();
          }
        } catch {
          // ignore
        }

        milestones.push({
          key: milestoneKey++,
          title,
          date: parsedDate,
          amount,
          description
        });
      }
    }
  }

  // Calculate totals and fallbacks
  let totalHours = budgetTable.reduce((sum, item) => sum + (item.hours || 0), 0);
  let totalBudget = budgetTable.reduce((sum, item) => sum + (item.cost || 0), 0);

  if (budgetTable.length === 0) {
    budgetTable.push(...getFallbackBudget());
    totalHours = budgetTable.reduce((sum, item) => sum + (item.hours || 0), 0);
    totalBudget = budgetTable.reduce((sum, item) => sum + (item.cost || 0), 0);
  }

  if (milestones.length === 0) {
    milestones.push(...getFallbackMilestones());
  }

  const bufferHours = Math.round(totalHours * 0.15);

  let estimatedCompletionDate = "2026-09-15T00:00:00.000Z";
  const validMilestoneDates = milestones.map(m => m.date).filter(Boolean);
  if (validMilestoneDates.length > 0) {
    const maxDate = new Date(Math.max(...validMilestoneDates.map((d: any) => new Date(d).getTime())));
    estimatedCompletionDate = maxDate.toISOString();
  }

  return {
    budgetTable,
    milestones,
    totalHours,
    bufferHours,
    estimatedCompletionDate
  };
}
