/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - CUSTOMER ADDRESS REPOSITORY
 * File: backend/user-service/src/repositories/customerAddress.repository.js
 * Description: Data access repository executing SQL Server stored procedures
 *              for customer address management.
 * ============================================================================
 */

const { executeProcedure, sql } = require('@rms/shared');

function formatAddress(row) {
  if (!row) return null;
  return {
    addressId: row.AddressId,
    userId: row.UserId,
    addressTitle: row.AddressTitle,
    recipientName: row.RecipientName,
    recipientPhone: row.RecipientPhone,
    addressLine1: row.AddressLine1,
    addressLine2: row.AddressLine2,
    landmark: row.Landmark,
    city: row.City,
    stateProvince: row.StateProvince,
    postalCode: row.PostalCode,
    latitude: row.Latitude ? Number(row.Latitude) : null,
    longitude: row.Longitude ? Number(row.Longitude) : null,
    isDefault: Boolean(row.IsDefault),
    createdAt: row.CreatedAt,
    updatedAt: row.UpdatedAt,
  };
}

/**
 * Creates customer address with atomic default address management.
 */
async function createAddress(data) {
  const {
    userId,
    addressTitle = 'Home',
    recipientName,
    recipientPhone,
    addressLine1,
    addressLine2 = null,
    landmark = null,
    city,
    stateProvince,
    postalCode,
    latitude = null,
    longitude = null,
    isDefault = false,
  } = data;

  const result = await executeProcedure(
    'dbo.usp_CustomerAddress_Create',
    {
      UserId: Number(userId),
      AddressTitle: addressTitle,
      RecipientName: recipientName,
      RecipientPhone: recipientPhone,
      AddressLine1: addressLine1,
      AddressLine2: addressLine2,
      Landmark: landmark,
      City: city,
      StateProvince: stateProvince,
      PostalCode: postalCode,
      Latitude: latitude !== null ? Number(latitude) : null,
      Longitude: longitude !== null ? Number(longitude) : null,
      IsDefault: isDefault ? 1 : 0,
    },
    {
      NewAddressId: sql.BigInt,
    }
  );

  const addressId = result.output.NewAddressId ? Number(result.output.NewAddressId) : null;
  return getAddressById(addressId, userId);
}

/**
 * Retrieves all active addresses for a customer ordered by default first.
 */
async function getAddressesByUserId(userId) {
  const result = await executeProcedure('dbo.usp_CustomerAddress_GetByUserId', {
    UserId: Number(userId),
  });

  return (result.recordset || []).map(formatAddress);
}

/**
 * Retrieves a specific address by ID.
 */
async function getAddressById(addressId, userId = null) {
  const result = await executeProcedure('dbo.usp_CustomerAddress_GetById', {
    AddressId: Number(addressId),
    UserId: userId ? Number(userId) : null,
  });

  const row = result.recordset[0];
  return formatAddress(row);
}

/**
 * Updates a customer address with atomic default address management.
 */
async function updateAddress(addressId, userId, data) {
  const {
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
    isDefault,
  } = data;

  await executeProcedure('dbo.usp_CustomerAddress_Update', {
    AddressId: Number(addressId),
    UserId: Number(userId),
    AddressTitle: addressTitle !== undefined ? addressTitle : null,
    RecipientName: recipientName !== undefined ? recipientName : null,
    RecipientPhone: recipientPhone !== undefined ? recipientPhone : null,
    AddressLine1: addressLine1 !== undefined ? addressLine1 : null,
    AddressLine2: addressLine2 !== undefined ? addressLine2 : null,
    Landmark: landmark !== undefined ? landmark : null,
    City: city !== undefined ? city : null,
    StateProvince: stateProvince !== undefined ? stateProvince : null,
    PostalCode: postalCode !== undefined ? postalCode : null,
    Latitude: latitude !== undefined && latitude !== null ? Number(latitude) : null,
    Longitude: longitude !== undefined && longitude !== null ? Number(longitude) : null,
    IsDefault: isDefault !== undefined ? (isDefault ? 1 : 0) : null,
  });

  return getAddressById(addressId, userId);
}

/**
 * Soft deletes a customer address.
 */
async function deleteAddress(addressId, userId) {
  const result = await executeProcedure('dbo.usp_CustomerAddress_Delete', {
    AddressId: Number(addressId),
    UserId: Number(userId),
  });

  return result.recordset?.[0]?.RowsDeleted > 0;
}

module.exports = {
  createAddress,
  getAddressesByUserId,
  getAddressById,
  updateAddress,
  deleteAddress,
};

