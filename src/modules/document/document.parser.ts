export function parseScopeDocumentText(text: string, projectStartDate?: Date) {
  const lines = text.split('\n').map(l => l.trim().replace(/^[\-\*\•\s\:\.]+\s*/, '')).filter(l => l.length > 0);
  
  const budgetTable: any[] = [];
  const milestones: any[] = [];
  
  let currentSection: 'none' | 'budget' | 'milestones' = 'none';
  let projectStart = projectStartDate ? new Date(projectStartDate) : new Date();
  if (isNaN(projectStart.getTime())) {
    projectStart = new Date();
  }

  // Helper to extract amounts (e.g., $120,000 or 450000 or 80k)
  const extractAmount = (str: string): number | null => {
    // 1. Look for numbers with $ sign: $120,000 or $ 120000 or $50000
    const dollarRegex = /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+)/g;
    let match = dollarRegex.exec(str);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }

    // 2. Look for e.g. 80k
    const kRegex = /\b(\d+)\s*k\b/i;
    match = kRegex.exec(str);
    if (match) {
      return parseInt(match[1]) * 1000;
    }

    // 3. Look for plain numbers >= 1000, excluding common years
    const numberRegex = /\b(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\b\d{4,9}\b)/g;
    let m;
    while ((m = numberRegex.exec(str)) !== null) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      if (val >= 1000 && val !== 2024 && val !== 2025 && val !== 2026 && val !== 2027 && val !== 2028 && val !== 2029 && val !== 2030) {
        return val;
      }
    }
    return null;
  };

  // Helper to extract hours (e.g., 80 hours, 80h, 80 hrs)
  const extractHours = (str: string): number | null => {
    const hoursRegex = /\b(\d+)\s*(?:hours|hrs|h|hr)\b/i;
    const match = hoursRegex.exec(str);
    if (match) {
      return parseInt(match[1]);
    }
    return null;
  };

  // Helper to extract date
  const extractDate = (str: string, index: number): Date => {
    // Try to parse standard dates like Jan 15, 2026 or 15-Jan-2026 or 2026-05-25
    const dateRegexes = [
      /\b\d{4}-\d{2}-\d{2}\b/,
      /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/,
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:, \d{4})?\b/i,
      /\b\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?: \d{4})?\b/i
    ];

    for (const r of dateRegexes) {
      const match = r.exec(str);
      if (match) {
        const d = new Date(match[0]);
        if (!isNaN(d.getTime())) return d;
      }
    }

    // Default to projectStart + index * 15 days
    const d = new Date(projectStart);
    d.setDate(d.getDate() + (index + 1) * 15);
    return d;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Section detection
    if (lower.includes('budget') || lower.includes('cost analysis') || lower.includes('pricing') || lower.includes('itemized cost')) {
      const isHeader = !line.match(/\b\d+\b/);
      if (isHeader) {
        currentSection = 'budget';
        continue;
      }
    }
    if (lower.includes('milestone') || lower.includes('payment schedule') || lower.includes('deliverable')) {
      const isHeader = !line.match(/(?:milestone|deliverable|m)\s*\d+/i);
      if (isHeader) {
        currentSection = 'milestones';
        continue;
      }
    }

    // Parse line based on current section or general patterns
    // 1. Milestone detection (any section)
    const milestoneMatch = line.match(/(?:milestone|deliverable|m)\s*(\d+)/i) || 
                           (currentSection === 'milestones' && line.match(/^(\d+)\.\s+/));
                           
    if (milestoneMatch) {
      // It's a milestone!
      const milestoneNum = parseInt(milestoneMatch[1]);
      
      // Clean up title
      let title = line
        .replace(/(?:milestone|deliverable|m)\s*\d+[:\-]?/i, '')
        .replace(/^\d+\.\s+/, '')
        .trim();
        
      const amount = extractAmount(line) || 0;
      const date = extractDate(line, milestones.length);
      
      // Extract description (could be the remaining text or the next line)
      let description = title;
      if (description.includes(' - ')) {
        const parts = description.split(' - ');
        title = parts[0].trim();
        description = parts.slice(1).join(' - ').trim();
      }

      // Avoid duplicates
      if (!milestones.some(m => m.title === title || m.key === milestoneNum)) {
        milestones.push({
          key: milestoneNum || milestones.length + 1,
          title: title || `Milestone ${milestoneNum}`,
          amount,
          date: date.toISOString(),
          description: description || `Completion of milestone ${milestoneNum}`
        });
      }
      continue;
    }

    // 2. Budget item detection (any section)
    const cost = extractAmount(line);
    const hours = extractHours(line);
    
    if (cost !== null || hours !== null) {
      // It might be a budget item!
      // Let's filter out lines that are headers, milestones, or too short
      if (!lower.includes('total') && !lower.includes('milestone') && line.length > 10) {
        // Clean item name
        let item = line
          .replace(/(?:\$\s*)?(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\b\d{4,9}\b)/g, '') // remove cost
          .replace(/\b\d+\s*(?:hours|hrs|h|hr)\b/i, '') // remove hours
          .replace(/[:\-,\(\)]/g, '') // remove delimiters
          .trim();
          
        if (item.length > 5) {
          budgetTable.push({
            key: budgetTable.length + 1,
            item,
            cost: cost || 0,
            hours: hours || 0
          });
        }
      }
    }
  }

  // If no milestones were detected, let's try a broader heuristic:
  // Find any lines in the document that have a number starting the line, and look for cost/date
  if (milestones.length === 0) {
    let milestoneCount = 0;
    for (const line of lines) {
      const numMatch = line.match(/^(\d+)[\.\)]\s+(.+)$/);
      if (numMatch && line.length > 15) {
        const title = numMatch[2].split('-')[0].trim();
        const amount = extractAmount(line) || 0;
        const date = extractDate(line, milestoneCount);
        milestones.push({
          key: ++milestoneCount,
          title,
          amount,
          date: date.toISOString(),
          description: line
        });
      }
    }
  }

  // Calculate totals
  const totalHours = budgetTable.reduce((sum, item) => sum + item.hours, 0);
  const bufferHours = Math.round(totalHours * 0.15); // default 15% buffer
  
  // Find latest milestone date
  let estimatedCompletionDate = new Date(projectStart);
  estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + 90); // Default 90 days
  
  if (milestones.length > 0) {
    const dates = milestones.map(m => new Date(m.date).getTime());
    const maxDate = Math.max(...dates);
    if (!isNaN(maxDate)) {
      estimatedCompletionDate = new Date(maxDate);
    }
  }

  return {
    budgetTable,
    milestones,
    totalHours,
    bufferHours,
    estimatedCompletionDate: estimatedCompletionDate.toISOString()
  };
}
