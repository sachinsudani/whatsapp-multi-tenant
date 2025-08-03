import { SetMetadata } from '@nestjs/common';
import {
  UserGroup,
  GROUP_PERMISSIONS,
} from '../../common/enums/user-group.enum';

export const PERMISSION_KEY = 'permission';

export type PermissionType = keyof (typeof GROUP_PERMISSIONS)[UserGroup];

export const RequirePermission = (permission: PermissionType) =>
  SetMetadata(PERMISSION_KEY, { permission });
