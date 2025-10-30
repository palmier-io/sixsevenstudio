use crate::commands::video_editor::types::TimelineClip;
use crate::commands::video_editor::ffmpeg::ffmpeg::run_ffmpeg;
use crate::commands::video_editor::ffmpeg::filters::build_transition_filter;
use tauri::AppHandle;
use std::path::Path;

// Encoding constants - made public for reuse across modules
const VIDEO_CODEC: &str = "libx264";
const VIDEO_PRESET: &str = "superfast";
const VIDEO_CRF: &str = "23";
const AUDIO_CODEC: &str = "aac";
const AUDIO_BITRATE: &str = "128k";

/// Trim a video segment using codec copy (no re-encoding)
pub async fn trim_segment(
    app: &AppHandle,
    input: &str,
    start: f64,
    end: f64,
    output: &Path,
) -> Result<(), String> {
    let duration = end - start;
    let args = [
        "-ss",
        &start.to_string(),
        "-i",
        input,
        "-t",
        &duration.to_string(),
        "-c",
        "copy",
        "-y",
        output.to_str().ok_or("Invalid output path")?,
    ];
    run_ffmpeg(app, &args, "trim video").await
}


/// Concatenate videos using codec copy (no re-encoding) - fast path
pub async fn concatenate_fast(
    app: &AppHandle,
    clips: &[TimelineClip],
    output: &Path,
    temp_dir: &Path,
) -> Result<(), String> {
    if clips.is_empty() {
        return Err("No clips to concatenate".into());
    }

    // Create temporary trimmed clips
    let mut temp_files = Vec::new();
    let mut concat_list = String::new();

    for (i, clip) in clips.iter().enumerate() {
        let temp_file = temp_dir.join(format!("clip_{}.mp4", i));
        trim_segment(app, &clip.video_path, clip.trim_start, clip.trim_end, &temp_file).await?;
        temp_files.push(temp_file.clone());
        concat_list.push_str(&format!("file '{}'\n", temp_file.display()));
    }

    // Write concat list file
    let list_file = temp_dir.join("concat_list.txt");
    std::fs::write(&list_file, concat_list)
        .map_err(|e| format!("Failed to write concat list: {}", e))?;

    // Concatenate using concat demuxer with codec copy (no re-encoding)
    let args = [
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        list_file.to_str().ok_or("Invalid concat file path")?,
        "-c",
        "copy",
        "-y",
        output.to_str().ok_or("Invalid output path")?,
    ];

    run_ffmpeg(app, &args, "concatenate videos").await?;

    // Clean up temp files (best effort)
    for temp_file in temp_files {
        let _ = std::fs::remove_file(temp_file);
    }
    let _ = std::fs::remove_file(list_file);

    Ok(())
}

/// Concatenate videos with transitions not using xfade filter (requires re-encoding)
pub async fn concatenate_with_transitions(
    app: &AppHandle,
    clips: &[TimelineClip],
    output: &Path,
    temp_dir: &Path,
) -> Result<(), String> {
    if clips.is_empty() {
        return Err("No clips to concatenate".into());
    }

    if clips.len() == 1 {
        // Single clip - just trim it
        return trim_segment(
            app,
            &clips[0].video_path,
            clips[0].trim_start,
            clips[0].trim_end,
            output,
        )
        .await;
    }

    // Create temporary trimmed and re-encoded clips
    let mut temp_files = Vec::new();
    for (i, clip) in clips.iter().enumerate() {
        let temp_file = temp_dir.join(format!("clip_{}.mp4", i));
        let duration = clip.trim_end - clip.trim_start;

        let args = [
            "-ss",
            &clip.trim_start.to_string(),
            "-i",
            &clip.video_path,
            "-t",
            &duration.to_string(),
            "-c:v",
            VIDEO_CODEC,
            "-preset",
            VIDEO_PRESET,
            "-crf",
            VIDEO_CRF,
            "-c:a",
            AUDIO_CODEC,
            "-b:a",
            AUDIO_BITRATE,
            "-y",
            temp_file.to_str().ok_or("Invalid temp file path")?,
        ];

        run_ffmpeg(app, &args, &format!("prepare clip {}", clip.id)).await?;
        temp_files.push(temp_file);
    }

    // Build filter complex for transitions
    let filter_complex = build_transition_filter(clips)?;

    // Build FFmpeg arguments
    let mut args: Vec<String> = Vec::new();

    // Add all input files
    for temp_file in &temp_files {
        args.push("-i".into());
        args.push(temp_file.to_string_lossy().into_owned());
    }

    args.extend([
        "-filter_complex".into(),
        filter_complex,
        "-map".into(),
        "[out]".into(), // Video output
        "-map".into(),
        "[outa]".into(), // Audio output
        "-c:v".into(),
        VIDEO_CODEC.into(),
        "-preset".into(),
        VIDEO_PRESET.into(),
        "-crf".into(),
        VIDEO_CRF.into(),
        "-c:a".into(),
        AUDIO_CODEC.into(),
        "-b:a".into(),
        AUDIO_BITRATE.into(),
        "-y".into(),
        output.to_string_lossy().into_owned(),
    ]);

    let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
    run_ffmpeg(app, &args_ref, "concatenate with transitions").await?;

    // Clean up temp files (best effort)
    for temp_file in temp_files {
        let _ = std::fs::remove_file(temp_file);
    }

    Ok(())
}

