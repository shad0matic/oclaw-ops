import { signIn } from "@/auth"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Rocket } from "lucide-react"

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const params = await searchParams
    const error = params?.error

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
            <Card className="w-full max-w-sm border-border bg-card text-zinc-50">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-amber-500/50">
                        <Rocket className="h-6 w-6 text-amber-500" />
                    </div>
                    <CardTitle className="text-3xl" style={{ fontFamily: "'Pump Bold', sans-serif", color: '#FFD700' }}>Minions Control</CardTitle>
                    <CardDescription>Enter access code to proceed</CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        action={async (formData) => {
                            "use server"
                            try {
                                await signIn("credentials", {
                                    ...Object.fromEntries(formData),
                                    redirectTo: "/"
                                })
                            } catch (error) {
                                if (error instanceof AuthError) {
                                    redirect(`/login?error=invalid`)
                                }
                                throw error
                            }
                        }}
                        className="grid gap-4"
                    >
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                placeholder="••••••••"
                                className="border-border bg-background focus-visible:ring-amber-500"
                            />
                        </div>
                        {error && (
                            <p className="text-sm text-red-400 text-center">Wrong password. Try again.</p>
                        )}
                        <Button type="submit" className="w-full bg-amber-500 text-zinc-950 hover:bg-amber-400">
                            Enter Dashboard
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
