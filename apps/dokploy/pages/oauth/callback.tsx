import { api } from "@/utils/api";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

type OAuthStatus = "processing" | "success" | "error";

const OAuthCallbackPage = () => {
	const router = useRouter();
	const [status, setStatus] = useState<OAuthStatus>("processing");
	const [errorMessage, setErrorMessage] = useState<string>("");
	const [userInfo, setUserInfo] = useState<{
		email?: string;
		name?: string;
	}>({});
	const hasRun = useRef(false);

	const oauthCallback = api.oauth.callback.useMutation();

	useEffect(() => {
		const handleCallback = async () => {
			const { code, state, sessionId } = router.query;

			// Wait for router to be ready
			if (!router.isReady) {
				console.log("Router not ready yet");
				return;
			}

			// Check for required parameters
			if (!code || !state || !sessionId) {
				console.log("Missing query parameters:", { code: !!code, state: !!state, sessionId: !!sessionId });
				setStatus("error");
				setErrorMessage("Missing required OAuth parameters. Please try again.");
				return;
			}

			// Prevent running multiple times
			if (hasRun.current) {
				console.log("Callback already processed, skipping");
				return;
			}
			hasRun.current = true;

			console.log("Processing OAuth callback with sessionId:", sessionId);

			try {
				const result = await oauthCallback.mutateAsync({
					code: code as string,
					state: state as string,
					sessionId: sessionId as string,
				});

				console.log("OAuth callback successful:", result);

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
				console.error("Error details:", JSON.stringify(error, null, 2));
				setStatus("error");

				// Extract error message from tRPC error
				let message = "Failed to complete OAuth authorization";
				if (error && typeof error === "object") {
					const err = error as any;
					if (err.message) {
						message = err.message;
					} else if (err.data?.message) {
						message = err.data.message;
					} else if (err.shape?.message) {
						message = err.shape.message;
					}
				}

				setErrorMessage(message);

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
						{process.env.NODE_ENV === "development" && (
							<div className="mt-4 p-3 bg-muted rounded-md text-xs font-mono max-w-full overflow-auto">
								<div>Query params:</div>
								<div>code: {router.query.code ? "present" : "missing"}</div>
								<div>state: {router.query.state ? "present" : "missing"}</div>
								<div>sessionId: {router.query.sessionId as string || "missing"}</div>
							</div>
						)}
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
