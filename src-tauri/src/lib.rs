// Module declarations
pub mod audit;
pub mod blob;
pub mod commands;
pub mod db;
pub mod docker;
pub mod models;
pub mod monitoring;
pub mod security;
pub mod state;
pub mod updater;
pub mod utils;

// Re-exports
pub use state::AppState;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      // Initialize application state (this also initializes logging)
      let app_state = AppState::new();
      app.manage(app_state);

      log::info!("MonkDB Workbench initialized");
      log::info!("Version: {}", env!("CARGO_PKG_VERSION"));

      // Initialize updater (check for updates periodically)
      if let Err(e) = updater::init_updater(app.handle()) {
        log::error!("Failed to initialize updater: {}", e);
      }

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      // Connection management commands
      commands::connection::connect_database,
      commands::connection::disconnect_database,
      commands::connection::test_connection,
      commands::connection::list_connections,
      commands::connection::get_connection_info,
      // Query execution commands
      commands::query::execute_query,
      commands::query::execute_monkdb_http_query,
      // Schema metadata commands
      commands::schema::get_schema_metadata,
      commands::schema::get_table_columns,
      commands::schema::list_schemas,
      commands::schema::list_tables,
      // Saved queries commands
      commands::saved_queries::save_query,
      commands::saved_queries::list_saved_queries,
      commands::saved_queries::get_saved_query,
      commands::saved_queries::update_saved_query,
      commands::saved_queries::delete_saved_query,
      commands::saved_queries::mark_query_executed,
      commands::saved_queries::list_query_folders,
      commands::saved_queries::list_query_tags,
      // BLOB storage commands
      commands::blob::validate_file,
      commands::blob::upload_blob,
      commands::blob::download_blob,
      commands::blob::download_blobs_as_zip,
      commands::blob::delete_blob,
      commands::blob::list_blobs,
      commands::blob::create_blob_metadata_table,
      commands::blob::create_blob_table,
      // System commands
      commands::system::get_os_username,
      // Table designer commands
      commands::table_designer::generate_table_sql,
      commands::table_designer::validate_table_design,
      commands::table_designer::create_table_advanced,
      // Monitoring commands
      commands::monitoring::get_recent_queries,
      commands::monitoring::get_slow_queries,
      commands::monitoring::get_failed_queries,
      commands::monitoring::get_connection_queries,
      commands::monitoring::get_pool_history,
      commands::monitoring::get_app_metrics,
      commands::monitoring::clear_metrics,
      commands::monitoring::get_cache_stats,
      commands::monitoring::clear_cache,
      // Audit commands
      commands::monitoring::get_audit_events,
      commands::monitoring::get_audit_statistics,
      commands::monitoring::clear_audit_log,
      // Docker commands
      commands::docker::check_docker_available,
      commands::docker::get_docker_version,
      commands::docker::list_containers,
      commands::docker::list_running_containers,
      commands::docker::list_monkdb_containers,
      commands::docker::get_container,
      commands::docker::start_container,
      commands::docker::stop_container,
      commands::docker::restart_container,
      commands::docker::remove_container,
      commands::docker::get_container_logs,
      // Updater commands
      updater::update_checker::check_for_updates,
      updater::update_checker::install_update,
      updater::update_checker::get_update_preferences,
      updater::update_checker::set_update_preferences,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
