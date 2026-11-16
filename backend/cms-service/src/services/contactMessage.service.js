/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CONTACT MESSAGE SERVICE
 * File: backend/cms-service/src/services/contactMessage.service.js
 * Description: Manages guest inquiries and coordinates real-time staff alerts.
 * ============================================================================
 */

const { contactMessageRepository } = require('../repositories');
const notificationClient = require('./notificationClient');
const { createServiceLogger } = require('@rms/shared');

const logger = createServiceLogger('cms-contact-service');

class ContactMessageService {
  async submitContactMessage(data, correlationId = null) {
    // 1. Persist guest inquiry strictly in dbo.ContactMessages via Stored Procedure
    const message = await contactMessageRepository.submitContactMessage(data);

    if (message && message.MessageId) {
      // 2. Dispatch real-time staff alert asynchronously to Notification Service via REST
      setImmediate(async () => {
        try {
          await notificationClient.notifyContactMessage({
            messageId: message.MessageId,
            senderName: message.SenderName,
            senderEmail: message.SenderEmail,
            subject: message.Subject,
            inquiryType: message.InquiryType,
            branchId: message.BranchId,
            correlationId,
          });
        } catch (notifErr) {
          logger.warn(`Background alert dispatch failed for message #${message.MessageId}: ${notifErr.message}`);
        }
      });
    }

    return message;
  }

  async listContactMessages(params) {
    return contactMessageRepository.listContactMessages(params);
  }

  async getContactMessageById(messageId) {
    return contactMessageRepository.getContactMessageById(messageId);
  }

  async replyContactMessage({ messageId, adminReplyNotes, repliedByUserId }) {
    return contactMessageRepository.replyContactMessage({
      messageId,
      adminReplyNotes,
      repliedByUserId,
    });
  }
}

module.exports = new ContactMessageService();

