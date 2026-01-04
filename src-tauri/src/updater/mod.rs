pub mod update_checker;

pub use update_checker::{
    check_for_updates, get_update_preferences, init_updater, install_update,
    set_update_preferences, UpdateCheckResult, UpdatePreferences, UpdateStatus,
};
