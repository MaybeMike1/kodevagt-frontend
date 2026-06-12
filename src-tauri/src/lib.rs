mod auth;

use auth::{handle_deep_link, handle_startup_deep_links, AuthState};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_deep_link::init())
        .manage(AuthState {
            pending_state: std::sync::Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            auth::start_github_login,
            auth::get_session,
            auth::logout,
        ]);

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            handle_startup_deep_links(app, &argv);
        }));
    }

    builder
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri_plugin_deep_link::DeepLinkExt;

                app.deep_link().register("kodevagt")?;

                let handle = app.handle().clone();
                app.deep_link().on_open_url(move |event| {
                    for url in event.urls() {
                        let app_handle = handle.clone();
                        let url_string = url.to_string();
                        tauri::async_runtime::spawn(async move {
                            let auth_state = app_handle.state::<AuthState>();
                            handle_deep_link(&app_handle, &url_string, &auth_state).await;
                        });
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
