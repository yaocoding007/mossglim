mod ai;
mod commands;
mod db;
mod dictionary;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:mossglim.db", db::get_migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::call_ai_analysis,
            commands::call_ai_analysis_stream,
            commands::lookup_dictionary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
