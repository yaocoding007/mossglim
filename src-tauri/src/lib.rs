mod ai;
mod commands;
mod db;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:poweren.db", db::get_migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::call_ai_analysis,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
