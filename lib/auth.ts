import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Username dan password harus diisi");
        }

        console.log("🔐 Login attempt for:", credentials.username);

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });

        if (!user) {
          console.log("❌ User not found");
          throw new Error("Username atau password salah");
        }

        console.log(
          "✅ User found:",
          user.username,
          "isActive:",
          user.isActive
        );

        if (!user.isActive) {
          console.log("❌ User not active");
          throw new Error("Akun Anda tidak aktif. Hubungi administrator");
        }

        console.log("🔑 Comparing password...");
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        console.log("🔑 Password valid:", isPasswordValid);

        if (!isPasswordValid) {
          console.log("❌ Invalid password");
          throw new Error("Username atau password salah");
        }

        console.log("✅ Login successful");

        // Log audit
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "LOGIN",
            entity: "auth",
            entityId: user.id,
          },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          username: user.username,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
