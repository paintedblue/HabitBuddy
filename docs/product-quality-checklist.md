# Product Quality QA Checklist

## Automated Gate

Run these before tablet QA:

```bash
npm --workspace apps/api run typecheck
npm --workspace apps/api run test
npm --workspace apps/web run typecheck
npm --workspace apps/web run test
npm --workspace apps/web run qa:assets
npm --workspace apps/web run build
```

For live music generation:

```bash
npm --workspace apps/api run smoke:live-song
```

## Routine Song Playback

- Create or sync an approved Suno song with `streamAudioUrl` or `audioUrl`.
- Start a routine with that song and confirm the generated song plays instead of the fallback tone loop.
- Pause, resume, add 30 seconds, complete, and return home. Confirm no duplicate or lingering audio remains.
- Start queued, generating, and failed songs from the picker. Confirm they are visibly blocked and the button text explains the state.
- Confirm lyric section tags such as `[Verse]` and `[Chorus]` do not show during routine playback.

## Research Session Export

- Complete one routine and view the stamp board.
- Export JSON and CSV from the research session log controls.
- Confirm the file names match `habitbuddy-sessions-YYYY-MM-DD.json` and `.csv`.
- Confirm exported data includes `session_started`, `cue_started`, `routine_started`, `routine_completed`, and `reward_viewed` when those actions occurred.
- Confirm an empty session list disables export buttons.

## 3D Habit Animation

- Brush: bathroom background, brushing character asset, nonblank canvas.
- Wash: bathroom background, hand-washing character asset, nonblank canvas.
- Veggie: main room, eating character asset, nonblank canvas.
- Tidy and clothes: main room, mopping character asset, nonblank canvas.
- Reward: dancing character with confetti.
- Watch the console for missing texture, missing animation clip, GLB/FBX load, and WebGL context errors.

## Tablet Layout QA

Check iPad 10/11/12.9 landscape and portrait, Android tablet Chrome, and desktop Chrome.

- Auth, profile wizard, melody picker, song result, routine picker, routine playback, parent check, reward, and stamp board screens.
- No text overlap, clipped buttons, unreadable labels, or incoherent card stacking.
- Touch targets are at least 42px high on tablet.
- The routine timer, active lyric, and pause button remain visible.
- PWA reload and browser refresh keep local profile, songs, and sessions.

## Failure States

- API offline during lyrics generation: user sees fallback/default lyrics or a clear failure message.
- Suno request failure: the song generation area shows action-oriented failure copy.
- Sync failure: queued/generating song remains visible and retry polling continues without crashing.
- Reference MP3 public URL failure: live smoke fails before Suno request.
- Audio autoplay blocked: routine falls back to tone loop and remains usable.
- Missing internal reference music: the style is visibly marked as unavailable and cannot start Suno generation.

## Acceptance

- All automated gates pass.
- One live Suno-generated approved song is saved in PostgreSQL and playable in a routine.
- Session export downloads valid JSON and CSV.
- Every habit renders an expected 3D animation path without a blank canvas.
- Tablet QA finds no blocking layout, audio, network, or state recovery issue.
