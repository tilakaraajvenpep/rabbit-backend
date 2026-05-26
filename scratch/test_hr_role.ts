import { checkRole } from '../src/middleware/role.middleware.js';

const mockReq = {
  user: {
    userId: 1,
    tenantId: 2,
    role: 'HR'
  }
} as any;

const mockRes = {
  status: (code: number) => {
    console.log('Status set to:', code);
    return {
      json: (data: any) => {
        console.log('JSON returned:', data);
      }
    };
  }
} as any;

const mockNext = () => {
  console.log('Next called successfully!');
};

console.log('Testing HR role with checkRole...');
const middleware = checkRole(['TeamLead', 'ProjectManager', 'TenantAdmin', 'Accounts', 'HR']);
middleware(mockReq, mockRes, mockNext);
