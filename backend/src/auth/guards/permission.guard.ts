import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  UserGroup,
  GROUP_PERMISSIONS,
} from '../../common/enums/user-group.enum';

export interface PermissionMetadata {
  permission: keyof (typeof GROUP_PERMISSIONS)[UserGroup];
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  tenantId: string;
  userGroup: {
    groupType: UserGroup;
    customPermissions?: Partial<(typeof GROUP_PERMISSIONS)[UserGroup]>;
  };
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.get<PermissionMetadata>(
      'permission',
      context.getHandler(),
    );

    if (!requiredPermission) {
      return true; // No permission required
    }

    const request = context.switchToHttp().getRequest<Request>() as Request & {
      user: AuthenticatedUser;
    };

    const user = request.user;
    if (!user) throw new ForbiddenException('User not authenticated');

    const { userGroup } = user;
    const groupType = userGroup.groupType;
    const customPermissions = userGroup.customPermissions;

    // Check custom permissions first, then fall back to default group permissions
    const hasPermission =
      customPermissions?.[requiredPermission.permission] ??
      GROUP_PERMISSIONS[groupType][requiredPermission.permission];

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermission.permission}`,
      );
    }

    return true;
  }
}
