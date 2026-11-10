/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/services/customerService.js
 * ============================================================================
 */

const { User, CustomerAddress, sequelize } = require('../models');
const { recordAudit } = require('./auditService');

const USER_SAFE_ATTRIBUTES = [
  'userId',
  'branchId',
  'firstName',
  'lastName',
  'email',
  'phoneNumber',
  'userType',
  'avatarUrl',
  'isActive',
  'isEmailVerified',
  'isPhoneVerified',
  'lastLoginAt',
  'createdAt',
  'updatedAt',
];

async function getProfile(userId) {
  const user = await User.findOne({
    where: { userId, isDeleted: false },
    attributes: USER_SAFE_ATTRIBUTES,
    include: [
      {
        model: CustomerAddress,
        as: 'addresses',
        where: { isDeleted: false },
        required: false,
      },
    ],
  });

  if (!user) {
    const error = new Error('Customer profile not found.');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  return user;
}

async function updateProfile(userId, updateData, metadata = {}) {
  const user = await User.findOne({ where: { userId, isDeleted: false } });
  if (!user) {
    const error = new Error('Customer profile not found.');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  const allowedFields = ['firstName', 'lastName', 'avatarUrl', 'phoneNumber'];
  const oldValues = {};
  const newValues = {};

  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      oldValues[field] = user[field];
      user[field] = updateData[field];
      newValues[field] = updateData[field];
    }
  });

  await user.save();

  await recordAudit({
    branchId: user.branchId,
    userId,
    entityName: 'Users',
    entityId: userId,
    actionType: 'UPDATE_PROFILE',
    actionDescription: `Customer updated profile fields: ${Object.keys(newValues).join(', ')}`,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    oldValues,
    newValues,
  });

  return getProfile(userId);
}

// ----------------------------------------------------------------------
// CUSTOMER ADDRESS CRUD
// ----------------------------------------------------------------------

async function getAddresses(userId) {
  return CustomerAddress.findAll({
    where: { userId, isDeleted: false },
    order: [
      ['IsDefault', 'DESC'],
      ['CreatedAt', 'DESC'],
    ],
  });
}

async function createAddress(userId, addressData, metadata = {}) {
  const {
    addressTitle = 'Home',
    recipientName,
    recipientPhone,
    addressLine1,
    addressLine2,
    landmark,
    city,
    stateProvince,
    postalCode,
    latitude,
    longitude,
    isDefault = false,
  } = addressData;

  const t = await sequelize.transaction();
  try {
    // If this address is set as default, unset any existing default address
    if (isDefault) {
      await CustomerAddress.update(
        { isDefault: false },
        { where: { userId, isDeleted: false }, transaction: t }
      );
    } else {
      // If user has no existing addresses, make the first one default automatically
      const existingCount = await CustomerAddress.count({
        where: { userId, isDeleted: false },
        transaction: t,
      });
      if (existingCount === 0) {
        addressData.isDefault = true;
      }
    }

    const created = await CustomerAddress.create(
      {
        userId,
        addressTitle,
        recipientName,
        recipientPhone,
        addressLine1,
        addressLine2,
        landmark,
        city,
        stateProvince,
        postalCode,
        latitude,
        longitude,
        isDefault: addressData.isDefault !== undefined ? addressData.isDefault : isDefault,
      },
      { transaction: t }
    );

    await recordAudit({
      userId,
      entityName: 'CustomerAddresses',
      entityId: created.addressId,
      actionType: 'CREATE_ADDRESS',
      actionDescription: `Created address '${addressTitle}' for user ${userId}`,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      newValues: created.toJSON(),
      transaction: t,
    });

    await t.commit();
    return created;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function updateAddress(userId, addressId, updateData, metadata = {}) {
  const address = await CustomerAddress.findOne({
    where: { addressId, userId, isDeleted: false },
  });

  if (!address) {
    const error = new Error('Address not found or does not belong to this user.');
    error.statusCode = 404;
    error.code = 'ADDRESS_NOT_FOUND';
    throw error;
  }

  const t = await sequelize.transaction();
  try {
    if (updateData.isDefault === true && !address.isDefault) {
      await CustomerAddress.update(
        { isDefault: false },
        { where: { userId, isDeleted: false }, transaction: t }
      );
    }

    const oldValues = address.toJSON();
    Object.assign(address, updateData);
    await address.save({ transaction: t });

    await recordAudit({
      userId,
      entityName: 'CustomerAddresses',
      entityId: addressId,
      actionType: 'UPDATE_ADDRESS',
      actionDescription: `Updated address ${addressId}`,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      oldValues,
      newValues: updateData,
      transaction: t,
    });

    await t.commit();
    return address;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function deleteAddress(userId, addressId, metadata = {}) {
  const address = await CustomerAddress.findOne({
    where: { addressId, userId, isDeleted: false },
  });

  if (!address) {
    const error = new Error('Address not found or does not belong to this user.');
    error.statusCode = 404;
    error.code = 'ADDRESS_NOT_FOUND';
    throw error;
  }

  address.isDeleted = true;
  address.deletedAt = new Date();
  await address.save();

  await recordAudit({
    userId,
    entityName: 'CustomerAddresses',
    entityId: addressId,
    actionType: 'DELETE_ADDRESS',
    actionDescription: `Soft-deleted address ${addressId}`,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
  });

  return { message: 'Address deleted successfully.' };
}

async function setDefaultAddress(userId, addressId, metadata = {}) {
  const address = await CustomerAddress.findOne({
    where: { addressId, userId, isDeleted: false },
  });

  if (!address) {
    const error = new Error('Address not found.');
    error.statusCode = 404;
    error.code = 'ADDRESS_NOT_FOUND';
    throw error;
  }

  const t = await sequelize.transaction();
  try {
    await CustomerAddress.update(
      { isDefault: false },
      { where: { userId, isDeleted: false }, transaction: t }
    );

    address.isDefault = true;
    await address.save({ transaction: t });

    await recordAudit({
      userId,
      entityName: 'CustomerAddresses',
      entityId: addressId,
      actionType: 'SET_DEFAULT_ADDRESS',
      actionDescription: `Set address ${addressId} as default`,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      transaction: t,
    });

    await t.commit();
    return address;
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
