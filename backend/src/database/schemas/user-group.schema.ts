import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  UserGroup,
  GroupPermissions,
} from '../../common/enums/user-group.enum';

export type UserGroupDocument = UserGroupEntity & Document;

@Schema({ timestamps: true })
export class UserGroupEntity {
  @Prop({ required: true, index: true })
  name: string;

  @Prop({
    type: String,
    enum: UserGroup,
    default: UserGroup.VIEWER,
    index: true,
  })
  groupType: UserGroup;

  @Prop({ type: Object })
  customPermissions: Partial<GroupPermissions>;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const UserGroupSchema = SchemaFactory.createForClass(UserGroupEntity);
