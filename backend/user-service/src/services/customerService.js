/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/services/customerService.js
 * Description: Customer profile and address operations using stored procedures.
 * ============================================================================
 */

const userRepository = require('../repositories/user.repository');
const customerAddressRepository = require('../repositories/customerAddress.repository');
const { recordAudit } = require('./auditService');

async function getProfile(userId) {
  const user = await userRepository.getUserById(userId);
  if (!user) {
    const error = new Error('Customer profile not found.');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  const addresses = await customerAddressRepository.getAddressesByUserId(userId);
  return {
    ...user,
    addresses,
  };
}

async function updateProfile(userId, updateData, metadata = {}) {
  const user = await userRepository.getUserById(userId);
  if (!user) {
    const error = new Error('Customer profile not found.');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  const updatedUser = await userRepository.updateProfile(userId, {
    firstName: updateData.firstName || user.firstName,
    lastName: updateData.lastName !== undefined ? updateData.lastName : user.lastName,
    phoneNumber: updateData.phoneNumber !== undefined ? updateData.phoneNumber : user.phoneNumber,
    avatarUrl: updateData.avatarUrl !== undefined ? updateData.avatarUrl : user.avatarUrl,
  });

  await recordAudit({
    branchId: user.branchId,
    userId,
    entityName: 'Users',
    entityId: userId,
    actionType: 'UPDATE_PROFILE',
    actionDescription: `Customer updated profile`,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    oldValues: { firstName: user.firstName, lastName: user.lastName, phoneNumber: user.phoneNumber },
    newValues: { firstName: updatedUser.firstName, lastName: updatedUser.lastName, phoneNumber: updatedUser.phoneNumber },
  });

  return getProfile(userId);
}

// ----------------------------------------------------------------------
// CUSTOMER ADDRESS CRUD (Stored Procedure based)
// ----------------------------------------------------------------------

async function getAddresses(userId) {
  return customerAddressRepository.getAddressesByUserId(userId);
}

async function addAddress(userId, addressData, metadata = {}) {
  const address = await customerAddressRepository.createAddress({
    userId,
    addressTitle: addressData.addressTitle || 'Home',
    recipientName: addressData.recipientName,
    recipientPhone: addressData.recipientPhone,
    addressLine1: addressData.addressLine1,
    addressLine2: addressData.addressLine2 || null,
    landmark: addressData.landmark || null,
    city: addressData.city,
    stateProvince: addressData.stateProvince || addressData.state || 'Karnataka',
    postalCode: addressData.postalCode,
    latitude: addressData.latitude || null,
    longitude: addressData.longitude || null,
    isDefault: Boolean(addressData.isDefault),
  });

  await recordAudit({
    userId,
    entityName: 'CustomerAddresses',
    entityId: address.addressId,
    actionType: 'CREATE_ADDRESS',
    actionDescription: `Added customer address: ${address.addressLine1}`,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    newValues: address,
  });

  return address;
}

async function updateAddress(userId, addressId, addressData, metadata = {}) {
  const existing = await customerAddressRepository.getAddressById(addressId, userId);
  if (!existing) {
    const error = new Error('Address not found or does not belong to user.');
    error.statusCode = 404;
    error.code = 'ADDRESS_NOT_FOUND';
    throw error;
  }

  const updated = await customerAddressRepository.updateAddress(addressId, userId, {
    addressTitle: addressData.addressTitle,
    recipientName: addressData.recipientName,
    recipientPhone: addressData.recipientPhone,
    addressLine1: addressData.addressLine1,
    addressLine2: addressData.addressLine2,
    landmark: addressData.landmark,
    city: addressData.city,
    stateProvince: addressData.stateProvince || addressData.state,
    postalCode: addressData.postalCode,
    latitude: addressData.latitude,
    longitude: addressData.longitude,
    isDefault: addressData.isDefault,
  });

  await recordAudit({
    userId,
    entityName: 'CustomerAddresses',
    entityId: addressId,
    actionType: 'UPDATE_ADDRESS',
    actionDescription: `Updated customer address ${addressId}`,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    oldValues: existing,
    newValues: updated,
  });

  return updated;
}

async function deleteAddress(userId, addressId, metadata = {}) {
  const existing = await customerAddressRepository.getAddressById(addressId, userId);
  if (!existing) {
    const error = new Error('Address not found or does not belong to user.');
    error.statusCode = 404;
    error.code = 'ADDRESS_NOT_FOUND';
    throw error;
  }

  await customerAddressRepository.deleteAddress(addressId, userId);

  await recordAudit({
    userId,
    entityName: 'CustomerAddresses',
    entityId: addressId,
    actionType: 'DELETE_ADDRESS',
    actionDescription: `Deleted customer address ${addressId}`,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    oldValues: existing,
  });

  return { message: 'Address removed successfully.' };
}

module.exports = {
  getProfile,
  updateProfile,
  getAddresses,
  addAddress,
  createAddress: addAddress,
  updateAddress,
  deleteAddress,
};
