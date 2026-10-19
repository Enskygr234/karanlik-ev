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
    b = p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1280, "height": 720}, device_scale_factor=1)
    pg.goto("http://localhost:8765/index.html?trailer")
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

    pg.evaluate("document.getElementById('grain').style.opacity='.05'")
    # 2) keşif: ilk anahtara gidiş
    pg.evaluate("GAME.reset(); GAME.autopilot = true; const S=GAME.S; S.player.x = 3*2+1; S.player.z = 9*2+1; S.ghost.x = 52; S.ghost.z = 38; S.eventT = 99; S.appT = 99")
    hud(True)
    play(7.0)
    hud(False)

    card("Bu evde yalnız değilsin.", 2.6, flicker=True)

    # 3) koridorun sonundan yaklaşan hayalet
    setup = """
      GAME.reset(); const S = GAME.S; GAME.autopilot = true; GAME.stand = true; GAME.lockLook = true; GAME.noSlow = true;
      S.eventT = 99; S.appT = 99;
      S.player.x = 20*2+1; S.player.z = 14*2+1; S.player.yaw = -Math.PI/2; S.player.pitch = 0.02; S.battery = 70;
      S.ghost.x = 26*2+1; S.ghost.z = 14*2+1; S.ghost.mode='chase'; S.ghost.chaseT=30; S.ghost.last={x:20,y:14};
    """
    hud(True)
    play(3.4, setup, "GAME.S.ghost.chaseT = 30")

    # 4) kaçış ve arkaya bakış
    setup = """
      GAME.reset(); const S = GAME.S; GAME.stand = false; GAME.lockLook = false; GAME.noSlow = false; GAME.forceRun = true;
      S.eventT = 99; S.appT = 99;
      S.player.x = 5*2+1; S.player.z = 14*2+1; S.player.yaw = Math.PI/2;
      S.ghost.x = 11*2+1; S.ghost.z = 14*2+1; S.ghost.mode='chase'; S.ghost.chaseT=30;
      GAME.target = {x: 1*2+1, z: 14*2+1};
    """
    play(2.0, setup, "GAME.S.player.stam = 100; GAME.S.ghost.chaseT = 30")
    pg.evaluate("GAME.lockLook = true; GAME.forceRun = false")
    play(2.3, None, "const S=GAME.S; const want=Math.atan2(-(S.ghost.x-S.player.x), -(S.ghost.z-S.player.z)); let d=want-S.player.yaw; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI; S.player.yaw += d*0.12; S.ghost.chaseT=30; GAME.stand=true")
    hud(False)
    pg.evaluate("GAME.target=null; GAME.stand=false; GAME.lockLook=false")

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
