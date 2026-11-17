interface GoogleOAuth {
  initCodeClient(options: {
    client_id: string;
    scope: string;
    ux_mode: "popup";
    include_granted_scopes: boolean;
    callback: (response: { code?: string; error?: string }) => void;
    error_callback: (error: { type: string }) => void;
  }): { requestCode(): void };
}

export type GoogleAuthPopup = () => Promise<string | null>;

let library: Promise<GoogleOAuth> | undefined;

function loadGoogleOAuth(): Promise<GoogleOAuth> {
  library ??= new Promise<GoogleOAuth>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    const fail = () => {
      clearTimeout(timeout);
      script.remove();
      reject(new Error("Google Identity Services could not load"));
    };
    const timeout = window.setTimeout(fail, 10000);
    script.addEventListener("error", fail, { once: true });
    script.addEventListener("load", () => {
      const oauth = (window as Window & { google?: { accounts?: { oauth2?: GoogleOAuth } } }).google?.accounts?.oauth2;
      if (!oauth) {
        fail();
        return;
      }
      clearTimeout(timeout);
      resolve(oauth);
    }, { once: true });
    document.head.append(script);
  }).catch((error: unknown) => {
    library = undefined;
    throw error;
  });
  return library;
}

export async function prepareGooglePopup(clientId: string): Promise<GoogleAuthPopup> {
  const oauth = await loadGoogleOAuth();
  return () => new Promise<string | null>((resolve, reject) => {
    oauth.initCodeClient({
      client_id: clientId,
      scope: "openid email profile",
      ux_mode: "popup",
      include_granted_scopes: false,
      callback: ({ code, error }) => {
        if (code) resolve(code);
        else if (error === "access_denied") resolve(null);
        else reject(new Error("Google did not return an authorization code"));
      },
      error_callback: ({ type }) => {
        if (type === "popup_closed") resolve(null);
        else reject(new Error("Google authorization popup failed"));
      },
    }).requestCode();
  });
}
