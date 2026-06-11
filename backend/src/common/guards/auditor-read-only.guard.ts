import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUDITOR_CAN_WRITE_KEY } from '../decorators/auditor.decorator';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Nazoratchi (auditor) faqat kuzatuvchi: GET'dan boshqa metodlar bloklanadi,
 * faqat @AuditorCanWrite() bilan ochiq qilingan endpointlar bundan mustasno
 * (task QA — checked/rejected). RolesGuard'dan keyin ishlaydi.
 */
@Injectable()
export class AuditorReadOnlyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user || user.role !== 'auditor') return true;
    if (READ_METHODS.has(req.method)) return true;

    const canWrite = this.reflector.getAllAndOverride<boolean>(AUDITOR_CAN_WRITE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (canWrite) return true;

    throw new ForbiddenException('Nazoratchi faqat kuzatuv (read-only) huquqiga ega');
  }
}
