#!/usr/bin/env python3
"""Assemble the Flowo UGC vertical video (9:16) with voice, captions and Ken Burns."""

from __future__ import annotations

import asyncio
import math
import shutil
import struct
import subprocess
import wave
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
WORK = Path("/tmp/flowo-ugc")
STILLS_SRC = ROOT / "client" / "public" / "marketing" / "stills"
STILLS_FALLBACK = Path("/opt/cursor/artifacts/assets")
OUT_DIR = ROOT / "client" / "public" / "marketing"
ARTIFACTS = Path("/opt/cursor/artifacts")
FONT = "/usr/share/fonts/truetype/macos/Inter-Bold.ttf"
FONT_MED = "/usr/share/fonts/truetype/macos/Inter-SemiBold.ttf"

VOICE = "fr-FR-RemyMultilingualNeural"
RATE = "+10%"
PITCH = "-2Hz"

SCRIPT = (
    "Attends. Les devis, c'était mon cauchemar. "
    "WhatsApp, les papiers... j'oubliais toutes les relances. "
    "Et là... Flowo. "
    "Devis en trente secondes. Suivi des chantiers. Relances auto. "
    "J'ai récupéré huit heures par semaine. "
    "Si t'es plombier, teste Flowo. Sérieux."
)

# Phrase groups (lowercase match) → still filename
SCENE_STILLS = [
    ("attends", "ugc_flowo_point.png"),
    ("cauchemar", "ugc_flowo_hook.png"),
    ("devis", "ugc_flowo_hook.png"),
    ("whatsapp", "ugc_flowo_problem.png"),
    ("papiers", "ugc_flowo_problem.png"),
    ("relances", "ugc_flowo_problem.png"),
    ("là", "ugc_flowo_hook.png"),
    ("flowo", "ugc_flowo_hook.png"),
    ("trente", "ugc_flowo_phone.png"),
    ("secondes", "ugc_flowo_phone.png"),
    ("chantiers", "ugc_flowo_devis.png"),
    ("auto", "ugc_flowo_devis.png"),
    ("semaine", "ugc_flowo_win.png"),
    ("heures", "ugc_flowo_win.png"),
    ("plombier", "ugc_flowo_endcard.png"),
    ("teste", "ugc_flowo_endcard.png"),
    ("sérieux", "ugc_flowo_endcard.png"),
]

W, H, FPS = 1080, 1920, 30


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    print("+", " ".join(str(c) for c in cmd[:12]), "..." if len(cmd) > 12 else "")
    try:
        return subprocess.run(cmd, check=True, **kw)
    except subprocess.CalledProcessError as e:
        err = e.stderr
        if isinstance(err, bytes):
            err = err.decode("utf-8", "replace")
        if err:
            print(err[-3000:])
        raise


async def synth_voice(mp3: Path) -> list[dict]:
    communicate = edge_tts.Communicate(SCRIPT, VOICE, rate=RATE, pitch=PITCH)
    bounds: list[dict] = []
    with mp3.open("wb") as f:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] in {"WordBoundary", "SentenceBoundary"}:
                bounds.append(
                    {
                        "kind": chunk["type"],
                        "text": chunk["text"],
                        "t0": chunk["offset"] / 10_000_000,
                        "dur": chunk["duration"] / 10_000_000,
                    }
                )
    return bounds


def _split_sentence(text: str, t0: float, dur: float) -> list[dict]:
    """Break a TTS sentence into punchy 2–6 word UGC cards, preserving timing."""
    # keep ellipses as a split mark
    raw = text.replace("...", " … ").replace("...", " … ")
    parts: list[str] = []
    buf = ""
    for ch in raw:
        buf += ch
        if ch in {".", "!", "?", ",", "…"}:
            piece = buf.strip(" ,")
            if piece:
                parts.append(piece.strip())
            buf = ""
    if buf.strip():
        parts.append(buf.strip())

    cards: list[dict] = []
    # further split long parts by words
    refined: list[str] = []
    for p in parts:
        words = p.split()
        if len(words) <= 6:
            refined.append(p)
            continue
        chunk: list[str] = []
        for w in words:
            chunk.append(w)
            if len(chunk) >= 4:
                refined.append(" ".join(chunk))
                chunk = []
        if chunk:
            refined.append(" ".join(chunk))

    weights = [max(len(p.split()), 1) for p in refined]
    total_w = sum(weights) or 1
    cursor = t0
    for p, w in zip(refined, weights):
        d = dur * (w / total_w)
        cards.append({"text": p.strip(), "t0": cursor, "t1": cursor + d})
        cursor += d
    return cards or [{"text": text, "t0": t0, "t1": t0 + dur}]


