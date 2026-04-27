mod ai_client;
mod commands;
mod db;
mod keychain;
mod prompts;

use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, PhysicalPosition,
};

#[cfg(desktop)]
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};

use commands::AppState;
use db::Db;

#[derive(Default)]
pub struct TrayAnchor {
    inner: Mutex<Option<(f64, f64, f64, f64)>>,
}

impl TrayAnchor {
    fn set(&self, x: f64, y: f64, w: f64, h: f64) {
        if let Ok(mut g) = self.inner.lock() {
            *g = Some((x, y, w, h));
        }
    }
    fn get(&self) -> Option<(f64, f64, f64, f64)> {
        self.inner.lock().ok().and_then(|g| *g)
    }
}

fn position_under_anchor(
    window: &tauri::WebviewWindow,
    tray_x: f64,
    tray_y: f64,
    tray_w: f64,
    tray_h: f64,
) {
    let outer = match window.outer_size() {
        Ok(s) => s,
        Err(_) => return,
    };
    let monitor = match window.current_monitor() {
        Ok(Some(m)) => m,
        _ => match window.primary_monitor() {
            Ok(Some(m)) => m,
            _ => return,
        },
    };

    let mon_pos = monitor.position();
    let mon_size = monitor.size();
    let mon_left = mon_pos.x as f64;
    let mon_top = mon_pos.y as f64;
    let mon_right = mon_left + mon_size.width as f64;
    let mon_bottom = mon_top + mon_size.height as f64;

    let win_w = outer.width as f64;
    let win_h = outer.height as f64;

    let gap = 4.0;
    let mut x = tray_x + tray_w / 2.0 - win_w / 2.0;
    let mut y = tray_y + tray_h + gap;

    let edge_pad = 8.0;
    if x < mon_left + edge_pad {
        x = mon_left + edge_pad;
    }
    if x + win_w > mon_right - edge_pad {
        x = mon_right - edge_pad - win_w;
    }
    if y + win_h > mon_bottom - edge_pad {
        y = (tray_y - gap - win_h).max(mon_top + edge_pad);
    }

    let _ = window.set_position(PhysicalPosition::new(x.round() as i32, y.round() as i32));
}

fn position_fallback_top_right(window: &tauri::WebviewWindow) {
    let outer = match window.outer_size() {
        Ok(s) => s,
        Err(_) => return,
    };
    let monitor = match window.current_monitor() {
        Ok(Some(m)) => m,
        _ => match window.primary_monitor() {
            Ok(Some(m)) => m,
            _ => return,
        },
    };
    let mon_pos = monitor.position();
    let mon_size = monitor.size();
    let mon_right = mon_pos.x as f64 + mon_size.width as f64;
    let mon_top = mon_pos.y as f64;

    let win_w = outer.width as f64;
    let menubar_h = 28.0;
    let edge_pad = 12.0;

    let x = (mon_right - edge_pad - win_w).round() as i32;
    let y = (mon_top + menubar_h + edge_pad).round() as i32;
    let _ = window.set_position(PhysicalPosition::new(x, y));
}

fn show_anchored(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Some(anchor) = app.state::<TrayAnchor>().get() {
            position_under_anchor(&window, anchor.0, anchor.1, anchor.2, anchor.3);
        } else {
            position_fallback_top_right(&window);
        }
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn toggle_anchored(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        match window.is_visible() {
            Ok(true) => {
                let _ = window.hide();
            }
            _ => show_anchored(app),
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default().plugin(tauri_plugin_opener::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_anchored(app);
                    }
                })
                .build(),
        );
    }

    builder
        .manage(TrayAnchor::default())
        .invoke_handler(tauri::generate_handler![
            commands::optimize_prompt,
            commands::optimize_prompt_stream,
            commands::cancel_optimize,
            commands::set_api_key,
            commands::delete_api_key,
            commands::key_status,
            commands::list_models,
            commands::recommended_model,
            commands::validate_api_key,
            commands::list_history,
            commands::delete_history_item,
            commands::clear_history,
            commands::prompts_dir,
            commands::open_prompts_dir,
            commands::reset_default_prompts,
        ])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
            let db = Db::open(data_dir.clone()).map_err(|e| -> Box<dyn std::error::Error> { e.into() })?;
            let prompts_dir = prompts::default_prompts_dir(&data_dir);
            // Write defaults if missing so users have files to edit immediately.
            let _ = prompts::write_defaults_if_missing(&prompts_dir);

            app.manage(AppState {
                cancel_flag: Arc::new(AtomicBool::new(false)),
                db,
                prompts_dir,
            });

            #[cfg(desktop)]
            {
                let toggle_shortcut =
                    Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::Space);
                app.global_shortcut().register(toggle_shortcut)?;
            }

            #[cfg(target_os = "macos")]
            if let Some(window) = app.get_webview_window("main") {
                let _ = apply_vibrancy(
                    &window,
                    NSVisualEffectMaterial::HudWindow,
                    Some(NSVisualEffectState::Active),
                    Some(12.0),
                );
            }

            let quit_item =
                MenuItem::with_id(app, "quit", "退出 Distill", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_item])?;

            let _tray = TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .icon_as_template(true)
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    if event.id.as_ref() == "quit" {
                        app.exit(0);
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        rect,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let scale = window.scale_factor().unwrap_or(1.0);
                            let p = rect.position.to_physical::<f64>(scale);
                            let s = rect.size.to_physical::<f64>(scale);
                            app.state::<TrayAnchor>().set(p.x, p.y, s.width, s.height);
                        }
                        toggle_anchored(app);
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
