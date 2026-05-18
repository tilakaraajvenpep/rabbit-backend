import { db } from '../../db/index.js';
import { costAnalysis, costPhases, projects, auditLogs } from '../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';

export class CostService {
  static async upsertCostAnalysis({ tenantId, projectId, userId, data }: any) {
    const { phases, ...analysisData } = data;

    return await db.transaction(async (tx) => {
      // 1. Check if exists
      const existing = await tx.query.costAnalysis.findFirst({
        where: and(eq(costAnalysis.projectId, projectId), eq(costAnalysis.tenantId, tenantId)),
      });

      let analysisId: number;

      if (existing) {
        analysisId = existing.costAnalysisId;
        await tx.update(costAnalysis)
          .set({ 
            ...analysisData, 
            estimatedCompletionDate: analysisData.estimatedCompletionDate ? new Date(analysisData.estimatedCompletionDate) : undefined,
            updatedAt: new Date() 
          })
          .where(eq(costAnalysis.costAnalysisId, analysisId));
        
        // Delete old phases
        await tx.delete(costPhases).where(eq(costPhases.costAnalysisId, analysisId));
      } else {
        const [inserted] = await tx.insert(costAnalysis).values({
          ...analysisData,
          estimatedCompletionDate: analysisData.estimatedCompletionDate ? new Date(analysisData.estimatedCompletionDate) : undefined,
          projectId,
          tenantId,
        }).returning();
        analysisId = inserted.costAnalysisId;
      }

      // 2. Insert new phases
      await tx.insert(costPhases).values(
        phases.map((p: any) => ({
          ...p,
          costAnalysisId: analysisId,
          tenantId,
          budgetAllocation: String(p.budgetAllocation),
          estimatedHours: String(p.estimatedHours),
        }))
      );

      // 3. Update project budget and hours
      await tx.update(projects)
        .set({
          approvedBudget: String(analysisData.totalBudget),
          approvedHours: String(analysisData.totalEstimatedHours),
          updatedAt: new Date(),
        })
        .where(eq(projects.projectId, projectId));

      // 4. Audit Log
      await tx.insert(auditLogs).values({
        tenantId,
        userId,
        action: existing ? 'UPDATE_COST_ANALYSIS' : 'CREATE_COST_ANALYSIS',
        entityType: 'project',
        entityId: projectId,
        newData: data,
      });

      return { analysisId, ...data };
    });
  }

  static async getCostAnalysis(projectId: number, tenantId: number) {
    const analysis = await db.query.costAnalysis.findFirst({
      where: and(eq(costAnalysis.projectId, projectId), eq(costAnalysis.tenantId, tenantId)),
      with: {
        // This requires relational mapping in Drizzle, which I didn't set up yet.
        // I'll do manual fetch for now.
      }
    });

    if (!analysis) return null;

    const phases = await db.query.costPhases.findMany({
      where: and(eq(costPhases.costAnalysisId, analysis.costAnalysisId), eq(costPhases.tenantId, tenantId)),
    });

    return { ...analysis, phases };
  }
}
