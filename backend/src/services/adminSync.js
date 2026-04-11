import bcrypt from "bcryptjs";
import { Admin } from "../models/Admin.js";

function getEnvAdminCredentials() {
  const adminId = (
    process.env.ADMIN_ID ||
    process.env.ADMIN_EMAIL ||
    ""
  ).trim();
  // support alternate name ADMIN_PASS for backwards compatibility
  const adminPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS;
  if (!adminId || !adminPassword) {
    throw new Error(
      "ADMIN_ID (or ADMIN_EMAIL) and ADMIN_PASSWORD (or ADMIN_PASS) are required in .env",
    );
  }
  return { adminId, adminPassword };
}

export async function syncAdminFromEnv() {
  const { adminId, adminPassword } = getEnvAdminCredentials();
  const existingAdmin = await Admin.findOne({});

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await Admin.create({ adminId, passwordHash });
    return { action: "created" };
  }

  const isPasswordSame = await bcrypt.compare(
    adminPassword,
    existingAdmin.passwordHash,
  );
  const isIdSame = existingAdmin.adminId === adminId;
  if (isIdSame && isPasswordSame) {
    return { action: "unchanged" };
  }

  existingAdmin.adminId = adminId;
  existingAdmin.passwordHash = await bcrypt.hash(adminPassword, 10);
  await existingAdmin.save();
  return { action: "updated" };
}
