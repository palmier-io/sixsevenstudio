use crate::commands::video_editor::types::TimelineClip;

/// Build FFmpeg filter_complex for xfade transitions + synchronized audio mixing
/// 
/// **Video transitions:** Each clip overlaps with the next during transition. The `xfade` offset
/// marks where the transition starts within the first clip's timeline.
/// 
/// ```
/// Timeline: [====|] [====|] [====]
/// Clip 0:   [====|--]      (transition at offset = duration - transition_duration)
/// Clip 1:         [====|--] (offset = cumulative_offset + duration - transition_duration)
/// Clip 2:               [====]
/// ```
/// 
/// **Audio sync:** Each track is trimmed (remove overlap), delayed (align with timeline position),
/// padded (extend to total duration), then mixed together.
/// 
/// ```
/// Track 0: [====|] → [wait][====] → [====|pad]
/// Track 1:       [====|] → [wait][====] → [====|pad]
/// Track 2:             [====] → [====] → [====]
///                          ↓ mix ↓
///                      [mixed output]
/// ```
/// 
/// **Key formulas:**
/// - `offset_i = cumulative_offset + clip.duration - transition_duration`
/// - `total_duration = Σ(duration - transition) + last_clip.duration`
/// - `audio_pad = total_duration - (cumulative_offset + trimmed_duration)`
pub fn build_transition_filter(clips: &[TimelineClip]) -> Result<String, String> {
    if clips.len() < 2 {
        return Err("At least two clips are required for transitions".into());
    }

    let mut filter_parts = Vec::new();
    
    // Build video transition filters
    let video_filters = build_video_transition_filters(clips);
    filter_parts.extend(video_filters);
    
    // Build audio synchronization filters
    let audio_filters = build_audio_sync_filters(clips)?;
    filter_parts.extend(audio_filters);

    Ok(filter_parts.join("; "))
}

// ============================================================================
// Video Transition Math
// ============================================================================

/// Calculate cumulative offset up to clip index i
/// Formula: Σ(j=0 to i-1)(clip_j.duration - transition_j.duration)
fn calculate_cumulative_offset(clips: &[TimelineClip], up_to_index: usize) -> f64 {
    clips.iter()
        .take(up_to_index)
        .map(|clip| {
            let transition_duration = clip.transition_duration.unwrap_or(1.0);
            clip.duration - transition_duration
        })
        .sum()
}

/// Calculate xfade offset for transition between clip i and i+1
/// Formula: offset_i = cumulative_offset + clip.duration - transition_duration
fn calculate_transition_offset(clips: &[TimelineClip], clip_index: usize) -> f64 {
    let clip = &clips[clip_index];
    let transition_duration = clip.transition_duration.unwrap_or(1.0);
    let cumulative_offset = calculate_cumulative_offset(clips, clip_index);
    cumulative_offset + clip.duration - transition_duration
}

/// Build video xfade transition filters
fn build_video_transition_filters(clips: &[TimelineClip]) -> Vec<String> {
    let mut filters = Vec::new();
    let mut current_label = String::from("0:v");

    for i in 0..clips.len() - 1 {
        let clip = &clips[i];
        let transition_type = clip
            .transition_type
            .as_ref()
            .map(|s| s.as_str())
            .unwrap_or("fade");
        let transition_duration = clip.transition_duration.unwrap_or(1.0);
        let offset = calculate_transition_offset(clips, i);

        let next_input = format!("{}:v", i + 1);
        let output_label = if i == clips.len() - 2 {
            String::from("out")
        } else {
            format!("v{}", i)
        };

        filters.push(format!(
            "[{}][{}]xfade=transition={}:duration={}:offset={}[{}]",
            current_label, next_input, transition_type, transition_duration, offset, output_label
        ));

        current_label = output_label;
    }

    filters
}

// ============================================================================
// Audio Synchronization Math
// ============================================================================

/// Calculate total timeline duration
/// Formula: Σ(i=0 to n-2)(clip_i.duration - transition_i.duration) + clip_n-1.duration
fn calculate_total_duration(clips: &[TimelineClip]) -> f64 {
    clips.iter().enumerate().fold(0.0, |acc, (idx, clip)| {
        let transition_duration = clip.transition_duration.unwrap_or(1.0);
        if idx == clips.len() - 1 {
            acc + clip.duration
        } else {
            acc + clip.duration - transition_duration
        }
    })
}

/// Calculate trimmed audio duration for clip i
/// Formula: trimmed_duration = clip.duration - transition_duration
fn calculate_trimmed_duration(clip: &TimelineClip) -> f64 {
    let transition_duration = clip.transition_duration.unwrap_or(1.0);
    clip.duration - transition_duration
}

/// Calculate clip end time in timeline
/// Formula: clip_end_time = cumulative_offset + trimmed_duration
fn calculate_clip_end_time(clips: &[TimelineClip], clip_index: usize) -> f64 {
    let clip = &clips[clip_index];
    let cumulative_offset = calculate_cumulative_offset(clips, clip_index);
    let trimmed_duration = if clip_index < clips.len() - 1 {
        calculate_trimmed_duration(clip)
    } else {
        clip.duration
    };
    cumulative_offset + trimmed_duration
}

/// Calculate audio padding duration for clip i
/// Formula: pad_i = total_duration - clip_end_i
fn calculate_audio_padding(clips: &[TimelineClip], clip_index: usize) -> f64 {
    let total_duration = calculate_total_duration(clips);
    let clip_end_time = calculate_clip_end_time(clips, clip_index);
    total_duration - clip_end_time
}

/// Build audio synchronization filters (trim → delay → pad → mix)
fn build_audio_sync_filters(clips: &[TimelineClip]) -> Result<Vec<String>, String> {
    let mut filters = Vec::new();
    let mut audio_labels = Vec::new();

    for (i, clip) in clips.iter().enumerate() {
        let mut processed_label = format!("{}:a", i);

        // Step 1: Trim (remove overlapped portion)
        if i < clips.len() - 1 {
            let trimmed_duration = calculate_trimmed_duration(clip);
            let trimmed_label = format!("atrim{}", i);
            filters.push(format!(
                "[{}]atrim=0:{}[{}]",
                processed_label, trimmed_duration, trimmed_label
            ));
            processed_label = trimmed_label;
        }

        // Step 2: Delay (align with timeline position)
        let cumulative_offset = calculate_cumulative_offset(clips, i);
        if cumulative_offset > 0.0 {
            let delayed_label = format!("adelay{}", i);
            let delay_ms = (cumulative_offset * 1000.0) as i64;
            filters.push(format!(
                "[{}]adelay={}|{}[{}]",
                processed_label, delay_ms, delay_ms, delayed_label
            ));
            processed_label = delayed_label;
        }

        // Step 3: Pad (extend to total duration)
        let pad_duration = calculate_audio_padding(clips, i);
        if pad_duration > 0.0 {
            let final_label = format!("apadend{}", i);
            filters.push(format!(
                "[{}]apad=pad_dur={}[{}]",
                processed_label, pad_duration, final_label
            ));
            processed_label = final_label;
        }

        audio_labels.push(processed_label);
    }

    // Step 4: Mix all padded audio tracks
    let audio_inputs: String = audio_labels
        .iter()
        .map(|label| format!("[{}]", label))
        .collect();
    filters.push(format!(
        "{}amix=inputs={}:duration=longest:dropout_transition=0[outa]",
        audio_inputs,
        clips.len()
    ));

    Ok(filters)
}

