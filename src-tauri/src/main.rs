// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::fs::File;
use std::sync::Mutex;
use tauri::Manager;
use regex::Regex;
use vibrato::{Dictionary, Tokenizer};

// アプリケーションの状態としてTokenizerを保持
pub struct AppState {
    tokenizer: Mutex<Tokenizer>,
}

// フロントエンドに渡すためのデータ構造
#[derive(serde::Serialize, Clone)]
struct Variant {
    word: String,
    count: usize,
}

#[derive(serde::Serialize, Clone)]
struct WordGroup {
    reading: String,
    primary_word: String,
    total_count: usize,
    variants: Vec<Variant>,
}

#[derive(serde::Serialize, Clone)]
struct Sentence {
    text: String,
    line_num: usize,
}

#[derive(serde::Serialize)]
struct AnalyzedData {
    grouped_tokens: HashMap<String, Vec<WordGroup>>,
    sentences: Vec<Sentence>,
    sentence_map: HashMap<String, Vec<usize>>,
}

fn get_display_category(feature_str: &str) -> String {
    let details: Vec<&str> = feature_str.split(',').collect();
    let pos_major = details.get(0).cloned().unwrap_or_default();
    if pos_major == "名詞" {
        if let Some(pos_detail1) = details.get(1) {
            if *pos_detail1 == "固有名詞" {
                if let Some(pos_detail2) = details.get(2) {
                    if *pos_detail2 == "人名" {
                        return "人名".to_string();
                    }
                }
                return "固有名詞".to_string();
            }
        }
    }
    pos_major.to_string()
}

#[tauri::command]
fn analyze_text(text: &str, state: tauri::State<AppState>) -> Result<AnalyzedData, String> {
    let mut tokenizer_guard = state.tokenizer.lock().unwrap();
    let mut worker = tokenizer_guard.new_worker();

    // 1. Regexを使い、文のリストと各文の終了文字位置を計算
    let re = Regex::new(r"[。？！\n]").map_err(|e| e.to_string())?;
    let mut sentences_with_meta = Vec::new();
    let mut sentence_char_ends: Vec<usize> = Vec::new();
    let mut last_char_pos = 0;
    let mut line_count = 1;

    for mat in re.find_iter(text) {
        let sentence_text = &text[last_char_pos..mat.end()];
        if !sentence_text.trim().is_empty() {
            let start_line = text[..last_char_pos].chars().filter(|&c| c == '\n').count() + 1;
            sentences_with_meta.push(Sentence { text: sentence_text.to_string(), line_num: start_line });
            sentence_char_ends.push(mat.end());
        }
        last_char_pos = mat.end();
    }
    if last_char_pos < text.len() {
        let sentence_text = &text[last_char_pos..];
        if !sentence_text.trim().is_empty() {
            let start_line = text[..last_char_pos].chars().filter(|&c| c == '\n').count() + 1;
            sentences_with_meta.push(Sentence { text: sentence_text.to_string(), line_num: start_line });
            sentence_char_ends.push(text.chars().count());
        }
    }

    // 2. 表記揺れの集計
    worker.reset_sentence(text);
    worker.tokenize();
    
    let mut words_by_reading: HashMap<String, (HashMap<String, (usize, String)>, std::collections::BTreeSet<usize>)> = HashMap::new();
    for token in worker.token_iter() {
        let feature_str = token.feature();
        let details: Vec<&str> = feature_str.split(',').collect();
        let pos_major = details.get(0).cloned().unwrap_or_default();
        
        let basic_form = details.get(6).cloned().unwrap_or_default();
        let reading = details.get(7).cloned().unwrap_or(&"*").to_string();

        if basic_form == "*" || reading == "*" || ["助詞", "助動詞", "接続詞", "連体詞", "記号"].contains(&pos_major) {
            continue;
        }
        
        // ▼▼▼ `char_end()`を`range_char().start`に修正 ▼▼▼
        let token_start_pos = token.range_char().start;
        let sentence_idx = sentence_char_ends.iter().position(|&end_pos| token_start_pos < end_pos).unwrap_or(0);
        // ▲▲▲
        
        let surface_form = token.surface().to_string();
        let group = words_by_reading.entry(reading).or_insert_with(|| (HashMap::new(), std::collections::BTreeSet::new()));
        let variant = group.0.entry(surface_form).or_insert_with(|| (0, feature_str.to_string()));
        
        variant.0 += 1;
        group.1.insert(sentence_idx);
    }

    // 3. UI用のデータ構造に変換
    let mut grouped_by_pos = HashMap::new();
    let mut sentence_map = HashMap::new();
    for (reading, (variants_map, sentence_indices)) in words_by_reading {
        let mut variants_vec: Vec<_> = variants_map.into_iter().map(|(word, (count, feature_str))| (word, count, feature_str)).collect();
        variants_vec.sort_by(|a, b| b.1.cmp(&a.1));

        let total_count = variants_vec.iter().map(|v| v.1).sum();
        let representative_pos = get_display_category(&variants_vec[0].2);
        
        let word_group = WordGroup {
            reading: reading.clone(),
            primary_word: variants_vec[0].0.clone(),
            total_count,
            variants: variants_vec.into_iter().map(|(word, count, _)| Variant { word, count }).collect(),
        };

        grouped_by_pos.entry(representative_pos).or_insert_with(Vec::new).push(word_group.clone());
        sentence_map.insert(reading, sentence_indices.into_iter().collect());
    }
    
    // 4. ソート
    let mut sorted_grouped_tokens = HashMap::new();
    let mut sorted_pos_keys: Vec<_> = grouped_by_pos.keys().cloned().collect();
    sorted_pos_keys.sort(); 
    for pos in sorted_pos_keys {
        if let Some(groups) = grouped_by_pos.get_mut(&pos) {
            groups.sort_by(|a, b| a.reading.cmp(&b.reading));
            sorted_grouped_tokens.insert(pos, groups.to_vec());
        }
    }

    Ok(AnalyzedData {
        grouped_tokens: sorted_grouped_tokens,
        sentences: sentences_with_meta,
        sentence_map,
    })
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle().clone();

            let resource_path = app_handle.path().resource_dir()
                .expect("リソースディレクトリの取得に失敗しました。");

            let dict_path = resource_path.join("dict/system.dic.zst");
            let user_dict_path = resource_path.join("dict/user_dict.csv");

            let reader = zstd::Decoder::new(File::open(dict_path).unwrap()).unwrap();
            let dict = Dictionary::read(reader).unwrap();
            let dict = dict.reset_user_lexicon_from_reader(Some(File::open(user_dict_path).unwrap())).unwrap();

            let tokenizer = Tokenizer::new(dict);
                
            app.manage(AppState { tokenizer: Mutex::new(tokenizer) });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![analyze_text])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}