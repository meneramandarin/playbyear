"""Animate the ImageGen drum layers into a single-play, transparent hero GIF.

Run with Python and Pillow. ImageGen created the body by removing both sticks,
and isolated each stick and the asterisk on the same transparent canvas.
"""

from pathlib import Path
import math

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
LAYERS = ROOT / "Assets" / "drum-animation"
SIZE = (756, 520)
body = Image.open(LAYERS / "body-no-asterisk.png").convert("RGBA").resize(SIZE, Image.Resampling.LANCZOS)
left = Image.open(LAYERS / "stick-left.png").convert("RGBA").resize(SIZE, Image.Resampling.LANCZOS)
right = Image.open(LAYERS / "stick-right.png").convert("RGBA").resize(SIZE, Image.Resampling.LANCZOS)
asterisk = Image.open(LAYERS / "asterisk.png").convert("RGBA").resize(SIZE, Image.Resampling.LANCZOS)
asterisk_bounds = asterisk.getchannel("A").point(lambda alpha: 255 if alpha > 128 else 0).getbbox()
asterisk_center = ((asterisk_bounds[0] + asterisk_bounds[2]) / 2,
                   (asterisk_bounds[1] + asterisk_bounds[3]) / 2)


def stroke(time, start):
    """Lift, strike, bounce, and settle over 300 ms."""
    phase = time - start
    keys = [(0, 0), (0.09, 25), (0.16, -3), (0.21, 11), (0.30, 0)]
    for (a, x), (b, y) in zip(keys, keys[1:]):
        if a <= phase < b:
            ease = (1 - math.cos(math.pi * (phase - a) / (b - a))) / 2
            return x + (y - x) * ease
    return 0


def spin_angle(time):
    """One clockwise turn after drumming, easing into an exact final rest."""
    progress = (time - 1.6) / 0.5
    if not 0 < progress < 1:
        return 0
    return -360 * progress * progress * (3 - 2 * progress)


def pose(time):
    frame = body.copy()
    frame.alpha_composite(asterisk.rotate(spin_angle(time), Image.Resampling.BICUBIC,
                                         center=asterisk_center))
    left_angle = stroke(time, 0.35) + stroke(time, 0.97)
    right_angle = -stroke(time, 0.57) - stroke(time, 1.19)
    frame.alpha_composite(left.rotate(left_angle, Image.Resampling.BICUBIC, center=(244, 109)))
    frame.alpha_composite(right.rotate(right_angle, Image.Resampling.BICUBIC, center=(524, 163)))
    return frame


# A shared palette avoids flickering halftone colors. Reserve index 255 for
# transparency, with soft edge colors matted to the site's cream background.
cream = Image.new("RGB", SIZE, "#FAF8F5")
idle = pose(0)
matte = cream.copy()
matte.paste(idle, mask=idle.getchannel("A"))
palette = matte.quantize(colors=255, method=Image.Quantize.MEDIANCUT)


def gif_frame(rgba):
    rgb = cream.copy()
    rgb.paste(rgba, mask=rgba.getchannel("A"))
    indexed = rgb.quantize(palette=palette, dither=Image.Dither.NONE)
    indexed.paste(255, mask=rgba.getchannel("A").point(lambda alpha: 255 if alpha < 128 else 0))
    indexed.info["transparency"] = 255
    return indexed


# Let the hero's 1.1-second entrance finish before the first stick lifts.
# Sample the eight-spoke asterisk at 50 fps so its fast rotation reads clearly
# rather than appearing to turn backwards from temporal aliasing.
times = [t / 20 for t in range(52)] + [2.6 + t / 50 for t in range(26)] + [3.12]
durations = [50] * 52 + [20] * 26 + [500]
frames = [gif_frame(pose(time - 1)) for time in times]
frames[0].save(
    ROOT / "Assets" / "drum-da-dum.gif",
    save_all=True,
    append_images=frames[1:],
    duration=durations,
    disposal=2,
    transparency=255,
    background=255,
    optimize=False,
    # Omit loop entirely: GIF playback defaults to once, holding the last frame.
)
with Image.open(ROOT / "Assets" / "drum-da-dum.gif") as gif:
    assert "loop" not in gif.info, "Hero GIF must play only once"
    first_frame = gif.convert("RGBA").tobytes()
    gif.seek(gif.n_frames - 1)
    assert gif.convert("RGBA").tobytes() == first_frame, "Animation must settle into its original pose"
    duration = 0
    for frame in range(gif.n_frames):
        gif.seek(frame)
        duration += gif.info["duration"]
    print(f"Created {gif.n_frames} frames, {duration} ms, single play")
