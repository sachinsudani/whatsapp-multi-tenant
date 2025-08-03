import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tenant, TenantDocument } from '../../database/schemas/tenant.schema';

@Injectable()
export class TenantIdService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  async generateTenantId(): Promise<string> {
    // First, try to find an existing active tenant
    const existingTenant = await this.tenantModel
      .findOne({ isActive: true, isDeleted: false })
      .exec();

    if (existingTenant) {
      return existingTenant._id.toString();
    }

    // If no active tenant exists, create a default tenant
    const defaultTenant = new this.tenantModel({
      name: 'Default Tenant',
      description: 'Default tenant for the application',
      isActive: true,
      settings: {},
      isDeleted: false,
    });

    const savedTenant = await defaultTenant.save();
    return savedTenant._id.toString();
  }

  async getTenantById(tenantId: string): Promise<TenantDocument | null> {
    return this.tenantModel
      .findOne({
        _id: new Types.ObjectId(tenantId),
        isActive: true,
        isDeleted: false,
      })
      .exec();
  }

  async validateTenantId(tenantId: string): Promise<boolean> {
    const tenant = await this.getTenantById(tenantId);
    return tenant !== null;
  }
}
