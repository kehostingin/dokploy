import { api } from "@/utils/api";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

type OAuthStatus = "processing" | "success" | "error";

const OAuthCallbackPage = () => {
	const router = useRouter();
	const [status, setStatus] = useState<OAuthStatus>("processing");
	const [errorMessage, setErrorMessage] = useState<string>("");
	const [userInfo, setUserInfo] = useState<{
		email?: string;
		name?: string;
	}>({});

	const oauthCallback = api.oauth.callback.useMutation();

	useEffect(() => {
		const handleCallback = async () => {
			const { code, state, sessionId } = router.query;

			// Wait for router to be ready
			if (!router.isReady || !code || !state || !sessionId) {
				return;
			}

			try {
				const result = await oauthCallback.mutateAsync({
					code: code as string,
					state: state as string,
					sessionId: sessionId as string,
				});

				setUserInfo({
					email: result.userEmail,
					name: result.userName,
				});
				setStatus("success");

				// Notify parent window (if opened in popup)
				if (window.opener) {
					window.opener.postMessage(
						{
							type: "oauth-success",
							sessionId: sessionId as string,
							userEmail: result.userEmail,
							userName: result.userName,
						},
						window.location.origin,
					);

					// Close popup after a short delay
					setTimeout(() => {
						window.close();
					}, 2000);
				} else {
					// If not in popup, redirect back to destinations page
					setTimeout(() => {
						router.push("/dashboard/settings/destinations");
					}, 2000);
				}
			} catch (error) {
				console.error("OAuth callback error:", error);
				setStatus("error");
				setErrorMessage(
					error instanceof Error
						? error.message
						: "Failed to complete OAuth authorization",
				);

				// Notify parent window of error
				if (window.opener) {
					window.opener.postMessage(
						{
							type: "oauth-error",
							error:
								error instanceof Error
									? error.message
									: "Authorization failed",
						},
						window.location.origin,
					);
				}
			}
		};

		handleCallback();
	}, [router.isReady, router.query]);

	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<div className="flex flex-col items-center gap-4 p-8 max-w-md">
				{status === "processing" && (
					<>
						<Loader2 className="size-12 animate-spin text-primary" />
						<h1 className="text-2xl font-bold">Authorizing...</h1>
						<p className="text-center text-muted-foreground">
							Please wait while we complete the authorization process.
						</p>
					</>
				)}

				{status === "success" && (
					<>
						<CheckCircle2 className="size-12 text-green-500" />
						<h1 className="text-2xl font-bold">Authorization Successful!</h1>
						<p className="text-center text-muted-foreground">
							{userInfo.name && (
								<>
									Authorized as <strong>{userInfo.name}</strong>
								</>
							)}
							{userInfo.email && !userInfo.name && (
								<>
									Authorized as <strong>{userInfo.email}</strong>
								</>
							)}
						</p>
						<p className="text-sm text-muted-foreground">
							{window.opener
								? "This window will close automatically..."
								: "Redirecting back to destinations..."}
						</p>
					</>
				)}

				{status === "error" && (
					<>
						<XCircle className="size-12 text-destructive" />
						<h1 className="text-2xl font-bold">Authorization Failed</h1>
						<p className="text-center text-muted-foreground">{errorMessage}</p>
						{!window.opener && (
							<button
								type="button"
								onClick={() => router.push("/dashboard/settings/destinations")}
								className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
							>
								Return to Destinations
							</button>
						)}
					</>
				)}
			</div>
		</div>
	);
};

export default OAuthCallbackPage;
