import { db } from '../../db/index.js';
import { ticketTemplates } from '../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';

export class TicketTemplateService {
  static async createTemplate(tenantId: number, templateName: string, department: string | null, projectName: string | null, tickets: any) {
    const [template] = await db.insert(ticketTemplates).values({
      tenantId,
      templateName,
      department,
      projectName,
      tickets
    }).returning();
    return template;
  }

  static async getTemplates(tenantId: number) {
    return await db.select()
      .from(ticketTemplates)
      .where(eq(ticketTemplates.tenantId, tenantId))
      .orderBy(ticketTemplates.createdAt);
  }

  static async deleteTemplate(tenantId: number, templateId: number) {
    await db.delete(ticketTemplates)
      .where(and(eq(ticketTemplates.tenantId, tenantId), eq(ticketTemplates.templateId, templateId)));
    return true;
  }
}
