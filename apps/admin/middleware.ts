import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const publicRoutes = ["/login", "/register", "/api/auth", "/api/register"]

export default auth((req) => {
    const { pathname } = req.nextUrl
    const isPublicRoute = publicRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
    )

    if (isPublicRoute) {
        return NextResponse.next()
    }

    if (!req.auth) {
        const loginUrl = new URL("/login", req.url)
        loginUrl.searchParams.set("callbackUrl", pathname)
        return NextResponse.redirect(loginUrl)
    }

    if (req.auth.user.status === "BLOCKED") {
        return NextResponse.redirect(new URL("/login?error=blocked", req.url))
    }

    if (req.auth.user.status === "SUSPENDED") {
        return NextResponse.redirect(new URL("/login?error=suspended", req.url))
    }

    if (pathname.startsWith("/api/") && pathname !== "/api/auth") {
        return NextResponse.next()
    }

    if (req.auth.user.role !== "ADMIN") {
        return NextResponse.redirect(
            new URL("/login?error=unauthorized", req.url)
        )
    }

    return NextResponse.next()
})

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
