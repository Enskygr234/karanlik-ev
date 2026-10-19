# Tanıtım videosu müziği: python3 trailer/sound.py cikti.wav
import sys, wave
import numpy as np

SR = 44100
DUR = 29.6
N = int(SR * DUR)
t = np.arange(N) / SR
out = np.zeros(N)
rng = np.random.default_rng(3)

def place(sig, at, gain=1.0):
    i = int(at * SR); j = min(N, i + len(sig))
    if i < N: out[i:j] += sig[:j - i] * gain

def envexp(n, dec):
    return np.exp(-np.arange(n) / SR / dec)

def lowpass(x, a):
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y

def thump(freq=55, dec=.15):
    n = int(SR * .5); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * tt * (1 - tt * .6)) * envexp(n, dec)

def heart(at, g):
    place(thump(58), at, g); place(thump(50), at + .2, g * .8)

def noise_burst(dur, dec, a=.3):
    n = int(SR * dur); return lowpass(rng.standard_normal(n), a) * envexp(n, dec)

# uğultu: kayan alçak frekanslar
drone = (np.sin(2*np.pi*55*t) + .7*np.sin(2*np.pi*55.6*t) + .5*np.sin(2*np.pi*82.4*t + np.sin(t*.7)*2)
         + .3*np.sin(2*np.pi*110.3*t)) * .09
swell = np.clip(t / 4, 0, 1)
swell *= np.where(t < 23.5, 1, 0) + np.where((t > 25.4), np.clip(1 - (t - 25.4) / 4, 0, 1), 0)
swell[(t > 12) & (t < 14.6)] *= 1.8
out += drone * swell

# açılış: uzak kapı vuruşları
for k in range(3): place(noise_burst(.25, .07, .05), 2.7 + k * .3, .9)

# keşif: adımlar ve yavaş kalp
for s in np.arange(5.1, 12, .45): place(noise_burst(.12, .03, .15), s, .25)
for s in np.arange(5.5, 12, 1.0): heart(s, .35)

# fısıltı
w = rng.standard_normal(int(SR * 2.2)); w = w - lowpass(w, .2)
w *= np.sin(np.linspace(0, np.pi, len(w))) * (.6 + .4 * np.sin(np.linspace(0, 40, len(w))))
place(w, 12.2, .12)

# yaklaşma: hızlanan kalp + yükselen ton
s = 14.6; iv = .8
while s < 17.8: heart(s, .6); s += iv; iv = max(.38, iv * .85)
seg = (t >= 14.6) & (t < 17.8); tt = t[seg] - 14.6
out[seg] += np.sin(2 * np.pi * (300 + tt * 120) * tt) * .03 * (tt / 3.2)

# kaçış: koşu adımları + hızlı kalp
for s in np.arange(17.8, 22.3, .28): place(noise_burst(.1, .025, .25), s, .35)
for s in np.arange(17.8, 22.3, .36): heart(s, .75)

# flaşlar: kesik gürültü
for k in range(6): place(noise_burst(.08, .04, .7), 22.3 + k * .2, .5)

# çığlık
n = int(SR * 1.4); tt = np.arange(n) / SR
scream = (rng.standard_normal(n) * .6 + np.sign(np.sin(2*np.pi*(900 - 500*tt)*tt)) * .4
          + np.sin(2*np.pi*(1300 - 700*tt)*tt) * .4) * np.exp(-tt / .9)
place(scream, 23.5, .7)

# başlık: derin vuruş
n = int(SR * 3); tt = np.arange(n) / SR
boom = np.sin(2 * np.pi * 42 * tt * (1 - tt * .15)) * np.exp(-tt / 1.2) + noise_burst(3, .2, .03) * .5
place(boom, 25.4, 1.0)

out = np.tanh(out * 1.2) * .9
pcm = (out * 32767).astype(np.int16)
stereo = np.repeat(pcm[:, None], 2, axis=1)
with wave.open(sys.argv[1], 'wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes(stereo.tobytes())
print("ok", DUR)
