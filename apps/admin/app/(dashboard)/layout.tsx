import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Providers } from "@/components/providers"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session) {
        redirect("/login")
    }

    if (session.user.role !== "ADMIN") {
        redirect("/login?error=unauthorized")
    }

    return (
        <Providers>
            <div className="flex h-screen overflow-hidden">
                <Sidebar />
                <div className="flex flex-1 flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
                        {children}
                    </main>
                </div>
            </div>
        </Providers>
    )
}