def group_captions(bounds: list[dict]) -> list[dict]:
    words = [b for b in bounds if b["kind"] == "WordBoundary"]
    sentences = [b for b in bounds if b["kind"] == "SentenceBoundary"]
    cards: list[dict] = []
    if words:
        buf: list[dict] = []

        def flush() -> None:
            if not buf:
                return
            text = " ".join(w["text"] for w in buf)
            text = text.replace(" .", ".").replace(" ,", ",").replace(" ...", "...")
            cards.append({"text": text, "t0": buf[0]["t0"], "t1": buf[-1]["t0"] + buf[-1]["dur"]})
            buf.clear()

        for w in words:
            token = w["text"]
            buf.append(w)
            end_punct = token.endswith((".", "...", "?", "!"))
            hard = token.lower().rstrip(".,!?") in {"flowo", "sérieux", "attends"}
            if end_punct or hard or len(buf) >= 5:
                flush()
        flush()
    else:
        for s in sentences:
            cards.extend(_split_sentence(s["text"], s["t0"], s["dur"]))

    for i, c in enumerate(cards):
        nxt = cards[i + 1]["t0"] if i + 1 < len(cards) else c["t1"] + 0.45
        c["t1"] = min(c["t1"] + 0.12, nxt - 0.03)
        if c["t1"] <= c["t0"]:
            c["t1"] = c["t0"] + 0.35
    return cards


def still_for_time(t: float, words: list[dict]) -> str:
    spoken = [w for w in words if w["t0"] <= t + 0.02]
    if not spoken:
        return SCENE_STILLS[0][1]
    low = spoken[-1]["text"].lower()
    chosen = SCENE_STILLS[0][1]
    matched = False
    for key, still in SCENE_STILLS:
        if key in low:
            chosen = still
            matched = True
    if not matched and len(spoken) >= 2:
        return still_for_time(spoken[-2]["t0"], words)
    return chosen


def build_scenes(words: list[dict], audio_dur: float) -> list[tuple[str, float, float]]:
    """Split the timeline into contiguous still shots."""
    # sample every 80ms to detect still changes
    cuts: list[tuple[str, float]] = []
    last = None
    t = 0.0
    while t < audio_dur:
        still = still_for_time(t, words)
        if still != last:
            cuts.append((still, t))
            last = still
        t += 0.08
    scenes: list[tuple[str, float, float]] = []
    for i, (still, t0) in enumerate(cuts):
        t1 = cuts[i + 1][1] if i + 1 < len(cuts) else audio_dur
        if t1 - t0 < 0.45 and scenes:
            # merge micro-cuts into previous
            prev = scenes[-1]
            scenes[-1] = (prev[0], prev[1], t1)
        else:
            scenes.append((still, t0, t1))
    # hold endcard a bit after voice
    last = scenes[-1]
    scenes[-1] = (last[0], last[1], audio_dur + 2.4)
    return scenes


def ass_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")


