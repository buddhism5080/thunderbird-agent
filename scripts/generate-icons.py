#!/usr/bin/env python3
from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

CANVAS = 128.0
OUTPUT_SIZES = [16, 32, 48, 64, 96, 128]
ICON_DIR = Path(__file__).resolve().parent.parent / "extension" / "icons"


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return low if value < low else high if value > high else value


def smoothstep(edge0: float, edge1: float, x: float) -> float:
    if edge0 == edge1:
        return 0.0
    t = clamp((x - edge0) / (edge1 - edge0))
    return t * t * (3.0 - 2.0 * t)


def mix(a: tuple[float, float, float], b: tuple[float, float, float], t: float) -> tuple[float, float, float]:
    return tuple(a[i] * (1.0 - t) + b[i] * t for i in range(3))


def over(dst: tuple[float, float, float, float], src_rgb: tuple[float, float, float], src_a: float) -> tuple[float, float, float, float]:
    if src_a <= 0.0:
        return dst
    dr, dg, db, da = dst
    out_a = src_a + da * (1.0 - src_a)
    if out_a <= 1e-9:
        return (0.0, 0.0, 0.0, 0.0)
    out_r = (src_rgb[0] * src_a + dr * da * (1.0 - src_a)) / out_a
    out_g = (src_rgb[1] * src_a + dg * da * (1.0 - src_a)) / out_a
    out_b = (src_rgb[2] * src_a + db * da * (1.0 - src_a)) / out_a
    return (out_r, out_g, out_b, out_a)


def hex_rgb(value: str) -> tuple[float, float, float]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) / 255.0 for i in (0, 2, 4))


def rounded_rect_sdf(x: float, y: float, left: float, top: float, width: float, height: float, radius: float) -> float:
    cx = left + width / 2.0
    cy = top + height / 2.0
    qx = abs(x - cx) - (width / 2.0 - radius)
    qy = abs(y - cy) - (height / 2.0 - radius)
    ox = max(qx, 0.0)
    oy = max(qy, 0.0)
    outside = math.hypot(ox, oy)
    inside = min(max(qx, qy), 0.0)
    return outside + inside - radius


def point_in_polygon(x: float, y: float, points: list[tuple[float, float]]) -> bool:
    inside = False
    j = len(points) - 1
    for i, (xi, yi) in enumerate(points):
        xj, yj = points[j]
        intersects = ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-9) + xi)
        if intersects:
            inside = not inside
        j = i
    return inside


def distance_to_segment(px: float, py: float, ax: float, ay: float, bx: float, by: float) -> float:
    vx = bx - ax
    vy = by - ay
    wx = px - ax
    wy = py - ay
    length_sq = vx * vx + vy * vy
    if length_sq <= 1e-9:
        return math.hypot(px - ax, py - ay)
    t = clamp((wx * vx + wy * vy) / length_sq)
    proj_x = ax + t * vx
    proj_y = ay + t * vy
    return math.hypot(px - proj_x, py - proj_y)


def polygon_alpha(x: float, y: float, points: list[tuple[float, float]], aa: float = 0.9) -> float:
    if not point_in_polygon(x, y, points):
        return 0.0
    min_dist = min(
        distance_to_segment(x, y, points[i][0], points[i][1], points[(i + 1) % len(points)][0], points[(i + 1) % len(points)][1])
        for i in range(len(points))
    )
    return smoothstep(0.0, aa, min_dist)


def stroke_alpha(x: float, y: float, points: list[tuple[float, float]], width: float, aa: float = 0.85) -> float:
    radius = width / 2.0
    min_dist = min(
        distance_to_segment(x, y, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1])
        for i in range(len(points) - 1)
    )
    return smoothstep(radius + aa, radius - aa, min_dist)


def radial_alpha(x: float, y: float, cx: float, cy: float, radius: float, strength: float) -> float:
    d = math.hypot(x - cx, y - cy)
    if d >= radius:
        return 0.0
    t = 1.0 - d / radius
    return strength * t * t


BG_A = hex_rgb("#0f3f97")
BG_B = hex_rgb("#155fcb")
BG_C = hex_rgb("#21b8ff")
MAIL_A = hex_rgb("#ffffff")
MAIL_B = hex_rgb("#e8f3ff")
FLAP_A = hex_rgb("#ffffff")
FLAP_B = hex_rgb("#dcecff")
BOLT_A = hex_rgb("#18d8ff")
BOLT_B = hex_rgb("#2d63ff")
MAIL_OUTLINE = hex_rgb("#cfe2ff")
SEAM = hex_rgb("#1a53b3")
FOLD = hex_rgb("#d6e8ff")
SHADOW = hex_rgb("#08275f")
BOLT_SHADOW = hex_rgb("#0b367e")
WHITE = hex_rgb("#ffffff")

