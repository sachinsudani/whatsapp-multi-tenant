export enum UserGroup {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export interface GroupPermissions {
  canCreateUsers: boolean;
  canDeleteUsers: boolean;
  canManageGroups: boolean;
  canLinkDevices: boolean;
  canSendMessages: boolean;
  canViewLogs: boolean;
}

export const GROUP_PERMISSIONS: Record<UserGroup, GroupPermissions> = {
  [UserGroup.ADMIN]: {
    canCreateUsers: true,
    canDeleteUsers: true,
    canManageGroups: true,
    canLinkDevices: true,
    canSendMessages: true,
    canViewLogs: true,
  },
  [UserGroup.EDITOR]: {
    canCreateUsers: false,
    canDeleteUsers: false,
    canManageGroups: false,
    canLinkDevices: true,
    canSendMessages: true,
    canViewLogs: true,
  },
  [UserGroup.VIEWER]: {
    canCreateUsers: false,
    canDeleteUsers: false,
    canManageGroups: false,
    canLinkDevices: false,
    canSendMessages: false,
    canViewLogs: true,
  },
};
