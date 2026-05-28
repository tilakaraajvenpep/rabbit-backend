import { Request, Response, NextFunction } from 'express';
import { ProjectService } from './project.service.js';
import { success, error } from '../../utils/response.js';
import { createProjectSchema, updateProjectStatusSchema } from './project.schema.js';

export const createProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = createProjectSchema.parse(req.body);
    
    const project = await ProjectService.createProject({
      tenantId: user.tenantId,
      userId: user.userId,
      data
    });
    
    return success(res, project, 'Project created', 201);
  } catch (err) {
    next(err);
  }
};

export const getProjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const projects = await ProjectService.getProjects({
      tenantId: user.tenantId,
      userId: user.userId,
      role: user.role
    });
    return success(res, projects);
  } catch (err) {
    next(err);
  }
};

export const getProjectById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const project = await ProjectService.getProjectById(id, user.tenantId);
    if (!project) return error(res, 'Project not found', 404);
    return success(res, project);
  } catch (err) {
    next(err);
  }
};

export const updateProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const data = createProjectSchema.parse(req.body);
    
    const project = await ProjectService.updateProject(id, user.tenantId, user.userId, data);
    return success(res, project, 'Project updated successfully');
  } catch (err) {
    next(err);
  }
};

export const updateProjectStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    const parsed = updateProjectStatusSchema.parse(req.body);
    
    const project = await ProjectService.updateProjectStatus(
      id,
      user.tenantId,
      user.userId,
      parsed.status,
      parsed.assignedTeamLeadId ?? undefined,
      parsed.note || parsed.comments || undefined,
      parsed.assignedProjectManagerId ?? undefined,
      parsed.totalHours,
      parsed.bufferHours,
      parsed.budgetTable,
      parsed.milestones,
      parsed.kanbanColumns,
      parsed.assignedEmployeeIds,
      parsed.employeeAllocatedHours
    );
    return success(res, project, 'Project status updated');
  } catch (err) {
    next(err);
  }
};

export const deleteProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    await ProjectService.deleteProject(id, user.tenantId, user.userId);
    return success(res, null, 'Project deleted');
  } catch (err) {
    next(err);
  }
};
