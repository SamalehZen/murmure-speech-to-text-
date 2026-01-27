import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@murmure/database"
import NextAuth, { type NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

declare module "next-auth" {
    interface User {
        role?: string
        status?: string
    }
    interface Session {
        user: {
            id: string
            email: string
            name?: string | null
            image?: string | null
            role: string
            status: string
        }
    }
}

declare module "@auth/core/jwt" {
    interface JWT {
        role?: string
        status?: string
    }
}

export const authConfig: NextAuthConfig = {
    adapter: PrismaAdapter(prisma),
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        GitHub({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        }),
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                })

                if (!user || !user.password) return null

                const isValid = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                )

                if (!isValid) return null

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    status: user.status,
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role
                token.status = user.status
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.sub!
                session.user.role = token.role as string
                session.user.status = token.status as string
            }
            return session
        },
        async signIn({ user }) {
            if (user.status === "BLOCKED" || user.status === "SUSPENDED") {
                return false
            }
            return true
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    session: {
        strategy: "jwt",
    },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
