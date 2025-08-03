import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contact } from '../database/schemas/contact.schema';
import { Message } from '../database/schemas/message.schema';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactResponseDto } from './dto/contact-response.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectModel(Contact.name) private contactModel: Model<Contact>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
  ) {}

  async createContact(
    createContactDto: CreateContactDto,
    tenantId: string,
    userId: string,
  ): Promise<ContactResponseDto> {
    // Check if contact already exists in the tenant
    const existingContact = await this.contactModel
      .findOne({
        phoneNumber: createContactDto.phoneNumber,
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();

    if (existingContact) {
      throw new BadRequestException(
        'Contact with this phone number already exists',
      );
    }

    // Create new contact
    const newContact = new this.contactModel({
      ...createContactDto,
      tenantId: new Types.ObjectId(tenantId),
      createdBy: new Types.ObjectId(userId),
      messagesSent: 0,
      messagesReceived: 0,
      isDeleted: false,
    });

    const savedContact = await newContact.save();

    // Populate the createdBy field before returning
    const populatedContact = await this.contactModel
      .findOne({ _id: savedContact._id })
      .populate('createdBy', 'firstName lastName email')
      .exec();

    return this.mapToContactResponse(populatedContact);
  }

  async findAllContacts(tenantId: string): Promise<ContactResponseDto[]> {
    const contacts = await this.contactModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .populate('createdBy', 'firstName lastName email')
      .exec();

    return contacts.map((contact) => this.mapToContactResponse(contact));
  }

  async findContactById(
    contactId: string,
    tenantId: string,
  ): Promise<ContactResponseDto> {
    const contact = await this.contactModel
      .findOne({
        _id: new Types.ObjectId(contactId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .populate('createdBy', 'firstName lastName email')
      .exec();

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return this.mapToContactResponse(contact);
  }

  async updateContact(
    contactId: string,
    updateContactDto: Partial<CreateContactDto>,
    tenantId: string,
  ): Promise<ContactResponseDto> {
    const contact = await this.contactModel
      .findOne({
        _id: new Types.ObjectId(contactId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // If updating phone number, check for uniqueness
    if (
      updateContactDto.phoneNumber &&
      updateContactDto.phoneNumber !== contact.phoneNumber
    ) {
      const phoneExists = await this.contactModel
        .findOne({
          phoneNumber: updateContactDto.phoneNumber,
          tenantId: new Types.ObjectId(tenantId),
          _id: { $ne: new Types.ObjectId(contactId) },
          isDeleted: false,
        })
        .exec();

      if (phoneExists) {
        throw new BadRequestException('Phone number already exists');
      }
    }

    const updatedContact = await this.contactModel
      .findByIdAndUpdate(contactId, updateContactDto, {
        new: true,
        runValidators: true,
      })
      .populate('createdBy', 'firstName lastName email')
      .exec();

    return this.mapToContactResponse(updatedContact);
  }

  async deleteContact(
    contactId: string,
    tenantId: string,
  ): Promise<{ message: string }> {
    const contact = await this.contactModel
      .findOne({
        _id: new Types.ObjectId(contactId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Soft delete contact
    await this.contactModel
      .findByIdAndUpdate(contactId, { isDeleted: true })
      .exec();

    return { message: 'Contact deleted successfully' };
  }

  async getContactStats(
    contactId: string,
    tenantId: string,
  ): Promise<{
    totalMessages: number;
    sentMessages: number;
    receivedMessages: number;
    lastMessageAt?: Date;
    messageHistory: Array<{
      id: string;
      content: string;
      messageType: string;
      status: string;
      sentAt: Date;
      direction: 'sent' | 'received';
    }>;
  }> {
    const contact = await this.contactModel
      .findOne({
        _id: new Types.ObjectId(contactId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Get messages for this contact
    const messages = await this.messageModel
      .find({
        phoneNumber: contact.phoneNumber,
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .sort({ sentAt: -1 })
      .limit(50)
      .exec();

    const totalMessages = messages.length;
    const sentMessages = messages.filter(
      (msg) => msg.status !== 'failed',
    ).length;
    const receivedMessages = 0; // Incoming messages would be tracked separately
    const lastMessageAt =
      messages.length > 0 ? messages[0].timestamp : undefined;

    const messageHistory = messages.map((msg) => ({
      id: msg._id.toString(),
      content: msg.content,
      messageType: msg.type,
      status: msg.status,
      sentAt: msg.timestamp,
      direction: 'sent' as const,
    }));

    return {
      totalMessages,
      sentMessages,
      receivedMessages,
      lastMessageAt,
      messageHistory,
    };
  }

  private mapToContactResponse(contact: any): ContactResponseDto {
    return {
      id: contact._id.toString(),
      phoneNumber: contact.phoneNumber,
      firstName: contact.firstName,
      lastName: contact.lastName,
      fullName: `${contact.firstName} ${contact.lastName}`,
      email: contact.email,
      company: contact.company,
      jobTitle: contact.jobTitle,
      notes: contact.notes,
      tags: contact.tags || [],
      messagesSent: contact.messagesSent,
      messagesReceived: contact.messagesReceived,
      lastMessageAt: contact.lastMessageAt,
      tenantId: contact.tenantId.toString(),
      createdBy: contact.createdBy._id.toString(),
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    };
  }
}
