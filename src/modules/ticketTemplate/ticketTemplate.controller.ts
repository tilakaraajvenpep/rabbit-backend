import { Request, Response, NextFunction } from 'express';
import { TicketTemplateService } from './ticketTemplate.service.js';
import { success } from '../../utils/response.js';

export const createTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const { templateName, department, projectName, tickets } = req.body;

    const template = await TicketTemplateService.createTemplate(
      user.tenantId,
      templateName,
      department || null,
      projectName || null,
      tickets
    );

    return success(res, template, 'Ticket template created', 201);
  } catch (err) {
    next(err);
  }
};

export const getTemplates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const templates = await TicketTemplateService.getTemplates(user.tenantId);
    return success(res, templates);
  } catch (err) {
    next(err);
  }
};

export const deleteTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const templateId = parseInt(req.params.id);
    await TicketTemplateService.deleteTemplate(user.tenantId, templateId);
    return success(res, null, 'Ticket template deleted');
  } catch (err) {
    next(err);
  }
};
