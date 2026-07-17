use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{PathBuf, Path};
use std::sync::Mutex;
use std::time::Instant;
use tauri::{AppHandle, Manager, State, Emitter};
use uuid::Uuid;
use rfd::FileDialog;
use sysinfo::System;

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
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
struct LauncherSettings {
    pre_launch_path: Option<String>,
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
    state.settings.lock().unwrap().clone()
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

        let new_game = Game {
            id: Uuid::new_v4().to_string(),
            title: file_name,
            path: path_str,
            completion: 0,
            playtime: 0.0,
            image_height: 250,
            image_width: None,
            cover_url: None,
            is_steam: false,
        };

        let mut games = state.games.lock().unwrap();
        games.push(new_game.clone());
        save_games(&state.data_path, &games);
        
        Ok(Some(new_game))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn set_cover_art(state: State<AppState>, id: String) -> Result<Option<String>, String> {
    if let Some(path) = FileDialog::new()
        .add_filter("Images", &["png", "jpg", "jpeg"])
        .pick_file()
    {
        let path_str = path.to_string_lossy().to_string();
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
fn update_game_size(state: State<AppState>, id: String, width: u32, height: u32) -> Result<(), String> {
    let mut games = state.games.lock().unwrap();
    if let Some(g) = games.iter_mut().find(|g| g.id == id) {
        g.image_width = Some(width);
        g.image_height = height;
    }
    save_games(&state.data_path, &games);
    Ok(())
}

use base64::{Engine as _, engine::general_purpose::STANDARD as b64};
use std::io::Read;

#[tauri::command]
fn read_image_file(path: String) -> Result<String, String> {
    let mut file = fs::File::open(&path).map_err(|e| e.to_string())?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
    
    let ext = Path::new(&path).extension().and_then(|e| e.to_str()).unwrap_or("png");
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
        
        fn scan_dir(dir: &Path, games: &mut Vec<Game>, added_count: &mut usize, depth: u8) {
            if depth == 0 { return; }
            if let Ok(entries) = fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_dir() {
                        scan_dir(&path, games, added_count, depth - 1);
                    } else if path.extension().and_then(|s| s.to_str()) == Some("exe") {
                        let path_str = path.to_string_lossy().to_string();
                        if !games.iter().any(|g| g.path == path_str) {
                            let title = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
                            games.push(Game {
                                id: Uuid::new_v4().to_string(),
                                title,
                                path: path_str,
                                completion: 0,
                                playtime: 0.0,
                                image_height: 300,
                                image_width: None,
                                cover_url: None,
                                is_steam: false,
                            });
                            *added_count += 1;
                        }
                    }
                }
            }
        }
        
        scan_dir(&path, &mut games, &mut added_count, 3);
        
        if added_count > 0 {
            save_games(&state.data_path, &games);
        }
        Ok(added_count)
    } else {
        Ok(0)
    }
}

