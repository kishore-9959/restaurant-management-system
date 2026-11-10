/**
 * ============================================================================
 * RESTAURANT MANAGEMENT SYSTEM (RMS) - USER SERVICE
 * File: backend/user-service/src/models/CustomerAddress.js
 * Table: dbo.CustomerAddresses
 * ============================================================================
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CustomerAddress = sequelize.define('CustomerAddress', {
    addressId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      field: 'AddressId',
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'UserId',
    },
    addressTitle: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Home',
      field: 'AddressTitle',
    },
    recipientName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'RecipientName',
    },
    recipientPhone: {
      type: DataTypes.STRING(25),
      allowNull: false,
      field: 'RecipientPhone',
    },
    addressLine1: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'AddressLine1',
    },
    addressLine2: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: 'AddressLine2',
    },
    landmark: {
      type: DataTypes.STRING(120),
      allowNull: true,
      field: 'Landmark',
    },
    city: {
      type: DataTypes.STRING(80),
      allowNull: false,
      field: 'City',
    },
    stateProvince: {
      type: DataTypes.STRING(80),
      allowNull: false,
      field: 'StateProvince',
    },
    postalCode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'PostalCode',
    },
    latitude: {
      type: DataTypes.DECIMAL(9, 6),
      allowNull: true,
      field: 'Latitude',
    },
    longitude: {
      type: DataTypes.DECIMAL(9, 6),
      allowNull: true,
      field: 'Longitude',
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'IsDefault',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'CreatedAt',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'UpdatedAt',
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'IsDeleted',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'DeletedAt',
    },
  }, {
    tableName: 'CustomerAddresses',
    schema: 'dbo',
    timestamps: false,
    freezeTableName: true,
  });

  return CustomerAddress;
};
