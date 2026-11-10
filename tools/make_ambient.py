#!/usr/bin/env python3
"""
Sintetiza os ambientes por região (Parte 3.1): assets/audio/ambient/{birds,crickets,cave,volcano,casino,shop,home}.mp3.
Nada de amostras externas: tudo é gerado por síntese (ruído filtrado, chilreios, pulsos, gotas, murmúrio) e codificado com
FFmpeg no MESMO padrão de rain/wind/waves (mp3 mono, 32 kHz, 48 kb/s, ~16 s, em loop sem emenda audível).
Determinístico (semente fixa): rodar de novo gera os mesmos arquivos.  Uso: python3 tools/make_ambient.py [nome ...]
"""
import os
import subprocess
import sys
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'audio', 'ambient')
SR = 32000
LOOP = 16.0          # duração final (s)
XF = 1.0             # emenda do loop (s)


def rng(name):
    return np.random.default_rng(sum(ord(c) * (i + 7) for i, c in enumerate(name)))


def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def lp(x, fc, order=2):
    for _ in range(order):
        x = lowpass(x, fc)
    return x


def hp(x, fc):
    return x - lp(x, fc, 1)


def bandpass(x, lo, hi):
    return hp(lp(x, hi), lo)


def brown(r, n):
    w = r.standard_normal(n)
    b = np.cumsum(w)
    b -= np.linspace(b[0], b[-1], n)  # sem deriva
    return b / (np.max(np.abs(b)) + 1e-9)


def add(buf, start, sig, gain=1.0):
    i = int(start * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def chirp(f0, f1, dur, vib=0.0, vibhz=30.0):
    t = t_axis(dur)
    f = np.linspace(f0, f1, len(t)) * (1 + vib * np.sin(2 * np.pi * vibhz * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.sin(np.pi * np.minimum(1, t / dur)) ** 2
    return np.sin(ph) * env


def make_birds(r, n):
    y = np.zeros(n)
    t = t_axis(n / SR)
    y += 0.03 * lp(r.standard_normal(n), 900)              # brisa muito leve
    t0 = 0.3
    while t0 < n / SR - 0.5:
        # um "canto": 2 a 5 sílabas de um pássaro (tom base próprio)
        base = r.uniform(2400, 5200)
        syl = int(r.integers(2, 6))
        tt = t0
        for k in range(syl):
            dur = r.uniform(0.05, 0.16)
            up = r.choice([-1, 1])
            add(y, tt, chirp(base * r.uniform(0.9, 1.1), base * (1 + 0.35 * up * r.uniform(0.4, 1)), dur, vib=r.uniform(0, 0.03)), r.uniform(0.25, 0.5))
            tt += dur + r.uniform(0.03, 0.12)
        t0 = tt + r.uniform(0.6, 2.4)
    return y


def make_crickets(r, n):
    y = np.zeros(n)
    t = t_axis(n / SR)
    for c in range(7):                                       # 7 grilos, cada um com tom e ritmo próprios
        fc = r.uniform(3900, 5300)
        rate = r.uniform(1.6, 2.6)                            # grupos de pulsos por segundo
        pulses = int(r.integers(3, 5))
        gap = r.uniform(0.028, 0.04)
        ph = r.uniform(0, 1)
        carrier = np.sin(2 * np.pi * fc * t + r.uniform(0, 6))
        env = np.zeros(n)
        for g in range(int((n / SR) * rate)):
            s = (g + ph) / rate
            for p in range(pulses):
                a = int((s + p * gap) * SR)
                L = int(0.018 * SR)
                if a + L < n:
                    env[a:a + L] += np.sin(np.pi * np.arange(L) / L) ** 2
        y += carrier * env * r.uniform(0.07, 0.14)
    y += 0.015 * lp(r.standard_normal(n), 700)
    return y


def drip(r):
    dur = r.uniform(0.07, 0.16)
    t = t_axis(dur)
    f = r.uniform(900, 1900) * (1 - 0.18 * (t / dur))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (dur / 3.2))
    return s


def make_cave(r, n):
    y = np.zeros(n)
    y += 0.05 * lp(brown(r, n), 260)                         # ar parado/rumor distante
    y += 0.012 * bandpass(r.standard_normal(n), 300, 1200)
    t0 = 0.4
    while t0 < n / SR - 0.5:
        d = drip(r)
        g = r.uniform(0.25, 0.55)
        for delay, dec in ((0, 1.0), (0.13, 0.5), (0.27, 0.32), (0.45, 0.18), (0.7, 0.09)):
            add(y, t0 + delay, d, g * dec)
        t0 += r.uniform(0.7, 2.6)
    return y


def make_volcano(r, n):
    t = t_axis(n / SR)
    y = 0.55 * lp(brown(r, n), 120)
    slow = 0.6 + 0.4 * np.sin(2 * np.pi * (1 / 7.0) * t + 1.3) * np.sin(2 * np.pi * (1 / 5.3) * t)
    y *= slow
    y += 0.1 * lp(brown(r, n), 60) * (0.5 + 0.5 * np.sin(2 * np.pi * (1 / 16.0) * t))
    t0 = 1.0
    while t0 < n / SR - 1.0:                                   # estalos de lava e pedras
        burst = hp(r.standard_normal(int(r.uniform(0.01, 0.05) * SR)), 1800)
        burst *= np.exp(-np.arange(len(burst)) / (0.012 * SR))
        add(y, t0, burst, r.uniform(0.04, 0.12))
        t0 += r.uniform(0.15, 1.1)
    for k in range(3):                                         # rumores: ondas graves mais fortes
        c = r.uniform(2.0, n / SR - 3.0)
        w = np.exp(-((t - c) ** 2) / (2 * 0.8 ** 2))
        y += 0.5 * lp(brown(r, n), 90) * w
    return y


def murmur(r, n, lo, hi, depth=0.7):
    t = t_axis(n / SR)
    base = bandpass(r.standard_normal(n), lo, hi)
    mod = np.zeros(n)
    for k in range(5):
        mod += np.sin(2 * np.pi * r.uniform(2.5, 6.5) * t + r.uniform(0, 6)) * r.uniform(0.5, 1)
    mod = 0.5 + 0.5 * mod / 5
    return base * (1 - depth + depth * mod)


def ting(r, f=None):
    f = f or r.uniform(2200, 3200)
    t = t_axis(0.8)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t / 0.16)


def make_casino(r, n):
    y = 0.9 * murmur(r, n, 250, 2200, 0.8)
    t0 = 0.5
    while t0 < n / SR - 1.0:                                   # jingles de caça-níquel (arpejos curtos)
        notes = int(r.integers(4, 9))
        base = r.choice([660, 784, 880, 988])
        for k in range(notes):
            f = base * (1.0 + 0.25 * (k % 4))
            d = 0.05
            tt = t_axis(d)
            tone = np.sign(np.sin(2 * np.pi * f * tt)) * 0.5 + np.sin(2 * np.pi * f * tt) * 0.5
            tone *= np.minimum(1, np.minimum(tt / 0.004, (d - tt) / 0.01))
            add(y, t0 + k * 0.065, tone, 0.06)
        t0 += r.uniform(1.4, 3.6)
    t0 = 0.8
    while t0 < n / SR - 1.0:                                   # moedas caindo
        for k in range(int(r.integers(2, 6))):
            add(y, t0 + k * r.uniform(0.03, 0.08), ting(r, r.uniform(3200, 4800))[: int(0.25 * SR)], 0.05)
        t0 += r.uniform(2.0, 5.0)
    return y


def make_shop(r, n):
    y = 0.45 * murmur(r, n, 200, 1400, 0.85)
    y += 0.01 * lp(r.standard_normal(n), 500)
    for c in (3.2, 9.7):                                      # campainha da porta / caixa
        add(y, c, ting(r), 0.13)
    t0 = 1.3
    while t0 < n / SR - 1.0:
        add(y, t0, ting(r, r.uniform(1800, 2600))[: int(0.35 * SR)], 0.035)
        t0 += r.uniform(2.5, 5.5)
    return y


def make_home(r, n):
    y = 0.06 * lp(brown(r, n), 220)
    y += 0.006 * lp(r.standard_normal(n), 900)
    for k in range(int(n / SR)):                               # relógio: tique-taque a cada 1 s (exato: o loop não desliza)
        f = 1700 if k % 2 == 0 else 1350
        tt = t_axis(0.03)
        click = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.006)
        add(y, k + 0.2, click, 0.16)
    return y


