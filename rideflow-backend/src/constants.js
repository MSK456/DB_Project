/**
 * @file constants.js
 * @description Application-wide constants for RideFlow backend.
 *              Centralises roles, statuses, and DB name to avoid magic strings.
 */

export const DB_NAME = "RideFlowDB";

/** Enumerated user roles matching the MySQL ENUM in the User table. */
export const USER_ROLES = {
  ADMIN: "Admin",
  RIDER: "Rider",
  DRIVER: "Driver",
};

/** Enumerated account statuses matching the MySQL ENUM in the User table. */
export const ACCOUNT_STATUS = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  BANNED: "Banned",
};

/** Enumerated verification statuses for Driver and Vehicle tables. */
export const VERIFICATION_STATUS = {
  PENDING: "Pending",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};