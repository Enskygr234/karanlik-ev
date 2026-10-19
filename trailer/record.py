# Tanıtım videosu kare kaydedici: python3 trailer/record.py <cikti_klasoru>
import sys, os, math
from playwright.sync_api import sync_playwright

OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 30
frame_no = 0

CARD_JS = """
(() => { const d = document.createElement('div'); d.id = 'card';
d.style.cssText = 'position:fixed;inset:0;z-index:50;display:none;flex-direction:column;align-items:center;justify-content:center;background:#000;color:#ddd;font-family:Georgia,serif;text-align:center';
d.innerHTML = '<div id="cardBig" style="font-size:96px;letter-spacing:10px;color:#b01515;text-shadow:0 0 24px #700"></div><div id="cardTxt" style="font-size:42px;color:#cfc6b6"></div><div id="cardSub" style="font-size:26px;color:#888;margin-top:22px"></div>';
document.body.appendChild(d); })();
"""

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1280, "height": 720}, device_scale_factor=1)
    pg.goto("file://" + ROOT + "/www/index.html?trailer")
    pg.wait_for_timeout(500)
    pg.evaluate(CARD_JS)
    pg.evaluate("document.getElementById('menu').classList.add('hidden')")

    def snap():
        global frame_no
        pg.screenshot(path=f"{OUT}/f{frame_no:05d}.jpg", type="jpeg", quality=92)
        frame_no += 1

    def card(txt, secs, big="", sub="", flicker=False):
        pg.evaluate("""([t,b,s]) => { const c=document.getElementById('card'); c.style.display='flex';
            cardTxt.textContent=t; cardBig.textContent=b; cardSub.textContent=s; }""", [txt, big, sub])
        n = int(secs * FPS)
        for i in range(n):
            t = i / n
            a = min(1, t * 4, (1 - t) * 4)
            if flicker and (i % 17 in (3, 5)): a *= .25
            pg.evaluate(f"document.getElementById('card').firstElementChild.parentElement.style.opacity=1;"
                        f"for (const e of document.getElementById('card').children) e.style.opacity={a:.3f}")
            snap()
        pg.evaluate("document.getElementById('card').style.display='none'")

    def play(secs, setup=None, each=None):
        if setup: pg.evaluate(setup)
        for i in range(int(secs * FPS)):
            if each: pg.evaluate(each)
            pg.evaluate("GAME.update(1/30); GAME.render()")
            snap()

    def hud(show):
        pg.evaluate(f"document.getElementById('hud').classList.{'remove' if show else 'add'}('hidden')")

    # 1) açılış yazıları
    card("Gece yarısı.", 2.4)
    card("Kapı arkandan kilitlendi.", 2.6)

    # 2) keşif: ilk anahtara gidiş
    pg.evaluate("GAME.reset(); GAME.autopilot = true; const S=GAME.S; S.player.x = 3*48+24; S.player.y = 9*48+24; S.ghost.x = 26*48; S.ghost.y = 19*48; S.eventT = 99")
    hud(True)
    play(7.0)
    hud(False)

    card("Bu evde yalnız değilsin.", 2.6, flicker=True)

    # 3) yaklaşan hayalet - fener ona dönük, oyuncu donmuş
    setup = """
      GAME.reset(); const S = GAME.S; GAME.autopilot = false; S.eventT = 99;
      S.player.x = 20*48+24; S.player.y = 14*48+24; S.player.ang = 0; S.battery = 60;
      S.ghost.x = 28*48+24; S.ghost.y = 14*48+24; S.ghost.mode='chase'; S.ghost.chaseT=9; S.ghost.last={x:20,y:14};
      GAME.input.dx = 0; GAME.input.dy = 0; GAME.input.run = false;
    """
    hud(True)
    play(3.2, setup, "GAME.S.player.ang = Math.atan2(GAME.S.ghost.y-GAME.S.player.y, GAME.S.ghost.x-GAME.S.player.x); GAME.S.ghost.lit=false")

    # 4) kaçış - karanlıkta kırmızı gözler
    setup = """
      GAME.reset(); const S = GAME.S; GAME.autopilot = true; GAME.forceRun = true; S.eventT = 99;
      S.keys[0].got = true; S.keys[1].got = true; S.keysGot = 2;
      S.player.x = 4*48+24; S.player.y = 14*48+24;
      S.ghost.x = 9*48+24; S.ghost.y = 13*48+24; S.ghost.mode='chase'; S.ghost.chaseT=30;
    """
    play(4.5, setup, "GAME.S.player.stam = 100; GAME.S.ghost.chaseT = 30")
    hud(False)

    # 5) hızlı kesmeler: siyah / kırmızı flaş
    pg.evaluate("""const c=document.getElementById('card'); c.style.display='flex';
      for (const e of c.children) e.style.opacity=1; cardTxt.textContent=''; cardBig.textContent=''; cardSub.textContent='';""")
    for i in range(int(1.2 * FPS)):
        col = '#400' if i % 6 < 2 else '#000'
        pg.evaluate(f"document.getElementById('card').style.background='{col}'")
        snap()
    pg.evaluate("document.getElementById('card').style.background='#000'; document.getElementById('card').style.display='none'")

    # 6) korku anı
    pg.evaluate("const s=document.getElementById('scare'); s.classList.remove('hidden'); s.width=1280; s.height=720;")
    for i in range(int(1.3 * FPS)):
        pg.evaluate(f"GAME.drawScareFace(document.getElementById('scare').getContext('2d'),1280,720,{i/FPS})")
        snap()
    pg.evaluate("document.getElementById('scare').classList.add('hidden')")

    # 7) isim
    for i in range(int(.6 * FPS)):
        snap_black = pg.evaluate("const c=document.getElementById('card'); c.style.display='flex'; for (const e of c.children) e.style.opacity=0;")
        snap()
    card("", 4.2, big="KARANLIK EV", sub="Android · Ücretsiz · Kulaklıkla oyna", flicker=True)
    b.close()

print("frames", frame_no)
