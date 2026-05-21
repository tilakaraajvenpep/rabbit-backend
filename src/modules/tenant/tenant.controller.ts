import { Request, Response, NextFunction } from 'express';
import { TenantService } from './tenant.service.js';
import { success } from '../../utils/response.js';
import { createTenantSchema, updateTenantSchema, updateStatusSchema } from './tenant.schema.js';

export const resolve = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantCode = req.query.tenantCode as string;
    if (!tenantCode) throw new Error('tenantCode is required');
    const tenant = await TenantService.resolveTenant(tenantCode);
    return success(res, tenant);
  } catch (err) {
    next(err);
  }
};

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenants = await TenantService.listTenants();
    return success(res, tenants);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const tenant = await TenantService.getTenantById(id);
    if (!tenant) throw new Error('Tenant not found');
    return success(res, tenant);
  } catch (err: any) {
    if (err.message === 'Tenant not found') err.status = 404;
    next(err);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createTenantSchema.parse(req.body);
    const tenant = await TenantService.createTenant(data);
    return success(res, tenant, 'Tenant created', 201);
  } catch (err) {
    next(err);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const data = updateTenantSchema.parse(req.body);
    const tenant = await TenantService.updateTenant(id, data);
    return success(res, tenant, 'Tenant updated');
  } catch (err) {
    next(err);
  }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { isActive } = updateStatusSchema.parse(req.body);
    const tenant = await TenantService.updateStatus(id, isActive);
    return success(res, tenant, 'Tenant status updated');
  } catch (err) {
    next(err);
  }
};

export const getMy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const data = await TenantService.getTenantWithStats(user.tenantId);
    return success(res, data);
  } catch (err) {
    next(err);
  }
};
