use rfd::FileDialog;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use sysinfo::System;
use tauri::{AppHandle, Emitter, Manager, State};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Game {
    id: String,
    title: String,
    path: String,
    completion: u32,
    playtime: f32, // in hours
    #[serde(rename = "imageHeight")]
    image_height: u32,
    #[serde(rename = "imageWidth", default)]
    image_width: Option<u32>,
    #[serde(default)]
    cover_url: Option<String>,
    #[serde(default)]
    is_steam: bool,
    #[serde(default)]
    x: Option<i32>,
    #[serde(default)]
    y: Option<i32>,
    #[serde(default)]
    favorite: bool,
    #[serde(default)]
    last_played: Option<u64>,
}

fn default_grid_size() -> u32 {
    250
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct LauncherSettings {
    pre_launch_path: Option<String>,
    #[serde(default = "default_grid_size")]
    grid_size: u32,
}

impl Default for LauncherSettings {
    fn default() -> Self {
        Self {
            pre_launch_path: None,
            grid_size: 250,
        }
    }
}

struct AppState {
    games: Mutex<Vec<Game>>,
    settings: Mutex<LauncherSettings>,
    data_path: PathBuf,
    settings_path: PathBuf,
}

fn load_games(data_path: &PathBuf) -> Vec<Game> {
    if let Ok(data) = fs::read_to_string(data_path) {
        if let Ok(games) = serde_json::from_str(&data) {
            return games;
        }
    }
    Vec::new()
}

fn save_games(data_path: &PathBuf, games: &Vec<Game>) {
    if let Ok(json) = serde_json::to_string_pretty(games) {
        let _ = fs::write(data_path, json);
    }
}

fn load_settings(path: &PathBuf) -> LauncherSettings {
    if let Ok(data) = fs::read_to_string(path) {
        if let Ok(s) = serde_json::from_str(&data) {
            return s;
        }
    }
    LauncherSettings::default()
}

fn save_settings(path: &PathBuf, settings: &LauncherSettings) {
    if let Ok(json) = serde_json::to_string_pretty(settings) {
        let _ = fs::write(path, json);
    }
}

#[tauri::command]
fn get_games(state: State<AppState>) -> Vec<Game> {
    state.games.lock().unwrap().clone()
}

#[tauri::command]
fn get_settings(state: State<AppState>) -> LauncherSettings {
    let mut s = state.settings.lock().unwrap().clone();
    if s.grid_size == 0 {
        s.grid_size = 250;
    }
    s
}

#[tauri::command]
fn update_grid_size(state: State<AppState>, size: u32) -> Result<(), String> {
    let mut settings = state.settings.lock().unwrap();
    settings.grid_size = size.clamp(150, 320);
    save_settings(&state.settings_path, &settings);
    Ok(())
}

#[tauri::command]
fn set_pre_launch_hook(state: State<AppState>) -> Result<Option<String>, String> {
    if let Some(path) = FileDialog::new()
        .add_filter("Executable", &["exe", "sh", "appimage", "bin"])
        .pick_file()
    {
        let path_str = path.to_string_lossy().to_string();
        let mut settings = state.settings.lock().unwrap();
        settings.pre_launch_path = Some(path_str.clone());
        save_settings(&state.settings_path, &settings);
        Ok(Some(path_str))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn clear_pre_launch_hook(state: State<AppState>) -> Result<(), String> {
    let mut settings = state.settings.lock().unwrap();
    settings.pre_launch_path = None;
    save_settings(&state.settings_path, &settings);
    Ok(())
}

#[tauri::command]
fn convert_to_direct_launch(state: State<AppState>, id: String) -> Result<bool, String> {
    if let Some(path) = FileDialog::new()
        .add_filter("Executable", &["exe", "sh", "appimage", "bin"])
        .pick_file()
    {
        let mut games = state.games.lock().unwrap();
        if let Some(game) = games.iter_mut().find(|g| g.id == id) {
            game.path = path.to_string_lossy().to_string();
            game.is_steam = false;
        }
        save_games(&state.data_path, &games);
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
fn add_game(state: State<AppState>) -> Result<Option<Game>, String> {
    if let Some(path) = FileDialog::new()
        .add_filter("Executable", &["exe", "sh", "appimage", "bin"])
        .pick_file()
    {
        let file_name = path
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        let path_str = path.to_string_lossy().to_string();

        let mut games = state.games.lock().unwrap();
        if games.iter().any(|g| g.path == path_str) {
            return Err("Game is already in your library!".to_string());
        }

        let new_id = Uuid::new_v4().to_string();
        let mut cover_url = None;

        let ico_path = path.with_extension("ico");
        if ico_path.exists() {
            let covers_dir = state
                .data_path
                .parent()
                .unwrap_or(Path::new("."))
                .join("covers");
            if !covers_dir.exists() {
                let _ = fs::create_dir_all(&covers_dir);
            }
            if let Ok(img) = image::open(&ico_path) {
                let resized = img.resize(800, 800, FilterType::Triangle);
                let dest_path = covers_dir.join(format!("{}.jpg", new_id));
                if resized.save(&dest_path).is_ok() {
                    cover_url = Some(dest_path.to_string_lossy().to_string());
                }
            }
        }

        let new_game = Game {
            id: new_id,
            title: file_name,
            path: path_str,
            completion: 0,
            playtime: 0.0,
            image_height: 250,
            image_width: None,
            cover_url,
            is_steam: false,
            x: None,
            y: None,
            favorite: false,
            last_played: None,
        };

        games.push(new_game.clone());
        save_games(&state.data_path, &games);
        Ok(Some(new_game))
    } else {
        Ok(None)
    }
}

use image::imageops::FilterType;

#[tauri::command]
fn set_cover_art(state: State<AppState>, id: String) -> Result<Option<String>, String> {
    if let Some(path) = FileDialog::new()
        .add_filter("Images", &["png", "jpg", "jpeg", "webp"])
        .pick_file()
    {
        let covers_dir = state
            .data_path
            .parent()
            .unwrap_or(Path::new("."))
            .join("covers");
        if !covers_dir.exists() {
            fs::create_dir_all(&covers_dir).map_err(|e| e.to_string())?;
        }

        let img = image::open(&path).map_err(|e| format!("Failed to open image: {}", e))?;
        // Resize keeping aspect ratio, fitting within 800x800
        let resized = img.resize(800, 800, FilterType::Triangle);

        let dest_path = covers_dir.join(format!("{}.jpg", id));
        resized
            .save(&dest_path)
            .map_err(|e| format!("Failed to save image: {}", e))?;

        let path_str = dest_path.to_string_lossy().to_string();

        let mut games = state.games.lock().unwrap();
        if let Some(g) = games.iter_mut().find(|g| g.id == id) {
            g.cover_url = Some(path_str.clone());
        }
        save_games(&state.data_path, &games);
        Ok(Some(path_str))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn remove_game(state: State<AppState>, id: String) -> Result<(), String> {
    let mut games = state.games.lock().unwrap();
    games.retain(|g| g.id != id);
    save_games(&state.data_path, &games);
    Ok(())
}

#[tauri::command]
fn update_game_size(
    state: State<AppState>,
    id: String,
    width: u32,
    height: u32,
) -> Result<(), String> {
    let mut games = state.games.lock().unwrap();
    if let Some(g) = games.iter_mut().find(|g| g.id == id) {
        g.image_width = Some(width);
        g.image_height = height;
    }
    save_games(&state.data_path, &games);
    Ok(())
}

use base64::{engine::general_purpose::STANDARD as b64, Engine as _};
use std::io::Read;

#[tauri::command]
fn read_image_file(path: String) -> Result<String, String> {
    let mut file = fs::File::open(&path).map_err(|e| e.to_string())?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).map_err(|e| e.to_string())?;

    let ext = Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");
    let mime = match ext.to_lowercase().as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        _ => "image/png",
    };

    let b64_str = b64.encode(&buffer);
    Ok(format!("data:{};base64,{}", mime, b64_str))
}

#[tauri::command]
fn scan_local_folder(state: State<AppState>) -> Result<usize, String> {
    if let Some(path) = FileDialog::new().pick_folder() {
        let mut added_count = 0;
        let mut games = state.games.lock().unwrap();
        let covers_dir = state
            .data_path
            .parent()
            .unwrap_or(Path::new("."))
            .join("covers");

        fn scan_dir(
            dir: &Path,
            games: &mut Vec<Game>,
            added_count: &mut usize,
            depth: u8,
            covers_dir: &Path,
        ) {
            if depth == 0 {
                return;
            }
            if let Ok(entries) = fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_dir() {
                        scan_dir(&path, games, added_count, depth - 1, covers_dir);
                    } else if path.extension().and_then(|s| s.to_str()) == Some("exe") {
                        let path_str = path.to_string_lossy().to_string();
                        if !games.iter().any(|g| g.path == path_str) {
                            let title = path
                                .file_stem()
                                .unwrap_or_default()
                                .to_string_lossy()
                                .to_string();
                            let new_id = Uuid::new_v4().to_string();
                            let mut cover_url = None;

                            let ico_path = path.with_extension("ico");
                            if ico_path.exists() {
                                if !covers_dir.exists() {
                                    let _ = fs::create_dir_all(covers_dir);
                                }
                                if let Ok(img) = image::open(&ico_path) {
                                    let resized = img.resize(800, 800, FilterType::Triangle);
                                    let dest_path = covers_dir.join(format!("{}.jpg", new_id));
                                    if resized.save(&dest_path).is_ok() {
                                        cover_url = Some(dest_path.to_string_lossy().to_string());
                                    }
                                }
                            }

                            games.push(Game {
                                id: new_id,
                                title,
                                path: path_str,
                                completion: 0,
                                playtime: 0.0,
                                image_height: 300,
                                image_width: None,
                                cover_url,
                                is_steam: false,
                                x: None,
                                y: None,
                                favorite: false,
                                last_played: None,
                            });
                            *added_count += 1;
                        }
                    }
                }
            }
        }

        scan_dir(&path, &mut games, &mut added_count, 3, &covers_dir);

        if added_count > 0 {
            save_games(&state.data_path, &games);
        }
        Ok(added_count)
    } else {
        Ok(0)
    }
}

fn spawn_local_game(path: &str, title: &str) -> Result<std::process::Child, String> {
    let path = Path::new(path);
    let mut command = std::process::Command::new(path);
    if let Some(parent) = path.parent() {
        command.current_dir(parent);
    }
    command
        .spawn()
        .map_err(|e| format!("Could not launch {title}: {e}"))
}

#[tauri::command]
async fn launch_game(app: AppHandle, id: String) -> Result<(), String> {
    // Return only after the launch succeeds, without blocking the UI during hook startup.
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let game = state
            .games
            .lock()
            .unwrap()
            .iter()
            .find(|g| g.id == id)
            .cloned()
            .ok_or("Game not found")?;
        let pre_launch = state.settings.lock().unwrap().pre_launch_path.clone();
        if let Some(hook_path) = pre_launch {
            let hook_filename = Path::new(&hook_path)
                .file_name()
                .ok_or("Invalid pre-launch executable")?
                .to_string_lossy();
            let sys = System::new_all();
            let running = sys.processes().values().any(|process| {
                process
                    .name()
                    .to_string_lossy()
                    .eq_ignore_ascii_case(&hook_filename)
            });
            if !running {
                let mut hook = std::process::Command::new(&hook_path)
                    .spawn()
                    .map_err(|e| format!("Could not start pre-launch executable: {e}"))?;
                std::thread::spawn(move || {
                    let _ = hook.wait();
                });
                std::thread::sleep(std::time::Duration::from_secs(4));
            }
        }
        let child = if game.is_steam {
            open::that(format!("steam://rungameid/{}", game.path))
                .map_err(|e| format!("Could not open Steam: {e}"))?;
            None
        } else {
            Some(spawn_local_game(&game.path, &game.title)?)
        };
        let start = Instant::now();
        {
            let mut games = state.games.lock().unwrap();
            if let Some(game) = games.iter_mut().find(|g| g.id == id) {
                game.last_played = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .ok()
                    .map(|d| d.as_secs());
            }
            save_games(&state.data_path, &games);
        }
        if let Some(mut child) = child {
            std::thread::spawn(move || {
                if child.wait().is_ok() {
                    let state = app.state::<AppState>();
                    let mut games = state.games.lock().unwrap();
                    if let Some(game) = games.iter_mut().find(|g| g.id == id) {
                        game.playtime += start.elapsed().as_secs_f32() / 3600.0;
                    }
                    save_games(&state.data_path, &games);
                    drop(games);
                    let _ = app.emit("refresh-games", ());
                }
            });
        }
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
fn set_game_favorite(state: State<AppState>, id: String, favorite: bool) -> Result<(), String> {
    let mut games = state.games.lock().unwrap();
    let mut updated = games.clone();
    let game = updated
        .iter_mut()
        .find(|g| g.id == id)
        .ok_or("Game not found")?;
    game.favorite = favorite;
    let json = serde_json::to_string_pretty(&updated).map_err(|e| e.to_string())?;
    fs::write(&state.data_path, json).map_err(|e| format!("Could not save favorite: {e}"))?;
    *games = updated;
    Ok(())
}

#[tauri::command]
fn scan_steam_games(state: State<AppState>) -> Result<usize, String> {
    let mut steam_paths = vec![
        PathBuf::from("C:\\Program Files (x86)\\Steam\\steamapps"),
        PathBuf::from("C:\\Program Files\\Steam\\steamapps"),
    ];
    if let Ok(home) = std::env::var("HOME") {
        steam_paths.push(PathBuf::from(format!("{}/.steam/steam/steamapps", home)));
        steam_paths.push(PathBuf::from(format!(
            "{}/.local/share/Steam/steamapps",
            home
        )));
    }

    let mut added_count = 0;

    for path in steam_paths {
        if path.exists() {
            if let Ok(entries) = fs::read_dir(path) {
                for entry in entries.flatten() {
                    let file_name = entry.file_name().to_string_lossy().to_string();
                    if file_name.starts_with("appmanifest_") && file_name.ends_with(".acf") {
                        if let Ok(content) = fs::read_to_string(entry.path()) {
                            let appid = content
                                .lines()
                                .find(|l| l.contains("\"appid\""))
                                .and_then(|l| l.split('"').nth(3));
                            let name = content
                                .lines()
                                .find(|l| l.contains("\"name\""))
                                .and_then(|l| l.split('"').nth(3));

                            if let (Some(id), Some(n)) = (appid, name) {
                                let mut games = state.games.lock().unwrap();
                                if !games.iter().any(|g| g.is_steam && g.path == id) {
                                    games.push(Game {
                                        id: Uuid::new_v4().to_string(),
                                        title: n.to_string(),
                                        path: id.to_string(),
                                        completion: 0,
                                        playtime: 0.0,
                                        image_height: 300,
                                        image_width: None,
                                        cover_url: Some(format!("https://steamcdn-a.akamaihd.net/steam/apps/{}/library_600x900_2x.jpg", id)),
                                        is_steam: true,
                                        x: None,
                                        y: None,
            favorite: false,
            last_played: None,
                                    });
                                    added_count += 1;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if added_count > 0 {
        let games = state.games.lock().unwrap();
        save_games(&state.data_path, &games);
    }
    Ok(added_count)
}

#[tauri::command]
fn backup_saves(app: AppHandle) -> Result<String, String> {
    let desktop_dir = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_default();
    let backup_path = PathBuf::from(desktop_dir)
        .join("Desktop")
        .join("RetroX_Backups");

    if !backup_path.exists() {
        fs::create_dir_all(&backup_path).map_err(|e| e.to_string())?;
    }

    let state = app.state::<AppState>();
    let save_file = &state.data_path;
    let dest = backup_path.join("games_backup.json");

    fs::copy(save_file, &dest).map_err(|e| e.to_string())?;

    Ok(format!("Successfully backed up to: {:?}", backup_path))
}

#[tauri::command]
fn update_game_position(state: State<AppState>, id: String, x: i32, y: i32) -> Result<(), String> {
    let mut games = state.games.lock().unwrap();
    if let Some(game) = games.iter_mut().find(|g| g.id == id) {
        game.x = Some(x);
        game.y = Some(y);
    }
    save_games(&state.data_path, &games);
    Ok(())
}

#[tauri::command]
fn reset_all_game_layouts(state: State<AppState>) -> Result<(), String> {
    let mut games = state.games.lock().unwrap();
    for game in games.iter_mut() {
        game.x = None;
        game.y = None;
        game.image_width = None;
    }
    save_games(&state.data_path, &games);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| PathBuf::from("."));
            if !app_data_dir.exists() {
                let _ = fs::create_dir_all(&app_data_dir);
            }

            let mut data_path = app_data_dir.clone();
            data_path.push("games.json");
            let legacy_data = std::env::current_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join("games.json");
            if legacy_data.exists() && !data_path.exists() {
                let _ = fs::copy(&legacy_data, &data_path);
            }

            let mut settings_path = app_data_dir.clone();
            settings_path.push("settings.json");
            let legacy_settings = std::env::current_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join("settings.json");
            if legacy_settings.exists() && !settings_path.exists() {
                let _ = fs::copy(&legacy_settings, &settings_path);
            }

            let legacy_covers = std::env::current_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join("covers");
            let covers_dir = app_data_dir.join("covers");
            if legacy_covers.exists() && !covers_dir.exists() {
                let _ = fs::rename(&legacy_covers, &covers_dir);
            }

            let games = load_games(&data_path);
            let settings = load_settings(&settings_path);

            app.manage(AppState {
                games: Mutex::new(games),
                settings: Mutex::new(settings),
                data_path,
                settings_path,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_game_favorite,
            get_games,
            add_game,
            launch_game,
            scan_steam_games,
            backup_saves,
            get_settings,
            update_grid_size,
            reset_all_game_layouts,
            set_pre_launch_hook,
            clear_pre_launch_hook,
            convert_to_direct_launch,
            set_cover_art,
            scan_local_folder,
            remove_game,
            update_game_size,
            update_game_position,
            read_image_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_executable_returns_an_actionable_error() {
        let missing = std::env::temp_dir()
            .join(Uuid::new_v4().to_string())
            .join("missing-game");
        let result = spawn_local_game(&missing.to_string_lossy(), "Test game");
        assert!(result
            .unwrap_err()
            .starts_with("Could not launch Test game:"));
    }

    #[test]
    fn legacy_library_remains_readable_and_new_metadata_round_trips() {
        let mut games: Vec<Game> = serde_json::from_str(include_str!("../games.json")).unwrap();
        assert!(!games.is_empty());
        assert!(games
            .iter()
            .all(|game| !game.favorite && game.last_played.is_none()));
        games[0].favorite = true;
        games[0].last_played = Some(12345);
        let restored: Vec<Game> =
            serde_json::from_str(&serde_json::to_string(&games).unwrap()).unwrap();
        assert!(restored[0].favorite);
        assert_eq!(restored[0].last_played, Some(12345));
        assert_eq!(restored[0].path, games[0].path);
        assert_eq!(restored[0].playtime, games[0].playtime);
        assert_eq!(restored[0].x, games[0].x);
    }
}