MAKERS = {
    'birds': make_birds, 'crickets': make_crickets, 'cave': make_cave, 'volcano': make_volcano,
    'casino': make_casino, 'shop': make_shop, 'home': make_home,
}
EXACT_LOOP = {'home'}  # ticks de 1 s: gera exatamente LOOP s (a camada contínua é emendada só no ruído)


def loop_it(y, name):
    n = int(LOOP * SR)
    if name in EXACT_LOOP:
        return y[:n]
    xf = int(XF * SR)
    body = y[: n + xf]
    head, tail = body[:xf], body[n:n + xf]
    fade = np.linspace(0, 1, xf)
    mix = tail * np.cos(fade * np.pi / 2) + head * np.sin(fade * np.pi / 2)
    out = body[:n].copy()
    out[:xf] = mix
    return out


def encode(y, name):
    y = y - np.mean(y)
    peak = np.max(np.abs(y)) + 1e-9
    y = y / peak * 0.8
    wav = os.path.join(OUT, name + '.tmp.wav')
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(y, -1, 1) * 32767).astype('<i2').tobytes())
    dst = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', str(SR), '-b:a', '48k', dst], check=True)
    os.remove(wav)
    return dst


def main(names):
    os.makedirs(OUT, exist_ok=True)
    for name in names or MAKERS:
        r = rng(name)
        n = int((LOOP + XF) * SR) if name not in EXACT_LOOP else int(LOOP * SR)
        y = MAKERS[name](r, n)
        dst = encode(loop_it(y, name), name)
        print('ok', os.path.relpath(dst, ROOT), os.path.getsize(dst), 'bytes')


if __name__ == '__main__':
    main(sys.argv[1:])
