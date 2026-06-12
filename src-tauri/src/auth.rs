use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_store::StoreExt;

const SESSION_STORE_PATH: &str = "session.json";
const SESSION_KEY: &str = "session";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubUser {
    pub login: String,
    pub id: u64,
    pub avatar_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub access_token: String,
    pub user: GitHubUser,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExchangeResponse {
    access_token: String,
    user: GitHubUser,
}

pub struct AuthState {
    pub pending_state: Mutex<Option<String>>,
}

fn api_url() -> String {
    std::env::var("API_URL").unwrap_or_else(|_| "http://localhost:3000".to_string())
}

async fn save_session(app: &AppHandle, session: &Session) -> Result<(), String> {
    let store = app.store(SESSION_STORE_PATH).map_err(|e| e.to_string())?;
    store.set(SESSION_KEY, serde_json::to_value(session).map_err(|e| e.to_string())?);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

async fn load_session(app: &AppHandle) -> Result<Option<Session>, String> {
    let store = app.store(SESSION_STORE_PATH).map_err(|e| e.to_string())?;
    let value = store.get(SESSION_KEY);
    match value {
        Some(v) => {
            let session: Session = serde_json::from_value(v).map_err(|e| e.to_string())?;
            Ok(Some(session))
        }
        None => Ok(None),
    }
}

async fn clear_session(app: &AppHandle) -> Result<(), String> {
    let store = app.store(SESSION_STORE_PATH).map_err(|e| e.to_string())?;
    store.delete(SESSION_KEY);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

fn is_desktop_callback_url(parsed: &url::Url) -> bool {
    if parsed.scheme() == "kodevagt" {
        return true;
    }
    parsed.host_str() == Some("127.0.0.1") && parsed.path() == "/callback"
}

pub async fn handle_deep_link(app: &AppHandle, url: &str, auth_state: &AuthState) {
    let parsed = match url::Url::parse(url) {
        Ok(u) => u,
        Err(e) => {
            let _ = app.emit("auth://error", format!("Invalid callback URL: {e}"));
            return;
        }
    };

    if !is_desktop_callback_url(&parsed) {
        return;
    }

    let mut query = parsed.query().unwrap_or("").to_string();
    if query.is_empty() {
        if let Some(fragment) = parsed.fragment() {
            query = fragment.to_string();
        }
    }

    let params: std::collections::HashMap<_, _> =
        url::form_urlencoded::parse(query.as_bytes()).collect();

    if let Some(error) = params.get("error") {
        let description = params
            .get("error_description")
            .map(|s| s.to_string())
            .unwrap_or_else(|| error.to_string());
        let _ = app.emit("auth://error", description);
        return;
    }

    let state = match params.get("state") {
        Some(s) => s.to_string(),
        None => {
            let _ = app.emit("auth://error", "Missing state in callback".to_string());
            return;
        }
    };

    let pending = auth_state.pending_state.lock().unwrap().take();
    if pending.as_deref() != Some(state.as_str()) {
        let _ = app.emit("auth://error", "OAuth state mismatch".to_string());
        return;
    }

    let code = match params.get("code") {
        Some(c) => c.to_string(),
        None => {
            let _ = app.emit("auth://error", "Missing code in callback".to_string());
            return;
        }
    };

    match exchange_code(&code).await {
        Ok(session) => {
            if let Err(e) = save_session(app, &session).await {
                let _ = app.emit("auth://error", e);
                return;
            }
            let _ = app.emit("auth://success", session);
        }
        Err(e) => {
            let _ = app.emit("auth://error", e);
        }
    }
}

fn build_callback_url_from_request(request: &str, port: u16) -> Option<String> {
    let first_line = request.lines().next()?;
    let mut parts = first_line.split_whitespace();
    parts.next()?;
    let target = parts.next()?;
    if !target.starts_with("/callback") {
        return None;
    }
    Some(format!("http://127.0.0.1:{port}{target}"))
}

fn start_loopback_callback_server(app: AppHandle) -> Result<u16, String> {
    let listener =
        TcpListener::bind("127.0.0.1:0").map_err(|e| format!("Failed to bind loopback: {e}"))?;
    listener
        .set_nonblocking(false)
        .map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();

    std::thread::spawn(move || {
        if let Ok((mut stream, _)) = listener.accept() {
            let mut buffer = [0u8; 8192];
            let read = stream.read(&mut buffer).unwrap_or(0);
            let request = String::from_utf8_lossy(&buffer[..read]);

            if let Some(callback_url) = build_callback_url_from_request(&request, port) {
                let app_handle = app.clone();
                tauri::async_runtime::spawn(async move {
                    let auth_state = app_handle.state::<AuthState>();
                    handle_deep_link(&app_handle, &callback_url, &auth_state).await;
                });
            } else {
                let _ = app.emit("auth://error", "Invalid loopback callback".to_string());
            }

            let body = "<html><body><p>Login complete. You can close this window and return to Kodevagt.</p></body></html>";
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                body.len(),
                body
            );
            let _ = stream.write_all(response.as_bytes());
        }
    });

    Ok(port)
}

async fn exchange_code(code: &str) -> Result<Session, String> {
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/auth/desktop/exchange", api_url()))
        .json(&serde_json::json!({ "code": code }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let body: serde_json::Value = response.json().await.unwrap_or_default();
        let message = body
            .get("error")
            .and_then(|v| v.as_str())
            .unwrap_or("Exchange failed");
        return Err(message.to_string());
    }

    let data: ExchangeResponse = response.json().await.map_err(|e| e.to_string())?;
    Ok(Session {
        access_token: data.access_token,
        user: data.user,
    })
}

#[tauri::command]
pub async fn start_github_login(
    app: AppHandle,
    auth_state: State<'_, AuthState>,
) -> Result<(), String> {
    let state = uuid::Uuid::new_v4().to_string();
    *auth_state.pending_state.lock().unwrap() = Some(state.clone());

    let port = start_loopback_callback_server(app.clone())?;
    let redirect_uri = format!("http://127.0.0.1:{port}/callback");

    let login_url = format!(
        "{}/auth/github?client=desktop&state={}&redirect_uri={}",
        api_url(),
        urlencoding::encode(&state),
        urlencoding::encode(&redirect_uri),
    );

    app.opener()
        .open_url(login_url, None::<&str>)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_session(app: AppHandle) -> Result<Option<Session>, String> {
    load_session(&app).await
}

#[tauri::command]
pub async fn logout(app: AppHandle) -> Result<(), String> {
    clear_session(&app).await
}

pub fn handle_startup_deep_links(app: &AppHandle, argv: &[String]) {
    for arg in argv {
        if arg.starts_with("kodevagt://") {
            let handle = app.clone();
            let url = arg.clone();
            tauri::async_runtime::spawn(async move {
                let auth_state = handle.state::<AuthState>();
                handle_deep_link(&handle, &url, &auth_state).await;
            });
        }
    }
}
