import { Request, Response, NextFunction } from 'express';
import { CostService } from './cost.service.js';
import { success, error } from '../../utils/response.js';
import { costAnalysisSchema } from './cost.schema.js';

export const upsertCostAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const projectId = parseInt(req.params.id);
    const data = costAnalysisSchema.parse(req.body);

    const result = await CostService.upsertCostAnalysis({
      tenantId: user.tenantId,
      projectId,
      userId: user.userId,
      data
    });

    return success(res, result, 'Cost analysis saved');
  } catch (err) {
    next(err);
  }
};

export const getCostAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const projectId = parseInt(req.params.id);
    const result = await CostService.getCostAnalysis(projectId, user.tenantId);
    
    if (!result) return error(res, 'Cost analysis not found', 404);
    
    return success(res, result);
  } catch (err) {
    next(err);
  }
};
