/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CONTACT MESSAGES REPOSITORY
 * File: backend/cms-service/src/repositories/contactMessage.repository.js
 * Description: 100% Parameterized Stored Procedure execution for Contact Inquiries.
 *              STRICT BOUNDARY: Writes ONLY to dbo.ContactMessages.
 * ============================================================================
 */

const { executeProcedure, sql } = require('@rms/shared');

class ContactMessageRepository {
  async submitContactMessage(data) {
    const result = await executeProcedure(
      'dbo.usp_CMS_SubmitContactMessage',
      {
        BranchId: { type: sql.Int, value: data.branchId || null },
        SenderName: { type: sql.NVarChar(100), value: data.senderName },
        SenderEmail: { type: sql.NVarChar(120), value: data.senderEmail },
        SenderPhone: { type: sql.NVarChar(25), value: data.senderPhone || null },
        Subject: { type: sql.NVarChar(150), value: data.subject },
        InquiryType: { type: sql.NVarChar(50), value: data.inquiryType || 'GENERAL' },
        MessageBody: { type: sql.NVarChar(2000), value: data.messageBody },
      },
      {
        NewMessageId: sql.BigInt,
      }
    );

    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }

  async listContactMessages({ branchId = null, status = null, inquiryType = null, page = 1, limit = 20 }) {
    const result = await executeProcedure('dbo.usp_CMS_ListContactMessages', {
      BranchId: { type: sql.Int, value: branchId || null },
      Status: { type: sql.NVarChar(30), value: status || null },
      InquiryType: { type: sql.NVarChar(50), value: inquiryType || null },
      Page: { type: sql.Int, value: page },
      Limit: { type: sql.Int, value: limit },
    });

    const totalCount = result.recordsets[0] && result.recordsets[0][0] ? result.recordsets[0][0].TotalCount : 0;
    const messages = result.recordsets[1] || [];

    return {
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      messages,
    };
  }

  async getContactMessageById(messageId) {
    const result = await executeProcedure('dbo.usp_CMS_GetContactMessageById', {
      MessageId: { type: sql.BigInt, value: messageId },
    });
    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }

  async replyContactMessage({ messageId, adminReplyNotes, repliedByUserId }) {
    const result = await executeProcedure('dbo.usp_CMS_ReplyContactMessage', {
      MessageId: { type: sql.BigInt, value: messageId },
      AdminReplyNotes: { type: sql.NVarChar(1000), value: adminReplyNotes },
      RepliedByUserId: { type: sql.BigInt, value: repliedByUserId },
    });
    return result.recordset && result.recordset[0] ? result.recordset[0] : null;
  }
}

module.exports = new ContactMessageRepository();