#[tauri::command]
fn launch_game(app: AppHandle, id: String) -> Result<(), String> {
    let state = app.state::<AppState>();
    let game = {
        let games = state.games.lock().unwrap();
        games.iter().find(|g| g.id == id).cloned()
    };
    
    let pre_launch = {
        let s = state.settings.lock().unwrap();
        s.pre_launch_path.clone()
    };

    if let Some(game) = game {
        std::thread::spawn(move || {
            let start_time = Instant::now();
            
            // 1. Process Pre-Launch Hooks (e.g. SteamTools)
            if let Some(hook_path) = pre_launch {
                let p = Path::new(&hook_path);
                if let Some(hook_filename) = p.file_name().and_then(|n| n.to_str()) {
                    let mut sys = System::new_all();
                    sys.refresh_all();
                    
                    let mut is_running = false;
                    for process in sys.processes().values() {
                        if let Some(proc_name) = process.name().to_str() {
                            if proc_name.to_lowercase() == hook_filename.to_lowercase() {
                                is_running = true;
                                break;
                            }
                        }
                    }
                    
                    if !is_running {
                        println!("Hook {} not running! Spawning it now...", hook_filename);
                        if let Ok(_) = std::process::Command::new(&hook_path).spawn() {
                            // Give the hook process time to inject/initialize
                            std::thread::sleep(std::time::Duration::from_secs(4));
                        }
                    }
                }
            }
            
            // 2. Launch the Game
            if game.is_steam {
                let uri = format!("steam://rungameid/{}", game.path);
                let _ = open::that(&uri);
                // Steam launches asynchronously. Wait an arbitrary 3 seconds for UI feedback.
                std::thread::sleep(std::time::Duration::from_secs(3));
            } else {
                let game_path = Path::new(&game.path);
                let mut cmd = std::process::Command::new(game_path);
                if let Some(parent) = game_path.parent() {
                    cmd.current_dir(parent);
                }
                let mut child = cmd.spawn().expect("Failed to launch game");
                let _ = child.wait();
            }
            
            let duration = start_time.elapsed();
            let hours_played = duration.as_secs_f32() / 3600.0;
            
            let state = app.state::<AppState>();
            let mut games = state.games.lock().unwrap();
            if let Some(g) = games.iter_mut().find(|g| g.id == id) {
                g.playtime += hours_played;
            }
            save_games(&state.data_path, &games);
            
            let _ = app.emit("refresh-games", ());
        });
        Ok(())
    } else {
        Err("Game not found".to_string())
    }
}

#[tauri::command]
fn scan_steam_games(state: State<AppState>) -> Result<usize, String> {
    let mut steam_paths = vec![
        PathBuf::from("C:\\Program Files (x86)\\Steam\\steamapps"),
        PathBuf::from("C:\\Program Files\\Steam\\steamapps"),
    ];
    if let Ok(home) = std::env::var("HOME") {
        steam_paths.push(PathBuf::from(format!("{}/.steam/steam/steamapps", home)));
        steam_paths.push(PathBuf::from(format!("{}/.local/share/Steam/steamapps", home)));
    }

    let mut added_count = 0;
    
    for path in steam_paths {
        if path.exists() {
            if let Ok(entries) = fs::read_dir(path) {
                for entry in entries.flatten() {
                    let file_name = entry.file_name().to_string_lossy().to_string();
                    if file_name.starts_with("appmanifest_") && file_name.ends_with(".acf") {
                        if let Ok(content) = fs::read_to_string(entry.path()) {
                            let appid = content.lines().find(|l| l.contains("\"appid\"")).and_then(|l| l.split('"').nth(3));
                            let name = content.lines().find(|l| l.contains("\"name\"")).and_then(|l| l.split('"').nth(3));
                            
                            if let (Some(id), Some(n)) = (appid, name) {
                                let mut games = state.games.lock().unwrap();
                                if !games.iter().any(|g| g.title == n) {
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
    let desktop_dir = std::env::var("USERPROFILE").or_else(|_| std::env::var("HOME")).unwrap_or_default();
    let backup_path = PathBuf::from(desktop_dir).join("Desktop").join("RetroX_Backups");
    
    if !backup_path.exists() {
        fs::create_dir_all(&backup_path).map_err(|e| e.to_string())?;
    }
    
    let state = app.state::<AppState>();
    let save_file = &state.data_path;
    let dest = backup_path.join("games_backup.json");
    
    fs::copy(save_file, &dest).map_err(|e| e.to_string())?;
    
    Ok(format!("Successfully backed up to: {:?}", backup_path))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let mut data_path = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
            let mut settings_path = data_path.clone();
            
            data_path.push("games.json");
            settings_path.push("settings.json");
            
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
            get_games, 
            add_game, 
            launch_game, 
            scan_steam_games, 
            backup_saves,
            get_settings,
            set_pre_launch_hook,
            clear_pre_launch_hook,
            convert_to_direct_launch,
            set_cover_art,
            scan_local_folder,
            remove_game,
            update_game_size,
            read_image_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