def write_ass(path: Path, cards: list[dict], total: float) -> None:
    # TikTok-style: huge white text, fat black outline, lower-center
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Inter,{62},&H00FFFFFF,&H000000FF,&H00101010,&H80000000,-1,0,0,0,100,100,0,0,1,6,0,2,64,64,400,1
Style: CaptionEnd,Inter,{58},&H00FFFFFF,&H000000FF,&H00101010,&H80000000,-1,0,0,0,100,100,0,0,1,6,0,2,64,64,360,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    def ts(sec: float) -> str:
        sec = max(0.0, sec)
        h = int(sec // 3600)
        m = int((sec % 3600) // 60)
        s = sec % 60
        return f"{h}:{m:02d}:{s:05.2f}"

    def wrap(text: str) -> str:
        words = text.split()
        if len(words) <= 3:
            return text
        if len(words) == 4:
            return " ".join(words[:2]) + r"\N" + " ".join(words[2:])
        mid = (len(words) + 1) // 2
        return " ".join(words[:mid]) + r"\N" + " ".join(words[mid:])

    lines = [header]
    end_t = max(
        (
            c["t0"]
            for c in cards
            if "plombier" in c["text"].lower()
            or "teste" in c["text"].lower()
            or "sérieux" in c["text"].lower()
        ),
        default=total,
    )
    for c in cards:
        raw = wrap(ass_escape(c["text"]).upper())
        raw = raw.replace("FLOWO", "Flowo")
        style = "CaptionEnd" if c["t0"] >= end_t - 0.05 else "Caption"
        lines.append(
            f"Dialogue: 1,{ts(c['t0'])},{ts(c['t1'])},{style},,0,0,0,,{raw}"
        )
    path.write_text("".join(line if line.endswith("\n") else line + "\n" for line in lines), encoding="utf-8")


def write_music(path: Path, duration: float, sr: int = 44100) -> None:
    """Quiet warm lo-fi bed under the voice (C – G – Am – F)."""
    n = int(sr * duration)
    bpm = 96
    beat = 60.0 / bpm
    chords = [
        [130.81, 164.81, 196.00],  # C
        [196.00, 246.94, 293.66],  # G
        [220.00, 261.63, 329.63],  # Am
        [174.61, 220.00, 261.63],  # F
    ]
    samples = []
    for i in range(n):
        t = i / sr
        bar = int(t / (beat * 4)) % 4
        env = 0.55 + 0.45 * math.sin(2 * math.pi * t / 8)
        # kick on 1 and 3
        pos = t % (beat * 2)
        kick = math.exp(-pos * 18) * math.sin(2 * math.pi * 58 * t) if pos < 0.25 else 0.0
        snap_pos = (t + beat) % (beat * 2)
        snap = math.exp(-snap_pos * 40) * (1 if (hash(i // 17) % 3) else -1) * 0.08 if snap_pos < 0.08 else 0.0
        pad = 0.0
        for f in chords[bar]:
            pad += 0.07 * math.sin(2 * math.pi * f * t) * env
            pad += 0.03 * math.sin(2 * math.pi * f * 2 * t) * env
        # vinyl-ish hiss
        hiss = ((hash((i * 1103515245 + 12345) & 0x7FFFFFFF) / 0x7FFFFFFF) - 0.5) * 0.012
        v = 0.22 * pad + 0.16 * kick + snap + hiss
        # fade in/out
        if t < 0.4:
            v *= t / 0.4
        if t > duration - 0.8:
            v *= max(0.0, (duration - t) / 0.8)
        samples.append(int(max(-0.95, min(0.95, v)) * 22000))

    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(b"".join(struct.pack("<h", s) for s in samples))


def ken_burns_clip(src: Path, dst: Path, duration: float, zoom_dir: int) -> None:
    frames = max(int(round(duration * FPS)), 2)
    z_end = 1.12 if zoom_dir >= 0 else 1.0
    z_start = 1.0 if zoom_dir >= 0 else 1.12
    # zoompan z is a per-frame expression; start from z_start
    z_delta = (z_end - z_start) / max(frames - 1, 1)
    vf = (
        f"scale=1200:2133:force_original_aspect_ratio=increase,"
        f"crop=1200:2133,"
        f"zoompan=z='{z_start}+{z_delta}*on':"
        f"x='iw/2-(iw/zoom/2)':"
        f"y='ih/2-(ih/zoom/2)-80':"
        f"d={frames}:s={W}x{H}:fps={FPS},"
        f"format=yuv420p"
    )
    proc = subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            str(src),
            "-vf",
            vf,
            "-t",
            f"{duration:.3f}",
            "-r",
            str(FPS),
            "-pix_fmt",
            "yuv420p",
            "-an",
            str(dst),
        ],
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        print(proc.stderr[-2500:])
        # fallback: static scaled still
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-loop",
                "1",
                "-i",
                str(src),
                "-vf",
                f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},format=yuv420p",
                "-t",
                f"{duration:.3f}",
                "-r",
                str(FPS),
                "-pix_fmt",
                "yuv420p",
                "-an",
                str(dst),
            ],
            check=True,
            capture_output=True,
        )


def probe_duration(path: Path) -> float:
    out = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=nw=1:nk=1",
            str(path),
        ],
        text=True,
    ).strip()
    return float(out)


