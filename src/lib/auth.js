import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma.js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  user: {
    additionalFields: {
      role:      { type: "string", defaultValue: "CUSTOMER" },
      firstName: { type: "string", required: false },
      lastName:  { type: "string", required: false },
      phone:     { type: "string", required: false },
      address:   { type: "string", required: false },
    },
  },

  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  trustedOrigins: [process.env.FRONTEND_URL || "http://localhost:5173"],
  secret: process.env.BETTER_AUTH_SECRET,

  advanced: {
    cookiePrefix: "m4rs",
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
});