FLAP_POINTS = [(22.0, 38.0), (64.0, 66.0), (106.0, 38.0)]
BOLT_POINTS = [(66.0, 68.0), (78.0, 68.0), (68.0, 81.0), (77.0, 81.0), (56.0, 98.0), (62.0, 84.0), (52.0, 84.0)]
BOLT_POINTS_SHADOW = [(x + 1.5, y + 1.5) for x, y in BOLT_POINTS]
SEAM_POINTS = [(22.0, 38.0), (64.0, 66.0), (106.0, 38.0)]
LEFT_FOLD = [(22.0, 86.0), (52.0, 64.0)]
RIGHT_FOLD = [(106.0, 86.0), (76.0, 64.0)]


def scene(x: float, y: float) -> tuple[float, float, float, float]:
    rgba = (0.0, 0.0, 0.0, 0.0)

    bg_sdf = rounded_rect_sdf(x, y, 4.0, 4.0, 120.0, 120.0, 28.0)
    bg_alpha = smoothstep(1.0, -1.0, bg_sdf)
    if bg_alpha > 0.0:
        t = clamp((0.55 * x + 0.9 * y - 10.0) / 140.0)
        bg_mid = mix(BG_A, BG_B, clamp(t * 1.2))
        bg_rgb = mix(bg_mid, BG_C, clamp((t - 0.3) / 0.7))
        highlight = radial_alpha(x, y, 36.0, 30.0, 26.0, 0.10)
        vignette = radial_alpha(x, y, 64.0, 70.0, 96.0, 0.12)
        bg_rgb = mix(bg_rgb, WHITE, highlight)
        bg_rgb = mix(bg_rgb, SHADOW, vignette)
        rgba = over(rgba, bg_rgb, bg_alpha)

    shadow_alpha = smoothstep(8.0, -2.0, rounded_rect_sdf(x, y, 18.0, 30.0, 92.0, 72.0, 18.0)) * 0.16
    rgba = over(rgba, SHADOW, shadow_alpha)

    mail_sdf = rounded_rect_sdf(x, y, 18.0, 26.0, 92.0, 72.0, 18.0)
    mail_alpha = smoothstep(1.0, -1.0, mail_sdf)
    if mail_alpha > 0.0:
        t_mail = clamp((0.25 * x + y - 22.0) / 96.0)
        mail_rgb = mix(MAIL_A, MAIL_B, t_mail)
        rgba = over(rgba, mail_rgb, mail_alpha)

    outline = smoothstep(1.4, 0.0, abs(mail_sdf)) * 0.95
    rgba = over(rgba, MAIL_OUTLINE, outline)

    flap_alpha = polygon_alpha(x, y, FLAP_POINTS)
    if flap_alpha > 0.0:
        t_flap = clamp((x - 22.0 + (y - 38.0) * 0.6) / 90.0)
        flap_rgb = mix(FLAP_A, FLAP_B, t_flap)
        rgba = over(rgba, flap_rgb, flap_alpha)

    seam_alpha = stroke_alpha(x, y, SEAM_POINTS, 5.0)
    rgba = over(rgba, SEAM, seam_alpha)

    left_fold_alpha = stroke_alpha(x, y, LEFT_FOLD, 4.0)
    right_fold_alpha = stroke_alpha(x, y, RIGHT_FOLD, 4.0)
    rgba = over(rgba, FOLD, max(left_fold_alpha, right_fold_alpha))

    bolt_shadow_alpha = polygon_alpha(x, y, BOLT_POINTS_SHADOW) * 0.16
    rgba = over(rgba, BOLT_SHADOW, bolt_shadow_alpha)

    bolt_alpha = polygon_alpha(x, y, BOLT_POINTS)
    if bolt_alpha > 0.0:
        t_bolt = clamp(((x - 52.0) * 0.55 + (y - 68.0)) / 42.0)
        bolt_rgb = mix(BOLT_A, BOLT_B, t_bolt)
        rgba = over(rgba, bolt_rgb, bolt_alpha)

    return rgba


def render_png(path: Path, size: int) -> None:
    samples_per_axis = 8 if size <= 32 else 6 if size <= 64 else 5
    inv_samples = 1.0 / (samples_per_axis * samples_per_axis)
    rows: list[bytes] = []
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            accum = [0.0, 0.0, 0.0, 0.0]
            for sy in range(samples_per_axis):
                for sx in range(samples_per_axis):
                    fx = (px + (sx + 0.5) / samples_per_axis) / size * CANVAS
                    fy = (py + (sy + 0.5) / samples_per_axis) / size * CANVAS
                    r, g, b, a = scene(fx, fy)
                    accum[0] += r
                    accum[1] += g
                    accum[2] += b
                    accum[3] += a
            row.extend(
                int(clamp(accum[i] * inv_samples) * 255.0 + 0.5)
                for i in range(4)
            )
        rows.append(bytes(row))

    raw = b"".join(rows)
    compressed = zlib.compress(raw, level=9)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    png = bytearray(b"\x89PNG\r\n\x1a\n")
    png.extend(chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)))
    png.extend(chunk(b"IDAT", compressed))
    png.extend(chunk(b"IEND", b""))
    path.write_bytes(png)


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    for size in OUTPUT_SIZES:
        render_png(ICON_DIR / f"icon-{size}.png", size)
    print("Generated:")
    for size in OUTPUT_SIZES:
        path = ICON_DIR / f"icon-{size}.png"
        print(f"- {path} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