def main() -> None:
    if WORK.exists():
        shutil.rmtree(WORK)
    WORK.mkdir(parents=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ARTIFACTS.mkdir(parents=True, exist_ok=True)

    mp3 = WORK / "voice.mp3"
    print("Synthesizing voice…")
    words = asyncio.run(synth_voice(mp3))
    if not words:
        raise SystemExit("No word timestamps from TTS")
    voice_dur = probe_duration(mp3)
    print(f"Voice: {voice_dur:.2f}s, {len(words)} cues")
    for w in words:
        print(f"  {w['t0']:.2f}  [{w.get('kind','')}] {w['text']}")

    cards = group_captions(words)
    scenes = build_scenes(words, voice_dur)
    total = scenes[-1][2]
    print("Scenes:")
    for still, t0, t1 in scenes:
        print(f"  {t0:5.2f}-{t1:5.2f}  {still}")

    ass_path = WORK / "captions.ass"
    write_ass(ass_path, cards, total)
    music_path = WORK / "bed.wav"
    write_music(music_path, total + 0.3)

    clips: list[Path] = []
    for i, (still, t0, t1) in enumerate(scenes):
        src = STILLS_SRC / still
        if not src.exists():
            src = STILLS_FALLBACK / still
        if not src.exists():
            raise SystemExit(f"Missing still {still}")
        dst = WORK / f"clip_{i:02d}.mp4"
        ken_burns_clip(src, dst, t1 - t0, zoom_dir=1 if i % 2 == 0 else -1)
        clips.append(dst)

    concat_list = WORK / "concat.txt"
    concat_list.write_text("".join(f"file '{c}'\n" for c in clips))
    silent = WORK / "silent.mp4"
    run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_list),
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-r",
            str(FPS),
            str(silent),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    burned = WORK / "burned.mp4"
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(silent),
            "-vf",
            f"ass={ass_path}:fontsdir=/usr/share/fonts/truetype/macos",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            str(burned),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    mixed = WORK / "mixed.mp4"
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(burned),
            "-i",
            str(mp3),
            "-i",
            str(music_path),
            "-filter_complex",
            "[1:a]loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.08,apad=pad_dur=4[voice];"
            "[2:a]volume=0.14,afade=t=in:st=0:d=0.4,afade=t=out:st="
            + f"{max(total - 1.2, 0):.2f}"
            + ":d=1.1[bed];"
            "[voice][bed]amix=inputs=2:duration=longest:dropout_transition=0,atrim=0:"
            + f"{total:.3f}"
            + ",asetpts=PTS-STARTPTS[a]",
            "-map",
            "0:v",
            "-map",
            "[a]",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-ar",
            "44100",
            "-ac",
            "1",
            "-t",
            f"{total:.3f}",
            "-movflags",
            "+faststart",
            str(mixed),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    out = OUT_DIR / "flowo-ugc.mp4"
    shutil.copy2(mixed, out)
    artifact = ARTIFACTS / "flowo_ugc_plombier.mp4"
    shutil.copy2(mixed, artifact)
    poster = OUT_DIR / "flowo-ugc-poster.jpg"
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(out),
            "-ss",
            "1.2",
            "-frames:v",
            "1",
            "-q:v",
            "3",
            str(poster),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    shutil.copy2(poster, ARTIFACTS / "flowo_ugc_poster.jpg")
    print(f"Wrote {out} ({out.stat().st_size / 1e6:.1f} MB), duration {probe_duration(out):.2f}s")


if __name__ == "__main__":
    main()
