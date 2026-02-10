import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Credentials({
            name: "Mission Control Access",
            credentials: {
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                if (credentials?.password === process.env.ADMIN_PASSWORD) {
                    // Return a mock user
                    return { id: "1", name: "Boss", email: "boss@missioncontrol.local" }
                }
                return null
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    session: {
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        authorized: async ({ auth }) => {
            // Logged in users are authenticated, otherwise redirect to login
            return !!auth
        },
    },
    trustHost: true,
})
