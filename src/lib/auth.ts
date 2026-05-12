import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            authorization: { params: { scope: "read:user user:email repo" } }
          })
        ]
      : []),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.password) return null;
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;
        return {
          id: user.id,
          name: user.name ?? user.email,
          email: user.email,
          image: user.image ?? null
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // For GitHub provider, persist token + login on first auth.
      if (account?.provider === "github" && user.email) {
        const ghLogin = (profile as any)?.login as string | undefined;
        const accessToken = (account as any).access_token as string | undefined;
        await prisma.user.upsert({
          where: { email: user.email },
          create: {
            email: user.email,
            name: user.name ?? ghLogin ?? null,
            image: user.image ?? null,
            githubLogin: ghLogin ?? null,
            githubToken: accessToken ?? null
          },
          update: {
            name: user.name ?? undefined,
            image: user.image ?? undefined,
            githubLogin: ghLogin ?? undefined,
            githubToken: accessToken ?? undefined
          }
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        if (dbUser) {
          token.uid = dbUser.id;
          token.plan = dbUser.plan;
          token.githubLogin = dbUser.githubLogin ?? null;
        }
      } else if (token.email && !token.uid) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email as string } });
        if (dbUser) {
          token.uid = dbUser.id;
          token.plan = dbUser.plan;
          token.githubLogin = dbUser.githubLogin ?? null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid;
        (session.user as any).plan = token.plan ?? "FREE";
        (session.user as any).githubLogin = token.githubLogin ?? null;
      }
      return session;
    }
  }
};
